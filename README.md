# PropDesk — Property Matcher CRM

A real estate brokerage CRM and property-matching application built for Indore using **FastAPI (Python)**, **PostgreSQL + SQLAlchemy 2.0 + Alembic**, and **Next.js 14 (App Router) + TypeScript**, configured for unified deployment on **Vercel** + **Neon Postgres**.

## Architecture Overview

- **Backend (`backend/`, `api/index.py`)**:
  - **FastAPI** REST API with role-based permissions (`manager` vs `agent`) enforced on every route.
  - **SQLAlchemy 2.0 + Alembic (`alembic/`)** for database schema management and migrations.
  - **Database-Level SQL Matching Engine (`backend/matching.py`)**: All filtering, scoring (`100 - 20 [over_budget] - 15 [bhk_differs]`), flag computation, sorting (`score DESC, price ASC`), and pagination (`LIMIT` / `OFFSET`) execute in SQL inside the database—never by loading properties into Python and looping over them.
  - **Bonus Reverse Matching (`GET /properties/{id}/matching-requirements`)**: Reuses the shared SQL matching engine (`_build_shared_match_sql`) to find which requirements fit a given property while respecting agent-level visibility.
- **Frontend (`src/app/`)**:
  - **Next.js App Router + TypeScript + Tailwind CSS**.
  - Pages for Login (`/login`), Paginated Requirements List with Manager Reassignment (`/requirements`), Requirement Detail & Matches with Shared/Rejected actions (`/requirements/[id]`), Add Requirement Form with field-level 422 errors (`/requirements/new`), Properties Inventory & Reverse Matches (`/properties`, `/properties/[id]`), and Manager-only CSV Import (`/import`).
  - Formats all prices in Indian numbering (`₹1.85 Cr`, `₹45.0 L`, `₹18k/mo`, `₹750`).

## Local Setup (Fresh Machine)

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** and `npm`
- **PostgreSQL 14+** (or Neon Postgres connection string; local SQLite is also supported out of the box for instant testing)

### 2. Backend Setup, Migrations & Seed Data

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env and set DATABASE_URL to your local Postgres or Neon instance:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/propdesk

# 4. Run Alembic database migrations
alembic upgrade head

# 5. Load the seed data (3 users, 12 properties, 3 requirements)
python3 -m backend.seed

# 6. Start the FastAPI server on http://127.0.0.1:8000
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup

In a second terminal:

```bash
# 1. Install Node packages
npm install

# 2. Start Next.js development server on http://localhost:3000
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Running Automated Tests

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
# or
pytest -v
```
