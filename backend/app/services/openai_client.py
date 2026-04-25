from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict

import httpx

from app.config import Settings


class OpenAIError(Exception):
    def __init__(self, status_code: int, detail: Any) -> None:
        super().__init__(f"OpenAI responded with {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class OpenAIClient:
    """Thin forwarder to the OpenAI APIs.

    - ``chat_completion`` proxies the legacy Chat Completions endpoint
      (used by analysis/validation/cover-letter flows that rely on
      ``response_format=json_schema`` and structured outputs).
    - ``responses_stream`` proxies the modern Responses API with streaming,
      which OpenAI recommends for streaming chat:
      https://developers.openai.com/api/docs/guides/streaming-responses
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        base = settings.openai_base_url.rstrip("/")
        self._chat_completions_url = f"{base}/chat/completions"
        self._responses_url = f"{base}/responses"

    async def chat_completion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = dict(payload)
        body.setdefault("model", self._settings.openai_model)
        body.pop("stream", None)

        headers = {
            "Authorization": f"Bearer {self._settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(self._settings.openai_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(self._chat_completions_url, headers=headers, json=body)

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise OpenAIError(response.status_code, detail)

        return response.json()

    async def responses_stream(
        self, payload: Dict[str, Any]
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream the Responses API, yielding clean events for the SSE proxy.

        Yields:
          - ``{"delta": "..."}``        on ``response.output_text.delta``
          - ``{"finish_reason": str}``  on ``response.completed`` (best-effort)

        Raises ``OpenAIError`` on transport or upstream error so the caller can
        emit a structured SSE error frame.
        """
        body = dict(payload)
        body.setdefault("model", self._settings.openai_model)
        body["stream"] = True

        headers = {
            "Authorization": f"Bearer {self._settings.openai_api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        timeout = httpx.Timeout(self._settings.openai_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST", self._responses_url, headers=headers, json=body
            ) as response:
                if response.status_code >= 400:
                    raw = await response.aread()
                    try:
                        detail: Any = json.loads(raw.decode() or "{}")
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        detail = raw.decode(errors="replace")
                    raise OpenAIError(response.status_code, detail)

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    event_type = event.get("type")
                    if event_type == "response.output_text.delta":
                        delta = event.get("delta")
                        if isinstance(delta, str) and delta:
                            yield {"delta": delta}
                    elif event_type == "response.completed":
                        # Surface the finish reason if the SDK exposes it; otherwise
                        # fall back to a generic completion marker.
                        response_obj = event.get("response") or {}
                        output = (response_obj.get("output") or [])
                        finish: Any = "stop"
                        if output and isinstance(output[0], dict):
                            finish = output[0].get("status") or finish
                        yield {"finish_reason": str(finish)}
                    elif event_type == "error":
                        err = event.get("error") or event
                        message = err.get("message") if isinstance(err, dict) else str(err)
                        raise OpenAIError(500, {"message": message or "Stream error", "raw": event})
