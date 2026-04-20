# OptiCV-AI — AI-powered CV Optimization Assistant

OptiCV-AI matches a CV against a Job Description (JD), scores the fit, suggests concrete edits, and tracks improvement over time.

## Monorepo Layout

```
OptiCV-AI/
├─ frontend/          # React 19 + Vite 6 SPA (TypeScript)
│  ├─ App.tsx, index.tsx, index.html, index.css
│  ├─ components/, services/, hooks/, utils/, icons/, animations/
│  ├─ public/, types/, constants.ts, types.ts
│  ├─ vite.config.ts, tsconfig.json, vite-env.d.ts
│  ├─ package.json, package-lock.json
│  └─ .env.example
├─ backend/           # Python 3.11+ FastAPI service (OpenAI proxy)
│  ├─ app/
│  │  ├─ main.py                  # FastAPI + CORS
│  │  ├─ config.py                # pydantic-settings (reads OPENAI_API_KEY)
│  │  ├─ routers/health.py        # GET  /api/health
│  │  ├─ routers/openai_proxy.py  # POST /api/openai
│  │  └─ services/openai_client.py
│  ├─ tests/
│  ├─ requirements.txt, pyproject.toml
│  └─ .env.example
├─ vercel.json, .github/workflows/
├─ DEPLOY.md, CI-CD-SETUP.md
└─ README.md
```

## How the pieces talk

- `frontend/services/openAIService.ts` sends an OpenAI-shaped chat completion payload to `${VITE_API_BASE_URL}/api/openai`.
- `backend/app/routers/openai_proxy.py` injects `Authorization: Bearer ${OPENAI_API_KEY}` and forwards to OpenAI, returning the JSON verbatim.
- **The OpenAI key is only ever read on the backend.** The frontend bundle never contains it.

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`), upload a CV + JD, and analyze.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind (CDN), Lottie, `pdfjs-dist`, `mammoth`, `showdown`, `react-icons`.
- **Backend**: Python 3.11+, FastAPI, httpx, pydantic v2, pydantic-settings, uvicorn.
- **AI**: OpenAI Chat Completions, model `gpt-4.1-mini-2025-04-14` (override via `OPENAI_MODEL`).

## Deployment

See `DEPLOY.md`. Summary:

- **Frontend** → Vercel (static build from `frontend/`); set `VITE_API_BASE_URL` to the backend's public URL.
- **Backend** → any Python host (Render / Railway / Fly / Vercel Python runtime); set `OPENAI_API_KEY` and `ALLOWED_ORIGINS`.

## Security

- `.env*` files are git-ignored (except `.env.example`).
- Never reference `OPENAI_API_KEY` (or any secret) from frontend code. Anything in a `VITE_*` variable ends up in the public JS bundle — that is how the previous key was leaked and revoked by OpenAI's secret scanner.
- If a key is ever committed or embedded in a built bundle, rotate it immediately.

## Contributing

Issues and PRs are welcome. Please include environment details and clear reproduction steps.
