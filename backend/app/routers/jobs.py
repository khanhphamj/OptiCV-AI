from __future__ import annotations

import asyncio
import json
import re
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.services.openai_client import OpenAIClient, OpenAIError
from app.services.tavily_client import TavilyClient, TavilyError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

Location = Literal["ho_chi_minh", "ha_noi"]

JOB_DOMAINS: List[str] = [
    "topcv.vn",
    "vietnamworks.com",
    "careerviet.vn",
    "glints.com",
]

LOCATION_LABEL: Dict[Location, str] = {
    "ho_chi_minh": "Hồ Chí Minh",
    "ha_noi": "Hà Nội",
}

# Aliases used to verify that a JD's declared location matches the user's pick.
# Kept specific to avoid false positives (e.g. bare "hcm" could collide).
_LOCATION_ALIASES: Dict[Location, List[str]] = {
    "ho_chi_minh": [
        "hồ chí minh", "ho chi minh", "tp.hcm", "tp. hcm", "tp hcm",
        "sài gòn", "sai gon", "saigon",
        "thành phố hồ chí minh",
    ],
    "ha_noi": [
        "hà nội", "ha noi", "hanoi", "tp.hn", "tp. hn",
        "thành phố hà nội",
    ],
}


def _location_ok(jd_location: Optional[str], requested: Location) -> bool:
    """True if the JD's declared city matches the requested one.
    Unknown/empty location is treated as acceptable — don't drop legit jobs
    just because the LLM failed to extract a city."""
    if not jd_location:
        return True
    haystack = jd_location.lower()
    aliases = _LOCATION_ALIASES.get(requested, [])
    return any(alias in haystack for alias in aliases)

# URL patterns that identify an individual job posting (detail page).
# Each pattern must uniquely identify a single-JD page on that domain.
_DETAIL_URL_PATTERNS: List[re.Pattern[str]] = [
    # TopCV: /viec-lam/<slug>/<numeric-id>.html
    re.compile(r"topcv\.vn/viec-lam/[^/]+/\d+\.html"),
    # CareerViet: /(vi|en)/tim-viec-lam/<slug>.<hex-id>.html
    re.compile(r"careerviet\.vn/(?:vi|en)/tim-viec-lam/[^/]+\.[A-Z0-9]+\.html"),
    # VietnamWorks: /<slug>-<numeric-id>-jv(?:/|$)
    re.compile(r"vietnamworks\.com/[a-z0-9-]+-\d+-jv(?:$|[/?])"),
    # Glints: /<lang>/opportunities/jobs/<slug>/<uuid>
    re.compile(r"glints\.com/(?:vn|en)/opportunities/jobs/[^/]+/[0-9a-f-]{12,}"),
]

# Listing-page title signatures (e.g. "Tuyển dụng 120 việc làm...").
_LISTING_TITLE_RE = re.compile(
    r"(^\s*Tuyển dụng\s+\d+|\b\d+\+?\s*việc làm\b|\bTop\s+\d+\s+công ty\b|\bDanh sách\b|là gì\?)",
    re.IGNORECASE,
)


def _looks_like_detail(url: str) -> bool:
    return any(p.search(url) for p in _DETAIL_URL_PATTERNS)


def _looks_like_listing_title(title: str) -> bool:
    return bool(title and _LISTING_TITLE_RE.search(title))


# Definitive markers that the posting is no longer accepting applications.
# Must NOT match generic deadline labels with a date like "Hết hạn nộp hồ sơ: 31/12/2026"
# which appear on active pages.
_EXPIRED_RE = re.compile(
    # TopCV: "Ứng tuyển lại" button only renders on expired postings (active = "Ứng tuyển")
    r"(Ứng tuyển lại"
    r"|tin (?:tuyển dụng )?(?:này )?đã hết hạn"
    r"|tin này đã (?:kết thúc|đóng|bị xoá)"
    r"|bài (?:đăng )?tuyển dụng (?:này )?đã (?:kết thúc|hết hạn|đóng)"
    r"|thông báo tuyển dụng (?:này )?đã hết hạn"
    r"|công việc (?:này )?đã (?:đóng|hết hạn tuyển dụng)"
    r"|vị trí (?:này )?đã (?:đóng|tuyển đủ|được tuyển)"
    r"|nhà tuyển dụng đã ngừng nhận hồ sơ"
    r"|tin không còn tồn tại"
    # CareerViet: "Hết hạn nộp" without a following date OR with date in the past.
    # We accept the simple "đã quá hạn" / "Tin đã quá hạn" forms.
    r"|đã quá hạn"
    r"|job (?:has |is )?expired"
    r"|position (?:has been |is )?closed"
    r"|this (?:position|job) is (?:closed|no longer available|no longer accepting)"
    r"|no longer accepting applications"
    r"|we are no longer hiring)",
    re.IGNORECASE,
)


