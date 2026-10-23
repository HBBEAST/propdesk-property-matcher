# Engineering Notes (`NOTES.md`)

## 1. What is Finished vs. Unfinished

Everything in the core specification and both bonus items are **complete and tested**:

- **Authentication & Passwords**: Email/password login (`POST /auth/login`), password hashing with `bcrypt` / `argon2` (with cryptographic PBKDF2-HMAC-SHA256 fallback in restricted environments), and signed JWT tokens accepted via both `Authorization: Bearer <token>` header and `HttpOnly` session cookie (`propdesk_token`).
- **Role-Based Permissions**: Enforced strictly in the backend (`backend/auth.py` and `backend/main.py`):
  - Every route except `/auth/login` requires authentication (`401` otherwise).
  - Agents requesting, matching, or updating a requirement assigned to another agent receive `404 Not Found`—indistinguishable from a non-existent ID.
  - Agents attempting manager-only actions (`POST /properties`, `POST /properties/import`, `PATCH /requirements/{id}`) receive `403 Forbidden`.
- **Database-Side SQL Matching Engine**: Filtering, scoring (`100 - 20 [over_budget] - 15 [bhk_differs]`), flag generation, sorting (`score DESC, price ASC`), and pagination (`?limit=&offset=`) all happen in SQL (`backend/matching.py`).
- **CSV Import**: `POST /properties/import` validates row-by-row using the exact same validator as `POST /properties`, imports valid rows, skips invalid rows, and returns `{"imported": 3, "errors": [...]}` with accurate 1-based line numbers (header = line 1) on the specification's 7-row CSV.
- **Frontend (Next.js App Router + TypeScript)**: Login page, paginated Requirements list with manager agent reassignment, Requirement detail with matches/scores/flags and Shared/Rejected status transitions, Add Requirement form with field-level `422` validation errors, Manager-only CSV import page, and Indian currency formatting (`₹1.85 Cr`, `₹45.0 L`, `₹18k/mo`, `₹750`).
- **Bonus Items Completed**:
  1. `GET /properties/{id}/matching-requirements`: Reverse matching reusing `_build_shared_match_sql` so matching and scoring logic is written once, filtered to only the logged-in agent's requirements when called by an agent.
  2. `.github/workflows/tests.yml`: GitHub Actions CI pipeline running migrations and the automated test suite on every push.

Nothing from the specification was left unfinished.

## 2. Decisions & Edge Cases Clarified

1. **Bearer Token + HttpOnly Session Cookie Hybrid**:
   - `POST /auth/login` both sets an `HttpOnly`, `SameSite=Lax` cookie (`propdesk_token`) and returns `access_token` in the JSON body; `get_current_user` checks `Authorization: Bearer <token>` first and falls back to the cookie.
2. **Exact Integer Arithmetic for the 110% Budget Threshold**:
   - Since `price` and `budget_max` are whole rupees, we evaluate the 110% cap in SQL as `(p.price * 10) <= (r.budget_max * 11)` using `BIGINT` to avoid floating-point rounding discrepancies.
3. **Locality Normalization & Indexing**:
   - Both forward and reverse matching compare `LOWER(TRIM(p.locality))` against normalized requirement localities, paired with a functional index `CREATE INDEX ix_properties_locality_norm ON properties (LOWER(TRIM(locality)))`.
4. **Requirement `bhk` on Plots and Shops**:
   - For requirements, `bhk` is optional (`null` = "any") for flats and houses, and must be `null`/empty if the requirement's `type` is `plot` or `shop`.

## 3. What We Would Improve With One More Day

1. **PostgreSQL GIN Indexing on Normalized Localities**: Store requirement localities in a normalized lowercase PostgreSQL `TEXT[]` column with a `GIN` index so reverse matching uses index-backed array containment at 50,000+ rows.
2. **Audit Log for Match Status Changes & Reassignments**: Track `updated_by` and `updated_at` timestamps on `match_statuses` and requirement reassignments.
3. **Bulk CSV Streaming**: Stream large CSV uploads in batches of 1,000 rows for constant-memory imports.

## 4. Where and How AI Tools Were Used

- Used AI assistance to scaffold the Next.js App Router TypeScript components (`src/app/...`) and Alembic migration boilerplate (`alembic/`).
- Manually traced all 12 seed properties against Requirements 1, 2, and 3 and all 7 CSV rows to verify the SQL scoring expressions (`100 - 20 - 15 = 65` for Sana's Requirement #2 matching Property #12) and wrote deterministic automated tests in `tests/test_app.py`.
