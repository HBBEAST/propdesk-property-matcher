"""
Database-Level SQL Matching & Scoring Engine for PropDesk Property Matcher.

All filtering, scoring, flag generation, sorting, and pagination happen strictly inside SQL
(zero Python-side table scanning), scalable to 50,000+ properties.
"""
from typing import Any, Dict, List, Optional, Tuple

from .database import DatabaseSession, deserialize_localities


def _build_shared_match_sql(
    localities_Placeholders: str,
    extra_where_clause: str = "",
) -> Tuple[str, str]:
    """
    Shared SQL expression builder used by BOTH:
    1. Forward matching: GET /requirements/{id}/matches
    2. Reverse matching (Bonus): GET /properties/{id}/matching-requirements

    Matching Rules enforced in SQL:
    1. p.deal = r.deal AND p.type = r.type
    2. LOWER(TRIM(p.locality)) matches requirement's normalized localities
    3. p.price <= r.budget_max * 1.10 (written as p.price * 10 <= r.budget_max * 11 in exact integer math)
    4. If r.bhk IS NOT NULL, p.bhk IS NOT NULL AND ABS(p.bhk - r.bhk) <= 1
    5. Match status is NOT 'rejected' for (r.id, p.id)

    Scoring Rules enforced in SQL (starting at 100):
    - p.price > r.budget_max: -20, flag 'over_budget'
    - r.bhk IS NOT NULL AND ABS(p.bhk - r.bhk) = 1: -15, flag 'bhk_differs'
    """
    score_expr = """
        (100
         - CASE WHEN p.price > r.budget_max THEN 20 ELSE 0 END
         - CASE WHEN r.bhk IS NOT NULL AND ABS(p.bhk - r.bhk) = 1 THEN 15 ELSE 0 END
        )
    """
    over_budget_expr = "CASE WHEN p.price > r.budget_max THEN 1 ELSE 0 END"
    bhk_differs_expr = "CASE WHEN r.bhk IS NOT NULL AND ABS(p.bhk - r.bhk) = 1 THEN 1 ELSE 0 END"

    where_sql = f"""
        WHERE p.deal = r.deal
          AND p.type = r.type
          AND LOWER(TRIM(p.locality)) IN ({localities_Placeholders})
          AND (p.price * 10) <= (r.budget_max * 11)
          AND (r.bhk IS NULL OR (p.bhk IS NOT NULL AND ABS(p.bhk - r.bhk) <= 1))
          AND COALESCE(ms.status, '') != 'rejected'
          {extra_where_clause}
    """
    select_Meta = f"""
        {score_expr} AS score,
        {over_budget_expr} AS flag_over_budget,
        {bhk_differs_expr} AS flag_bhk_differs,
        ms.status AS match_status
    """
    return select_Meta, where_sql


def _flags_from_row(row: Dict[str, Any]) -> List[str]:
    flags: List[str] = []
    if int(row.get("flag_over_budget") or 0) == 1:
        flags.append("over_budget")
    if int(row.get("flag_bhk_differs") or 0) == 1:
        flags.append("bhk_differs")
    return flags