# Detect deadline date and treat past dates as expired.
# Patterns like: "Hạn nộp hồ sơ: 31/12/2025", "Hạn nộp: 30-04-2026"
_DEADLINE_RE = re.compile(
    r"(?:hạn (?:nộp(?:\s+(?:hồ sơ|đơn))?|ứng tuyển|nhận hồ sơ)|deadline)\s*:?\s*"
    r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})",
    re.IGNORECASE,
)


def _deadline_passed(content: str) -> bool:
    from datetime import date
    today = date.today()
    for m in _DEADLINE_RE.finditer(content):
        try:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if date(year, month, day) < today:
                return True
        except ValueError:
            continue
    return False


def _is_expired(content: str) -> bool:
    if not content:
        return False
    if _EXPIRED_RE.search(content):
        return True
    if _deadline_passed(content):
        return True
    return False


# Markdown noise to strip (nav images, asset URLs, repeated blank lines).
_IMG_MD_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_BARE_IMG_URL_RE = re.compile(r"https?://\S+\.(?:png|jpg|jpeg|gif|svg|webp)(?:\?\S*)?", re.IGNORECASE)
_MULTI_BLANK_RE = re.compile(r"\n{3,}")


def _clean_jd_content(content: str) -> str:
    if not content:
        return ""
    cleaned = _IMG_MD_RE.sub("", content)
    cleaned = _BARE_IMG_URL_RE.sub("", cleaned)
    # Drop duplicate consecutive lines (nav echoes) and collapse whitespace.
    seen_last = ""
    out_lines: List[str] = []
    for line in cleaned.splitlines():
        stripped = line.strip()
        if stripped and stripped == seen_last:
            continue
        seen_last = stripped
        out_lines.append(line.rstrip())
    cleaned = "\n".join(out_lines)
    cleaned = _MULTI_BLANK_RE.sub("\n\n", cleaned).strip()
    return cleaned


class JobSearchRequest(BaseModel):
    title: Optional[str] = None
    role: Optional[str] = None
    level: Optional[str] = None
    location: Location = "ho_chi_minh"
    keywords: Optional[List[str]] = None
    max_results: int = Field(default=10, ge=1, le=20)


class JobListing(BaseModel):
    url: str
    title: str
    snippet: str
    source: str
    tavily_score: Optional[float] = None


class JobSearchResponse(BaseModel):
    query: str
    location_label: str
    results: List[JobListing]


class JobListingIn(BaseModel):
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None


class JobMatchRequest(BaseModel):
    cv_text: str = Field(..., min_length=20)
    listings: List[JobListingIn] = Field(..., min_length=1, max_length=20)
    location: Optional[Location] = None


class JobMatchItem(BaseModel):
    url: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    source: str
    match_score: int
    match_reasons: List[str]
    skill_gaps: List[str]
    jd_excerpt: str


class JobMatchResponse(BaseModel):
    matches: List[JobMatchItem]


class FetchJdRequest(BaseModel):
    url: str
    fallback_snippet: Optional[str] = None
    fallback_title: Optional[str] = None


class FetchJdResponse(BaseModel):
    url: str
    content: str
    extracted: bool
    is_expired: bool = False
    depth: Optional[str] = None


class ImportJdRequest(BaseModel):
    url: str = Field(..., min_length=8)


class ImportJdResponse(BaseModel):
    url: str
    content: str
    raw_length: int
    cleaned_length: int
    is_expired: bool
    """Where the final content came from:
       - "llm-cleaned": Tavily extract → LLM rewrote into a clean JD (preferred)
       - "tavily-raw":  Tavily extract returned content but LLM cleaning failed
       - "snippet":     Tavily extract failed; nothing useful to return
    """
    source: str


def _get_tavily(settings: Settings = Depends(get_settings)) -> TavilyClient:
    try:
        return TavilyClient(settings)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _get_openai(settings: Settings = Depends(get_settings)) -> OpenAIClient:
    return OpenAIClient(settings)


def _source_from_url(url: str) -> str:
    for domain in JOB_DOMAINS:
        if domain in url:
            return domain
    return "unknown"


