"""
Seed data loader for PropDesk Property Matcher (Page 6 of specification).

Loads the 3 users, 12 properties, and 3 requirements.
Seed user passwords are read from environment variables (SEED_PASSWORD_NEHA,
SEED_PASSWORD_RAVI, SEED_PASSWORD_SANA) so plaintext demo credentials are
never stored in the repository.
"""
import os
from typing import Dict

from .auth import hash_password
from .database import DatabaseSession, db_manager, serialize_localities

# Pre-computed one-way bcrypt hashes for seed accounts when env vars are not provided
SEED_BCRYPT_HASHES: Dict[str, str] = {
    "neha@example.com": "$2b$12$H.DkfSVehMo0rdi4xomNOeKUweCtx5zoTht4m3Y02UNDd/fhD6PsK",
    "ravi@example.com": "$2b$12$be7PEKDRb7WVOF9qQZPS1e6qeLe3bOVNOHpNwr0ilv5./tbUlXNw.",
    "sana@example.com": "$2b$12$z9gFXsxVt73JR57z98JThOfuyTFf2ojfThTrn9J7wkBcB7jCK/jIG",
}

DEFAULT_PASSWORDS: Dict[str, str] = {
    "neha@example.com": (os.getenv("SEED_PASSWORD_NEHA") or "").strip() or "local-test-manager-pass",
    "ravi@example.com": (os.getenv("SEED_PASSWORD_RAVI") or "").strip() or "local-test-ravi-pass",
    "sana@example.com": (os.getenv("SEED_PASSWORD_SANA") or "").strip() or "local-test-sana-pass",
}

SEED_DATA = {
    "users": [
        {"id": 1, "name": "Neha Kapoor", "email": "neha@example.com", "role": "manager"},
        {"id": 2, "name": "Ravi Patel", "email": "ravi@example.com", "role": "agent"},
        {"id": 3, "name": "Sana Khan", "email": "sana@example.com", "role": "agent"},
    ],
    "properties": [
        {
            "id": 1,
            "title": "2BHK Flat, Vijay Nagar",
            "locality": "Vijay Nagar",
            "deal": "sale",
            "type": "flat",
            "bhk": 2,
            "price": 4500000,
        },
        {
            "id": 2,
            "title": "3BHK Flat, Vijay Nagar",
            "locality": "Vijay Nagar",
            "deal": "sale",
            "type": "flat",
            "bhk": 3,
            "price": 6200000,
        },
        {
            "id": 3,
            "title": "2BHK Flat, Nipania",
            "locality": "Nipania",
            "deal": "sale",
            "type": "flat",
            "bhk": 2,
            "price": 5500000,
        },
        {
            "id": 4,
            "title": "2BHK Flat for rent, Vijay Nagar",
            "locality": "Vijay Nagar",
            "deal": "rent",
            "type": "flat",
            "bhk": 2,
            "price": 18000,
        },
        {
            "id": 5,
            "title": "4BHK Villa, Nipania",
            "locality": "Nipania",
            "deal": "sale",
            "type": "house",
            "bhk": 4,
            "price": 18500000,
        },
        {
            "id": 6,
            "title": "1BHK Flat, Palasia",
            "locality": "Palasia",
            "deal": "sale",
            "type": "flat",
            "bhk": 1,
            "price": 2800000,
        },
        {
            "id": 7,
            "title": "Shop, AB Road",
            "locality": "AB Road",
            "deal": "rent",
            "type": "shop",
            "bhk": None,
            "price": 55000,
        },
        {
            "id": 8,
            "title": "2BHK Flat, Vijay Nagar (resale)",
            "locality": " vijay nagar ",
            "deal": "sale",
            "type": "flat",
            "bhk": 2,
            "price": 4800000,
        },
        {
            "id": 9,
            "title": "3BHK Flat, Scheme 54",
            "locality": "Vijay Nagar",
            "deal": "sale",
            "type": "flat",
            "bhk": 3,
            "price": 5000000,
        },
        {
            "id": 10,
            "title": "Plot, Rau",
            "locality": "Rau",
            "deal": "sale",
            "type": "plot",
            "bhk": None,
            "price": 3500000,
        },
        {
            "id": 11,
            "title": "4BHK Flat, Nipania",
            "locality": "Nipania",
            "deal": "sale",
            "type": "flat",
            "bhk": 4,
            "price": 5400000,
        },
        {
            "id": 12,
            "title": "1BHK Flat for rent, Vijay Nagar",
            "locality": "Vijay Nagar",
            "deal": "rent",
            "type": "flat",
            "bhk": 1,
            "price": 16000,
        },
    ],
    "requirements": [
        {
            "id": 1,
            "client_name": "Rohan Verma",
            "phone": "9876543210",
            "deal": "sale",
            "type": "flat",
            "localities": ["Vijay Nagar", "Nipania"],
            "bhk": 2,
            "budget_max": 5000000,
            "assigned_to": 2,
        },
        {
            "id": 2,
            "client_name": "Priya Sharma",
            "phone": "8765432109",
            "deal": "rent",
            "type": "flat",
            "localities": ["Vijay Nagar"],
            "bhk": 2,
            "budget_max": 15000,
            "assigned_to": 3,
        },
        {
            "id": 3,
            "client_name": "Amit Jain",
            "phone": "7654321098",
            "deal": "sale",
            "type": "shop",
            "localities": ["AB Road"],
            "bhk": None,
            "budget_max": 4000000,
            "assigned_to": 2,
        },
    ],
}


