from __future__ import annotations

import json
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


def _build_query(req: JobSearchRequest) -> str:
    parts: List[str] = []
    if req.title:
        parts.append(f'"{req.title}"')
    if req.role and (not req.title or req.role.lower() not in req.title.lower()):
        parts.append(req.role)
    if req.level:
        parts.append(req.level)
    parts.append(f'"{LOCATION_LABEL[req.location]}"')
    parts.append("tuyển dụng")
    if req.keywords:
        parts.extend(req.keywords[:3])
    return " ".join(p for p in parts if p)


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(
    req: JobSearchRequest,
    tavily: TavilyClient = Depends(_get_tavily),
) -> JobSearchResponse:
    query = _build_query(req)
    try:
        raw = await tavily.search(
            query=query,
            include_domains=JOB_DOMAINS,
            max_results=req.max_results,
            search_depth="basic",
        )
    except TavilyError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    results: List[JobListing] = []
    seen_urls: set[str] = set()
    for item in raw.get("results", []):
        url = item.get("url")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        results.append(
            JobListing(
                url=url,
                title=item.get("title") or "",
                snippet=(item.get("content") or "")[:500],
                source=_source_from_url(url),
                tavily_score=item.get("score"),
            )
        )

    return JobSearchResponse(
        query=query,
        location_label=LOCATION_LABEL[req.location],
        results=results,
    )


_MATCH_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "matches": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
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
                    "url",
                    "title",
                    "company",
                    "location",
                    "match_score",
                    "match_reasons",
                    "skill_gaps",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["matches"],
    "additionalProperties": False,
}


@router.post("/extract-and-match", response_model=JobMatchResponse)
async def extract_and_match(
    req: JobMatchRequest,
    tavily: TavilyClient = Depends(_get_tavily),
    openai: OpenAIClient = Depends(_get_openai),
) -> JobMatchResponse:
    urls = [l.url for l in req.listings]
    snippet_by_url = {l.url: (l.snippet or "").strip() for l in req.listings}
    title_by_url = {l.url: (l.title or "").strip() for l in req.listings}

    extracted_content: Dict[str, str] = {}
    try:
        extracted = await tavily.extract(urls)
        for item in extracted.get("results", []):
            url = item.get("url") or ""
            content = (item.get("raw_content") or "").strip()
            if url and content:
                extracted_content[url] = content
    except TavilyError:
        # Fall back entirely to snippets — don't fail the whole request.
        pass

    jd_blocks: List[Dict[str, str]] = []
    for listing in req.listings:
        url = listing.url
        content = extracted_content.get(url) or snippet_by_url.get(url, "")
        if not content:
            continue
        title = title_by_url.get(url, "")
        header = f"Title: {title}\n" if title else ""
        jd_blocks.append({"url": url, "content": (header + content)[:4000]})

    if not jd_blocks:
        return JobMatchResponse(matches=[])

    jd_serialized = "\n\n".join(
        f"### JD #{i + 1}\nURL: {b['url']}\n---\n{b['content']}"
        for i, b in enumerate(jd_blocks)
    )

    system_prompt = (
        "You are an expert CV-to-JD matcher. Given a candidate CV and several job descriptions, "
        "score how well the CV fits each JD from 0 to 100. Be realistic and discriminating: "
        "0-40 weak fit, 40-70 partial, 70-90 strong, 90+ near-perfect. "
        "For each JD return the exact URL provided, the job title and company if extractable, "
        "location if extractable, 2-4 concise match_reasons and up to 4 skill_gaps. "
        "Respond ONLY with JSON matching the schema."
    )
    user_prompt = (
        f"**CANDIDATE CV:**\n---\n{req.cv_text[:8000]}\n---\n\n"
        f"**JOB DESCRIPTIONS:**\n{jd_serialized}"
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
                "name": "job_matches",
                "schema": _MATCH_SCHEMA,
                "strict": True,
            },
        },
    }

    try:
        completion = await openai.chat_completion(payload)
    except OpenAIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    try:
        content = completion["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=502, detail=f"Malformed OpenAI response: {exc!s}"
        ) from exc

    excerpt_by_url = {b["url"]: b["content"][:600] for b in jd_blocks}
    matches: List[JobMatchItem] = []
    for m in parsed.get("matches", []):
        url = m.get("url", "")
        matches.append(
            JobMatchItem(
                url=url,
                title=m.get("title") or "",
                company=m.get("company") or None,
                location=m.get("location") or None,
                source=_source_from_url(url),
                match_score=int(m.get("match_score", 0)),
                match_reasons=m.get("match_reasons", []) or [],
                skill_gaps=m.get("skill_gaps", []) or [],
                jd_excerpt=excerpt_by_url.get(url, ""),
            )
        )

    matches.sort(key=lambda x: x.match_score, reverse=True)
    return JobMatchResponse(matches=matches)