def _build_query(req: JobSearchRequest, variant: str = "primary") -> str:
    parts: List[str] = []
    if req.title:
        parts.append(f'"{req.title}"')
    if req.role and (not req.title or req.role.lower() not in req.title.lower()):
        parts.append(req.role)
    if req.level:
        parts.append(req.level)
    parts.append(f'"{LOCATION_LABEL[req.location]}"')

    if variant == "primary":
        parts.append("tuyển dụng")
    elif variant == "jd":
        # Target individual JD pages: phrases that appear inside a posting body.
        parts.extend(["mô tả công việc", "ứng tuyển"])
    elif variant == "skill":
        # Add the most prominent skill keyword to reduce aggregator noise.
        if req.keywords:
            parts.append(req.keywords[0])
        parts.append("kinh nghiệm")

    if req.keywords and variant != "skill":
        parts.extend(req.keywords[:2])
    return " ".join(p for p in parts if p)


def _collect_results(
    raw: Dict[str, Any],
    seen_urls: set[str],
) -> list[JobListing]:
    """Return ONLY individual job-detail URLs; drop aggregators, blogs, and categories."""
    details: list[JobListing] = []
    for item in raw.get("results", []):
        url = item.get("url") or ""
        title = item.get("title") or ""
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        if not _looks_like_detail(url):
            continue
        if _looks_like_listing_title(title):
            continue
        details.append(
            JobListing(
                url=url,
                title=title,
                snippet=(item.get("content") or "")[:500],
                source=_source_from_url(url),
                tavily_score=item.get("score"),
            )
        )
    return details


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(
    req: JobSearchRequest,
    tavily: TavilyClient = Depends(_get_tavily),
) -> JobSearchResponse:
    primary_query = _build_query(req, "primary")
    seen_urls: set[str] = set()
    all_details: list[JobListing] = []

    # Ask for a larger pool so the post-filter still has enough detail pages.
    pool_size = max(req.max_results * 3, 20)

    attempts: list[tuple[str, str, str]] = [
        ("primary", primary_query, "basic"),
        ("jd", _build_query(req, "jd"), "advanced"),
        ("skill", _build_query(req, "skill"), "advanced"),
    ]

    last_error: Optional[TavilyError] = None
    for _variant, query, depth in attempts:
        try:
            raw = await tavily.search(
                query=query,
                include_domains=JOB_DOMAINS,
                max_results=pool_size,
                search_depth=depth,
            )
        except TavilyError as exc:
            last_error = exc
            continue

        all_details.extend(_collect_results(raw, seen_urls))

        if len(all_details) >= req.max_results:
            break

    if not all_details and last_error is not None:
        raise HTTPException(status_code=last_error.status_code, detail=last_error.detail)

    return JobSearchResponse(
        query=primary_query,
        location_label=LOCATION_LABEL[req.location],
        results=all_details[: req.max_results],
    )


_SINGLE_MATCH_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "company": {"type": "string"},
        "location": {"type": "string"},
        "match_score": {
            "type": "integer",
            "description": "0-100 match percentage between CV and JD",
        },
        "match_reasons": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 concise bullets why this role fits the CV",
        },
        "skill_gaps": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Up to 4 missing/weak skills the CV lacks for this JD",
        },
    },
    "required": [
        "title",
        "company",
        "location",
        "match_score",
        "match_reasons",
        "skill_gaps",
    ],
    "additionalProperties": False,
}


