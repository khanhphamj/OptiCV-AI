# Deployment Guide

OptiCV-AI is a monorepo:

- `frontend/` — React 19 + Vite SPA (static build, deploys to Vercel).
- `backend/` — Python 3 FastAPI service that proxies OpenAI. Deploy to any Python host (Vercel Python runtime, Render, Railway, Fly.io, your own VM, etc.).

## 1. Backend (Python 3 / FastAPI)

### 1.1 Environment variables (server-side only)

| Key              | Required | Notes                                              |
| ---------------- | -------- | -------------------------------------------------- |
| `OPENAI_API_KEY` | yes      | OpenAI key. Never expose to client.                |
| `OPENAI_MODEL`   | no       | Defaults to `gpt-4.1-mini-2025-04-14`.             |
| `ALLOWED_ORIGINS`| no       | Comma-separated origins for CORS (e.g. the FE URL).|

### 1.2 Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/api/health`.

### 1.3 Deploy

- **Render / Railway / Fly**: point at `backend/`, run command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, set env vars.
- **Vercel Python runtime**: see `vercel.json` in `backend/` (optional; add if you prefer single-platform).

After deploying, note the public URL (e.g. `https://api.opticv-ai.example.com`). The frontend needs it.

## 2. Frontend (Vite on Vercel)

### 2.1 Environment variables (build-time)

| Key                 | Required | Notes                                                       |
| ------------------- | -------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL` | yes      | Public URL of the backend, e.g. `https://api.opticv-ai.com` |

No OpenAI key belongs here. Anything in `VITE_*` ends up in the public JS bundle.

### 2.2 Vercel setup

1. Import the repository as a new project.
2. Root directory: `frontend`.
3. Build command: `npm run build` (auto-detected from Vite).
4. Output directory: `dist`.
5. Environment variables: set `VITE_API_BASE_URL` to the backend URL for each environment (Production / Preview / Development).
6. Deploy.

### 2.3 Run locally

```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## 3. Troubleshooting

- **CORS errors from the browser**: add the frontend origin to `ALLOWED_ORIGINS` on the backend.
- **401 from OpenAI**: rotate `OPENAI_API_KEY` and redeploy the backend.
- **FE can reach backend in dev but not in prod**: `VITE_API_BASE_URL` was not set at build time on Vercel — build logs show it missing. Re-trigger the deployment after setting it.

## 4. Security notes

- The OpenAI key lives only in the backend environment. It is never shipped in the frontend bundle, never checked into git, and never referenced via `process.env` on the client.
- `.env` / `.env.local` files are gitignored. Treat any key that ever sat in a client-side file or a committed file as compromised and rotate it.
