from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from app.config import Settings


class TavilyError(Exception):
    def __init__(self, status_code: int, detail: Any) -> None:
        super().__init__(f"Tavily responded with {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class TavilyClient:
    """Thin async wrapper for Tavily /search and /extract endpoints."""

    def __init__(self, settings: Settings) -> None:
        if not settings.tavily_api_key:
            raise RuntimeError("TAVILY_API_KEY is not configured")
        self._settings = settings
        self._search_url = f"{settings.tavily_base_url.rstrip('/')}/search"
        self._extract_url = f"{settings.tavily_base_url.rstrip('/')}/extract"

    async def search(
        self,
        query: str,
        include_domains: Optional[List[str]] = None,
        max_results: int = 10,
        search_depth: str = "basic",
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "api_key": self._settings.tavily_api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": search_depth,
        }
        if include_domains:
            body["include_domains"] = include_domains

        timeout = httpx.Timeout(self._settings.tavily_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._search_url, json=body)

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise TavilyError(response.status_code, detail)

        return response.json()

    async def extract(
        self,
        urls: List[str],
        extract_depth: str = "basic",
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "api_key": self._settings.tavily_api_key,
            "urls": urls,
            "extract_depth": extract_depth,
        }
        timeout = httpx.Timeout(self._settings.tavily_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._extract_url, json=body)

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise TavilyError(response.status_code, detail)

        return response.json()