def seed_database(db: DatabaseSession, force_reset: bool = False) -> None:
    """Seeds the database with initial users, properties, and requirements if empty (or when force_reset=True)."""
    if force_reset:
        for table in ("match_statuses", "requirements", "properties", "users"):
            try:
                db.execute(f"DELETE FROM {table}")
                db.commit()
            except Exception:
                db.rollback()

    if db.dialect == "postgresql":
        try:
            col_rows = db.execute(
                """
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'requirements' AND column_name = 'localities'
                """
            )
            if col_rows and "array" in str(col_rows[0].get("data_type", "")).lower():
                db.execute(
                    "ALTER TABLE requirements ALTER COLUMN localities TYPE TEXT USING array_to_json(localities)::text"
                )
                db.commit()
        except Exception:
            db.rollback()

    existing_users = int(db.scalar("SELECT COUNT(*) FROM users") or 0)
    if existing_users == 0:
        for u in SEED_DATA["users"]:
            pwd = DEFAULT_PASSWORDS.get(u["email"], "local-test-pass")
            db.execute(
                """
                INSERT INTO users (id, name, email, password, role)
                VALUES (:id, :name, :email, :password, :role)
                """,
                {
                    "id": u["id"],
                    "name": u["name"],
                    "email": u["email"],
                    "password": hash_password(pwd),
                    "role": u["role"],
                },
            )
        db.commit()

    existing_props = int(db.scalar("SELECT COUNT(*) FROM properties") or 0)
    if existing_props == 0:
        for p in SEED_DATA["properties"]:
            db.execute(
                """
                INSERT INTO properties (id, title, locality, deal, type, bhk, price)
                VALUES (:id, :title, :locality, :deal, :type, :bhk, :price)
                """,
                p,
            )
        db.commit()

    existing_reqs = int(db.scalar("SELECT COUNT(*) FROM requirements") or 0)
    if existing_reqs == 0:
        for r in SEED_DATA["requirements"]:
            db.execute(
                """
                INSERT INTO requirements (id, client_name, phone, deal, type, localities, bhk, budget_max, assigned_to)
                VALUES (:id, :client_name, :phone, :deal, :type, :localities, :bhk, :budget_max, :assigned_to)
                """,
                {
                    "id": r["id"],
                    "client_name": r["client_name"],
                    "phone": r["phone"],
                    "deal": r["deal"],
                    "type": r["type"],
                    "localities": serialize_localities(r["localities"], db.dialect),
                    "bhk": r["bhk"],
                    "budget_max": r["budget_max"],
                    "assigned_to": r["assigned_to"],
                },
            )
        db.commit()

    if db.dialect == "postgresql":
        for tbl in ("users", "properties", "requirements"):
            try:
                db.execute(
                    f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM {tbl}))"
                )
                db.commit()
            except Exception:
                db.rollback()


if __name__ == "__main__":
    db_manager.init_schema()
    sess = db_manager.create_session()
    try:
        seed_database(sess, force_reset=True)
        print("Successfully seeded PropDesk database with 3 users, 12 properties, and 3 requirements.")
    finally:
        sess.close()
