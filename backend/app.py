"""Vercel FastAPI entrypoint.

The canonical local/PaaS entrypoint remains `main:app`; Vercel's zero-config
FastAPI runtime also detects an `app.py` module at the project root.
"""

from main import app