async def _score_single_jd(
    openai: OpenAIClient,
    cv_text: str,
    url: str,
    jd_content: str,
) -> Optional[Dict[str, Any]]:
    system_prompt = (
        "You are an expert CV-to-JD matcher. Score how well the CV fits the single JD "
        "from 0 to 100. Be realistic: 0-40 weak, 40-70 partial, 70-90 strong, 90+ near-perfect. "
        "Extract the job title, company and location from the JD if possible. "
        "Give 2-4 concise match_reasons and up to 4 skill_gaps. "
        "Respond ONLY with JSON matching the schema."
    )
    user_prompt = (
        f"**CANDIDATE CV:**\n---\n{cv_text[:8000]}\n---\n\n"
        f"**JOB DESCRIPTION (url={url}):**\n---\n{jd_content[:6000]}\n---"
    )
    payload: Dict[str, Any] = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "single_match",
                "schema": _SINGLE_MATCH_SCHEMA,
                "strict": True,
            },
        },
    }
    try:
        completion = await openai.chat_completion(payload)
        content = completion["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        parsed["url"] = url
        return parsed
    except (OpenAIError, KeyError, IndexError, ValueError, TypeError):
        return None


@router.post("/extract-and-match", response_model=JobMatchResponse)
async def extract_and_match(
    req: JobMatchRequest,
    tavily: TavilyClient = Depends(_get_tavily),
    openai: OpenAIClient = Depends(_get_openai),
) -> JobMatchResponse:
    urls = [l.url for l in req.listings]
    snippet_by_url = {l.url: (l.snippet or "").strip() for l in req.listings}
    title_by_url = {l.url: (l.title or "").strip() for l in req.listings}

    # Batched Tavily extract (single call) + advanced depth for anti-bot pages.
    # Batched is materially faster than N parallel single-URL extracts.
    extracted_content: Dict[str, str] = {}
    try:
        extracted = await tavily.extract(urls, extract_depth="advanced")
        for item in extracted.get("results", []):
            url = item.get("url") or ""
            content = (item.get("raw_content") or "").strip()
            if url and content:
                extracted_content[url] = _clean_jd_content(content)
    except TavilyError:
        pass

    jd_blocks: List[Dict[str, str]] = []
    for listing in req.listings:
        url = listing.url
        content = extracted_content.get(url) or snippet_by_url.get(url, "")
        if not content:
            continue
        if _is_expired(content):
            continue
        title = title_by_url.get(url, "")
        header = f"Title: {title}\n" if title else ""
        jd_blocks.append({"url": url, "content": (header + content)})

    if not jd_blocks:
        return JobMatchResponse(matches=[])

    # Score every JD in parallel — one OpenAI call per JD via asyncio.gather.
    # Dramatically faster than one big batched prompt (per-call time ~2-3s vs ~15-20s batched).
    score_tasks = [
        _score_single_jd(openai, req.cv_text, b["url"], b["content"])
        for b in jd_blocks
    ]
    results = await asyncio.gather(*score_tasks, return_exceptions=False)

    excerpt_by_url = {b["url"]: b["content"][:600] for b in jd_blocks}
    matches: List[JobMatchItem] = []
    for m in results:
        if not m:
            continue
        url = m.get("url", "")
        jd_location = m.get("location") or None
        # If the user asked for a specific city, drop JDs that declare a
        # different city. Jobs without an extracted location pass through.
        if req.location and not _location_ok(jd_location, req.location):
            continue
        matches.append(
            JobMatchItem(
                url=url,
                title=m.get("title") or title_by_url.get(url, ""),
                company=m.get("company") or None,
                location=jd_location,
                source=_source_from_url(url),
                match_score=int(m.get("match_score", 0)),
                match_reasons=m.get("match_reasons", []) or [],
                skill_gaps=m.get("skill_gaps", []) or [],
                jd_excerpt=excerpt_by_url.get(url, ""),
            )
        )

    matches.sort(key=lambda x: x.match_score, reverse=True)
    return JobMatchResponse(matches=matches)


_JD_CLEAN_SYSTEM_PROMPT = (
    "You are a job-description extractor. The user provides raw text scraped from a "
    "career/job-posting web page. The raw text contains the actual JD mixed with site "
    "navigation, headers, footers, related job listings, share-this-job widgets, ads, "
    "and other boilerplate. Extract ONLY the job description content and return clean "
    "plain text with these sections, in this order, omitting any section that's missing "
    "from the source:\n"
    "\n"
    "# {Job Title}\n"
    "Company: {Company}\n"
    "Location: {Location}\n"
    "Employment type: {Full-time / Part-time / Contract / Internship — if stated}\n"
    "\n"
    "## About the role\n"
    "{Short overview paragraph}\n"
    "\n"
    "## Responsibilities\n"
    "- bullet\n"
    "- bullet\n"
    "\n"
    "## Requirements\n"
    "- bullet\n"
    "\n"
    "## Nice to have\n"
    "- bullet\n"
    "\n"
    "## Benefits\n"
    "- bullet\n"
    "\n"
    "## How to apply\n"
    "{If the source mentions a deadline, contact, or application link, include it.}\n"
    "\n"
    "Rules:\n"
    "- Do NOT invent any content. Only include information explicitly present in the source.\n"
    "- Strip ALL navigation, footer, related-job links, ads, social-share widgets, cookie notices.\n"
    "- Preserve technical terms, tools, and metrics verbatim.\n"
    "- Match the source language (Vietnamese stays Vietnamese, English stays English).\n"
    "- Output 200–2000 words depending on what the source actually contains.\n"
    "- If the source has almost no JD content (e.g. you only see navigation), output the literal string: NO_JD_CONTENT"
)


async def _clean_jd_with_llm(
    openai: OpenAIClient,
    url: str,
    raw_text: str,
) -> Optional[str]:
    """Pass Tavily-extracted raw text through GPT to isolate the JD.

    Returns the cleaned JD on success, or None if the model couldn't find a JD
    in the page (so the caller can fall back to the raw text).
    """
    if not raw_text or len(raw_text) < 200:
        return None

    user_prompt = (
        f"Source URL: {url}\n\n"
        f"Raw extracted page text:\n---\n{raw_text[:20000]}\n---"
    )
    payload: Dict[str, Any] = {
        "messages": [
            {"role": "system", "content": _JD_CLEAN_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
    }
    try:
        completion = await openai.chat_completion(payload)
        content = (completion["choices"][0]["message"]["content"] or "").strip()
    except (OpenAIError, KeyError, IndexError, ValueError, TypeError):
        return None

    if not content or content.upper().startswith("NO_JD_CONTENT"):
        return None
    return content


@router.post("/import-jd", response_model=ImportJdResponse)
async def import_jd(
    req: ImportJdRequest,
    tavily: TavilyClient = Depends(_get_tavily),
    openai: OpenAIClient = Depends(_get_openai),
) -> ImportJdResponse:
    """Import a JD from any public URL.

    Pipeline:
      1. Tavily extract (advanced → basic fallback)
      2. Clean obvious noise (images, dedup lines)
      3. LLM cleaning pass to isolate the JD from boilerplate
      4. Return whichever produced the best content

    Designed for noisy career pages (e.g. company sites with heavy templates)
    where Tavily's raw output mixes navigation/footer with the real JD.
    """
    raw_text = ""
    for depth in ("advanced", "basic"):
        try:
            raw = await tavily.extract([req.url], extract_depth=depth)
        except TavilyError as exc:
            if depth == "basic":
                raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
            continue
        for item in raw.get("results", []):
            text = (item.get("raw_content") or "").strip()
            if text and len(text) >= 200:
                raw_text = text
                break
        if raw_text:
            break

    if not raw_text:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any content from this URL. The page may be private, JS-rendered, or blocked by anti-bot protection.",
        )

    cleaned_noise = _clean_jd_content(raw_text)
    raw_length = len(cleaned_noise)
    is_expired = _is_expired(cleaned_noise)

    llm_cleaned = await _clean_jd_with_llm(openai, req.url, cleaned_noise)

    if llm_cleaned and len(llm_cleaned) >= 150:
        return ImportJdResponse(
            url=req.url,
            content=llm_cleaned[:30000],
            raw_length=raw_length,
            cleaned_length=len(llm_cleaned),
            is_expired=is_expired,
            source="llm-cleaned",
        )

    # LLM cleaning failed — return the raw cleaned text. Better than nothing,
    # and the analysis pipeline can still work on it.
    return ImportJdResponse(
        url=req.url,
        content=cleaned_noise[:30000],
        raw_length=raw_length,
        cleaned_length=raw_length,
        is_expired=is_expired,
        source="tavily-raw",
    )


@router.post("/fetch-jd", response_model=FetchJdResponse)
async def fetch_jd(
    req: FetchJdRequest,
    tavily: TavilyClient = Depends(_get_tavily),
) -> FetchJdResponse:
    """Fetch the full cleaned JD for a picked job. Tries advanced extract first,
    falls back to basic, then to the caller-supplied snippet. Flags expired postings."""
    header = f"{req.fallback_title}\n\n" if req.fallback_title else ""

    for depth in ("advanced", "basic"):
        try:
            raw = await tavily.extract([req.url], extract_depth=depth)
        except TavilyError:
            continue
        for item in raw.get("results", []):
            raw_content = (item.get("raw_content") or "").strip()
            if not raw_content or len(raw_content) < 200:
                continue
            cleaned = _clean_jd_content(raw_content)
            expired = _is_expired(cleaned)
            # 30K char ceiling is a safety net for huge pages; typical JDs are 3-8K.
            return FetchJdResponse(
                url=req.url,
                content=(header + cleaned)[:30000],
                extracted=True,
                is_expired=expired,
                depth=depth,
            )

    # Both depths failed — use the snippet we had.
    snippet = (req.fallback_snippet or "").strip()
    return FetchJdResponse(
        url=req.url,
        content=header + snippet,
        extracted=False,
        is_expired=False,
        depth=None,
    )
