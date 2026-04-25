from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.config import Settings, get_settings
from app.services.openai_client import OpenAIClient, OpenAIError

router = APIRouter(prefix="/api", tags=["openai"])


def _get_client(settings: Settings = Depends(get_settings)) -> OpenAIClient:
    return OpenAIClient(settings)


@router.post("/openai")
async def proxy_chat_completion(
    payload: Dict[str, Any],
    client: OpenAIClient = Depends(_get_client),
) -> Dict[str, Any]:
    """Non-streaming Chat Completions proxy — used by analysis, validation,
    JD structuring, profile parsing, and cover letter flows that rely on
    ``response_format=json_schema``."""
    if "messages" not in payload or not isinstance(payload["messages"], list):
        raise HTTPException(status_code=400, detail="'messages' array is required")

    try:
        return await client.chat_completion(payload)
    except OpenAIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/openai/stream")
async def proxy_responses_stream(
    payload: Dict[str, Any],
    client: OpenAIClient = Depends(_get_client),
) -> StreamingResponse:
    """SSE-formatted streaming chat via the OpenAI Responses API.

    Expected request body:
        {
          "model": "...",                    (optional — backend default wins)
          "input": [ {"role": "user|assistant", "content": "..."}, ... ],
          "instructions": "system prompt",   (optional)
          "temperature": 0.5                  (optional)
        }

    Frames emitted to the client:
      - data: {"delta": "..."}             — token chunk
      - data: {"finish_reason": "stop"}    — end of message (informational)
      - data: {"error": "...", "status":n} — upstream/transport error
      - data: [DONE]                       — stream terminator
    """
    if "input" not in payload:
        raise HTTPException(status_code=400, detail="'input' field is required")

    async def event_stream() -> AsyncIterator[bytes]:
        try:
            async for chunk in client.responses_stream(payload):
                yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
        except OpenAIError as exc:
            error_frame = json.dumps({"error": exc.detail, "status": exc.status_code})
            yield f"data: {error_frame}\n\n".encode("utf-8")
        except Exception as exc:  # pragma: no cover — defensive
            error_frame = json.dumps({"error": str(exc), "status": 500})
            yield f"data: {error_frame}\n\n".encode("utf-8")
        finally:
            yield b"data: [DONE]\n\n"

    headers = {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        event_stream(), media_type="text/event-stream", headers=headers
    )
