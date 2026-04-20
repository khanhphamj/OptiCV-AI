from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

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
    if "messages" not in payload or not isinstance(payload["messages"], list):
        raise HTTPException(status_code=400, detail="'messages' array is required")

    try:
        return await client.chat_completion(payload)
    except OpenAIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
