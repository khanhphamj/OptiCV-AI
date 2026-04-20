# CI/CD Setup Guide

GitHub Actions workflows for the monorepo.

## Workflows

### `ci-cd.yml` — main pipeline
- **Trigger**: push to `master`/`main`.
- **Jobs**:
  - Build the frontend on Node 18.x and 20.x.
  - (Optional) Build/test the Python backend.
  - Deploy the frontend to Vercel.
  - Run Lighthouse against the deployed URL.

### `preview.yml` — PR previews
- **Trigger**: pull requests targeting `master`/`main`.
- **Jobs**: build frontend, deploy Vercel preview, comment the URL on the PR.

### `test-secrets.yml` — manual secret audit
- **Trigger**: `workflow_dispatch`.
- Checks that the Vercel secrets are present. **Does not echo any values.**

## GitHub Secrets

| Secret                  | Used by                 | Notes                                    |
| ----------------------- | ----------------------- | ---------------------------------------- |
| `VERCEL_TOKEN`          | ci-cd, preview          | Vercel Dashboard → Settings → Tokens     |
| `VERCEL_ORG_ID`         | ci-cd, preview          | From `.vercel/project.json`              |
| `VERCEL_PROJECT_ID`     | ci-cd, preview          | From `.vercel/project.json`              |
| `LHCI_GITHUB_APP_TOKEN` | ci-cd (Lighthouse)      | Optional                                 |

**Do not put `OPENAI_API_KEY` in GitHub Secrets for the frontend build.** The key belongs only in the backend's runtime environment (Render/Railway/Fly/Vercel Python). Frontend builds must not have access to it.

## Backend deployment (separate)

The Python backend is not deployed by these workflows. Deploy it to your chosen Python host and configure `OPENAI_API_KEY` there. The only variable the frontend needs at build time is `VITE_API_BASE_URL` (the backend's public URL).

## Getting Vercel IDs

```bash
npm i -g vercel
cd frontend
vercel link            # writes .vercel/project.json
cat .vercel/project.json
```
