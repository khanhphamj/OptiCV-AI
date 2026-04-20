from __future__ import annotations

import os

os.environ.setdefault("OPENAI_API_KEY", "sk-test")

from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
