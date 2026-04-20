# OptiCV-AI Backend

FastAPI service that proxies OpenAI Chat Completions for the OptiCV-AI frontend. The OpenAI key lives only here.

## Endpoints

- `GET /api/health` — liveness check.
- `POST /api/openai` — forwards a Chat Completions payload to OpenAI and returns the JSON verbatim. The frontend sends the exact request body that OpenAI expects (`messages`, `temperature`, `response_format`, ...); the backend injects `Authorization` and defaults `model` when not supplied.

## Local dev

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # fill in OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

## Environment

See `.env.example`. Required: `OPENAI_API_KEY`. Optional: `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_TIMEOUT_SECONDS`, `ALLOWED_ORIGINS` (comma-separated).

## Layout

```
backend/
├─ app/
│  ├─ main.py                  # FastAPI app + CORS
│  ├─ config.py                # pydantic-settings, loads from .env
│  ├─ routers/
│  │  ├─ health.py             # GET /api/health
│  │  └─ openai_proxy.py       # POST /api/openai
│  └─ services/
│     └─ openai_client.py      # httpx-based OpenAI forwarder
├─ tests/
├─ requirements.txt
├─ pyproject.toml
└─ .env.example
```
