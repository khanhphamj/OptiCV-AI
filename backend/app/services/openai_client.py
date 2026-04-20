from __future__ import annotations

from typing import Any, Dict

import httpx

from app.config import Settings


class OpenAIError(Exception):
    def __init__(self, status_code: int, detail: Any) -> None:
        super().__init__(f"OpenAI responded with {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class OpenAIClient:
    """Thin forwarder to the OpenAI Chat Completions endpoint.

    The frontend sends an already-shaped chat completion payload (messages,
    temperature, response_format, ...). We only inject the API key and enforce
    that the configured model wins, then return the upstream JSON verbatim.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"

    async def chat_completion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = dict(payload)
        body.setdefault("model", self._settings.openai_model)

        headers = {
            "Authorization": f"Bearer {self._settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(self._settings.openai_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._url, headers=headers, json=body)

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise OpenAIError(response.status_code, detail)

        return response.json()
