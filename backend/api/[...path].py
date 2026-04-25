"""Vercel Python serverless entry point.

Vercel's `@vercel/python` runtime auto-detects an ASGI `app` attribute in this
file. We re-export the FastAPI app built in `app.main` so the existing routers
(openai_proxy, cover_letter, jobs, health) are served verbatim.
"""
from app.main import app  # noqa: F401