def find_matches_for_requirement(
    db: DatabaseSession,
    requirement: Dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Executes filtering, scoring, sorting, and pagination in SQL for a given requirement.
    Sorted by score (highest first), then by price (lowest first).
    """
    localities = [loc.strip().lower() for loc in requirement.get("localities", []) if loc.strip()]
    if not localities:
        return {"total": 0, "items": []}

    params: Dict[str, Any] = {
        "req_id": int(requirement["id"]),
        "limit": int(limit),
        "offset": int(offset),
    }
    loc_keys: List[str] = []
    for idx, loc in enumerate(localities):
        key = f"loc_{idx}"
        loc_keys.append(f":{key}")
        params[key] = loc

    select_meta, where_sql = _build_shared_match_sql(
        localities_Placeholders=", ".join(loc_keys),
        extra_where_clause="AND r.id = :req_id",
    )

    from_join_sql = """
        FROM properties p
        INNER JOIN requirements r ON r.id = :req_id
        LEFT JOIN match_statuses ms
               ON ms.property_id = p.id AND ms.requirement_id = r.id
    """

    count_sql = f"SELECT COUNT(*) AS total {from_join_sql} {where_sql}"
    total = int(db.scalar(count_sql, params) or 0)

    items_sql = f"""
        SELECT
            p.id,
            p.title,
            p.locality,
            p.deal,
            p.type,
            p.bhk,
            p.price,
            {select_meta}
        {from_join_sql}
        {where_sql}
        ORDER BY score DESC, p.price ASC, p.id ASC
        LIMIT :limit OFFSET :offset
    """
    rows = db.execute(items_sql, params)

    items: List[Dict[str, Any]] = []
    for row in rows:
        prop_obj = {
            "id": int(row["id"]),
            "title": row["title"],
            "locality": row["locality"],
            "deal": row["deal"],
            "type": row["type"],
            "bhk": int(row["bhk"]) if row["bhk"] is not None else None,
            "price": int(row["price"]),
        }
        items.append(
            {
                "property": prop_obj,
                "score": int(row["score"]),
                "flags": _flags_from_row(row),
                "status": row["match_status"] if row["match_status"] else None,
            }
        )

    return {"total": total, "items": items}


def find_matching_requirements_for_property(
    db: DatabaseSession,
    prop: Dict[str, Any],
    current_user: Dict[str, Any],
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Bonus endpoint logic: GET /properties/{id}/matching-requirements.
    Reuses `_build_shared_match_sql` so matching and scoring rules are defined only once.
    Agents see only their own requirements; managers see all.
    """
    params: Dict[str, Any] = {
        "prop_id": int(prop["id"]),
        "limit": int(limit),
        "offset": int(offset),
    }

    role_filter = ""
    if current_user.get("role") == "agent":
        role_filter = "AND r.assigned_to = :agent_id"
        params["agent_id"] = int(current_user["id"])

    # For reverse matching, check that LOWER(TRIM(p.locality)) is present in r.localities.
    # In SQLite (and JSON-serialized array in Postgres/SQLite), json_each(r.localities) extracts elements in SQL.
    if db.dialect == "postgresql":
        locality_subquery = "SELECT LOWER(TRIM(val)) FROM json_array_elements_text(r.localities::json) AS val"
    else:
        locality_subquery = "SELECT LOWER(TRIM(value)) FROM json_each(r.localities)"

    select_meta, where_sql = _build_shared_match_sql(
        localities_Placeholders=locality_subquery,
        extra_where_clause=f"AND p.id = :prop_id {role_filter}",
    )

    from_join_sql = """
        FROM requirements r
        INNER JOIN properties p ON p.id = :prop_id
        LEFT JOIN users u ON u.id = r.assigned_to
        LEFT JOIN match_statuses ms
               ON ms.requirement_id = r.id AND ms.property_id = p.id
    """

    count_sql = f"SELECT COUNT(*) AS total {from_join_sql} {where_sql}"
    total = int(db.scalar(count_sql, params) or 0)

    items_sql = f"""
        SELECT
            r.id,
            r.client_name,
            r.phone,
            r.deal,
            r.type,
            r.localities,
            r.bhk,
            r.budget_max,
            r.assigned_to,
            u.name AS assigned_agent_name,
            {select_meta}
        {from_join_sql}
        {where_sql}
        ORDER BY score DESC, r.budget_max DESC, r.id ASC
        LIMIT :limit OFFSET :offset
    """
    rows = db.execute(items_sql, params)

    items: List[Dict[str, Any]] = []
    for row in rows:
        req_obj = {
            "id": int(row["id"]),
            "client_name": row["client_name"],
            "phone": row["phone"],
            "deal": row["deal"],
            "type": row["type"],
            "localities": deserialize_localities(row["localities"]),
            "bhk": int(row["bhk"]) if row["bhk"] is not None else None,
            "budget_max": int(row["budget_max"]),
            "assigned_to": int(row["assigned_to"]),
            "assigned_agent_name": row.get("assigned_agent_name"),
        }
        items.append(
            {
                "requirement": req_obj,
                "score": int(row["score"]),
                "flags": _flags_from_row(row),
                "status": row["match_status"] if row["match_status"] else None,
            }
        )

    return {"total": total, "items": items}
