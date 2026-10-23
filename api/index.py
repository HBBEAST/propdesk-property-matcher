"""
Vercel Serverless Python Runtime Entrypoint (`api/index.py`).

Mounts the PropDesk FastAPI application under both `/api/*` and root `/`
so requests work identically whether routed via Vercel rewrites (`/api/...`)
or called directly during local development.
"""
from fastapi import FastAPI
from backend.main import app as backend_app

app = FastAPI(title="PropDesk Property Matcher Gateway")

# Include all routes directly on root `/` AND under `/api` prefix for Vercel rewrites
for route in backend_app.routes:
    app.routes.append(route)

app.mount("/api", backend_app)
