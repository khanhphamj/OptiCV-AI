# OptiCV‑AI — AI‑powered CV Optimization Assistant

OptiCV‑AI helps you match a CV against a Job Description (JD), score fit, generate concrete edit suggestions, and track improvement over time.

## Website
- App link: Update your production URL here (`https://www.opticv-ai.site`).

## Video Demo
- Paste your YouTube/Vimeo link here or embed a GIF preview.

## Key Features
- CV vs JD analysis with an overall suitability score (0–100).
- Detailed sub-scores: keyword match, experience fit, skill coverage, quantification of impact.
- Actionable edit suggestions you can apply directly inside the app.
- Improvement history to compare before/after scores per analysis session.
- Conversational CV coach to guide you through targeted improvements.
- Skill-gap detection with compact learning recommendations.

## Tech Stack
- UI: React 19 + TypeScript, Vite 6.
- AI: OpenAI Chat Completions with model `gpt-4.1-mini` (configured in `constants.ts`).
- Styling & UX: Tailwind CSS (CDN), Animate.css, Lottie.
- Utilities: `pdfjs-dist` (PDF), `mammoth` (DOCX), `showdown` (Markdown), `react-icons`.
- Analytics: GA4 (optional; configured in `index.html`).

## System Requirements
- Node.js LTS (recommended ≥ 18).

## Getting Started (Local)
1) Install dependencies
```bash
npm install
```

2) Configure environment variables
- Create `.env.local` at the project root and add your OpenAI key:
```bash
OPENAI_API_KEY=your_openai_api_key_here
# Optional fallback
API_KEY=your_openai_api_key_here
```
Notes:
- The app reads `process.env.OPENAI_API_KEY` (or `API_KEY`), mapped via Vite in `vite.config.ts`.
- Do not commit secrets to git.

3) Run the dev server
```bash
npm run dev
```

4) Build & preview
```bash
npm run build
npm run preview
```

## Project Structure (short)
```
OptiCV-AI/
├─ components/          # UI components (UploadCV, UploadJD, Analysis, Coach, ...)
├─ services/            # AI calls & file parsing helpers (OpenAI, parser)
├─ hooks/, utils/, icons/, animations/
├─ App.tsx              # 3-step flow: Upload CV → Upload JD → Analysis
├─ index.tsx, index.html
├─ constants.ts, types.ts
├─ vite.config.ts, vercel.json
└─ DEPLOY.md            # Detailed Vercel deploy guide
```

## AI Integration
- Primary file: `services/openAIService.ts`
- Model: `CV_ANALYSIS_MODEL` in `constants.ts` (default: `gpt-4.1-mini-2025-04-14`).
- Environment: `OPENAI_API_KEY` (or `API_KEY`).

## Analytics (optional)
- GA4 Measurement ID is set via `window.GA_MEASUREMENT_ID` inside `index.html`.
- If no valid ID is provided, GA scripts are skipped safely.

## Deployment (Vercel)
Quick steps (see `DEPLOY.md` for details):
1) Connect your repo to Vercel → New Project → Framework auto-detect: Vite.
2) Environment Variables:
   - `OPENAI_API_KEY` = <your_openai_api_key>
3) Build Command: `npm run build` — Output Dir: `dist` (as in `vercel.json`).
4) Deploy and visit `https://<project>.vercel.app`.

Note: `DEPLOY.md` references `GEMINI_API_KEY` for an alternative Gemini-based setup. The current app uses OpenAI via `openAIService.ts`. If you switch to Gemini, update the service and env variables accordingly.

## Security & Costs
- AI calls incur provider costs. Protect keys and avoid exposing them in client code whenever possible.
- Do not commit `.env.local`.

## License
- Update this section with your license (e.g., MIT/Apache-2.0/Proprietary).

## Contributing
- Issues and PRs are welcome. Please include environment details and clear reproduction steps.

---

Remember to update the “Website” and “Video Demo” sections above once you have your production URL and the demo video ready.
