"""
Database connection & SQL execution layer for PropDesk Property Matcher.

Supports:
1. SQLAlchemy 2.0 + PostgreSQL (Neon on Vercel or local Postgres) when DATABASE_URL is set
   and SQLAlchemy is installed.
2. Built-in SQLite3 relational SQL engine with an identical parameterized SQL interface
   for local zero-config testing and CI environments.
"""
import json
import os
import sqlite3
import tempfile
from typing import Any, Dict, List, Optional, Sequence

DEFAULT_SQLITE_PATH = os.path.join(tempfile.gettempdir(), "propdesk.db")
DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or f"sqlite:///{DEFAULT_SQLITE_PATH}"
).strip()

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

HAS_SQLALCHEMY = False
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    HAS_SQLALCHEMY = True
except ImportError:
    create_engine = None
    text = None
    sessionmaker = None


SCHEMA_DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'agent'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        locality VARCHAR(120) NOT NULL,
        deal VARCHAR(20) NOT NULL CHECK (deal IN ('sale', 'rent')),
        type VARCHAR(20) NOT NULL CHECK (type IN ('flat', 'house', 'plot', 'shop')),
        bhk INTEGER NULL,
        price BIGINT NOT NULL CHECK (price > 0)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(120) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        deal VARCHAR(20) NOT NULL CHECK (deal IN ('sale', 'rent')),
        type VARCHAR(20) NOT NULL CHECK (type IN ('flat', 'house', 'plot', 'shop')),
        localities TEXT NOT NULL,
        bhk INTEGER NULL,
        budget_max BIGINT NOT NULL CHECK (budget_max > 0),
        assigned_to INTEGER NOT NULL REFERENCES users(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS match_statuses (
        id SERIAL PRIMARY KEY,
        requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL CHECK (status IN ('shared', 'rejected')),
        reason TEXT NULL,
        UNIQUE(requirement_id, property_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_properties_deal_type_price ON properties (deal, type, price)",
    "CREATE INDEX IF NOT EXISTS ix_properties_locality_norm ON properties (LOWER(TRIM(locality)))",
    "CREATE INDEX IF NOT EXISTS ix_requirements_assigned_to ON requirements (assigned_to)",
    "CREATE INDEX IF NOT EXISTS ix_match_statuses_req_prop ON match_statuses (requirement_id, property_id)",
]


class DatabaseSession:
    """
    Unified relational SQL session that executes parameterized SQL statements
    against either a SQLAlchemy connection (Postgres/SQLite) or Python's built-in
    sqlite3 driver.
    """

    def __init__(self, sa_session=None, sqlite_conn: Optional[sqlite3.Connection] = None, dialect: str = "sqlite"):
        self.sa_session = sa_session
        self.sqlite_conn = sqlite_conn
        self.dialect = dialect

    def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        params = params or {}
        if self.sa_session is not None:
            result = self.sa_session.execute(text(sql), params)
            if result.returns_rows:
                keys = list(result.keys())
                return [dict(zip(keys, row)) for row in result.fetchall()]
            return []
        else:
            assert self.sqlite_conn is not None
            cur = self.sqlite_conn.cursor()
            cur.execute(sql, params)
            if cur.description:
                keys = [col[0] for col in cur.description]
                return [dict(zip(keys, row)) for row in cur.fetchall()]
            return []

    def scalar(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Any:
        rows = self.execute(sql, params)
        if not rows:
            return None
        first_row = rows[0]
        return next(iter(first_row.values()))

    def commit(self) -> None:
        if self.sa_session is not None:
            self.sa_session.commit()
        elif self.sqlite_conn is not None:
            self.sqlite_conn.commit()

    def rollback(self) -> None:
        if self.sa_session is not None:
            self.sa_session.rollback()
        elif self.sqlite_conn is not None:
            self.sqlite_conn.rollback()

    def close(self) -> None:
        if self.sa_session is not None:
            self.sa_session.close()
        elif self.sqlite_conn is not None:
            self.sqlite_conn.close()


class DatabaseManager:
    def __init__(self, db_url: str = DATABASE_URL):
        self.db_url = db_url
        self.dialect = "postgresql" if db_url.startswith("postgresql") else "sqlite"
        self._sa_engine = None
        self._sa_session_factory = None
        self._sqlite_path = DEFAULT_SQLITE_PATH

        if db_url.startswith("sqlite:///"):
            raw_path = db_url[len("sqlite:///"):]
            if raw_path.startswith("./") or not os.path.isabs(raw_path):
                self._sqlite_path = os.path.join(tempfile.gettempdir(), os.path.basename(raw_path))
            else:
                self._sqlite_path = raw_path

        if HAS_SQLALCHEMY:
            engine_url = db_url
            if engine_url.startswith("postgresql://"):
                try:
                    import psycopg2  # noqa: F401
                except ImportError:
                    try:
                        import psycopg  # noqa: F401
                        engine_url = engine_url.replace("postgresql://", "postgresql+psycopg://", 1)
                    except ImportError:
                        pass
            connect_args = {"check_same_thread": False} if self.dialect == "sqlite" else {}
            self._sa_engine = create_engine(
                engine_url,
                connect_args=connect_args,
                pool_pre_ping=True,
                future=True,
            )
            self._sa_session_factory = sessionmaker(bind=self._sa_engine, autoflush=False, autocommit=False)

    def create_session(self) -> DatabaseSession:
        if HAS_SQLALCHEMY and self._sa_session_factory is not None:
            return DatabaseSession(sa_session=self._sa_session_factory(), dialect=self.dialect)
        conn = sqlite3.connect(self._sqlite_path, check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = MEMORY")
        conn.execute("PRAGMA synchronous = OFF")
        return DatabaseSession(sqlite_conn=conn, dialect="sqlite")

    def init_schema(self) -> None:
        sess = self.create_session()
        try:
            for ddl in SCHEMA_DDL_STATEMENTS:
                stmt = ddl
                if sess.dialect == "sqlite":
                    stmt = stmt.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
                try:
                    sess.execute(stmt)
                    sess.commit()
                except Exception:
                    sess.rollback()
        finally:
            sess.close()

    def reset_schema(self) -> None:
        sess = self.create_session()
        try:
            for table in ("match_statuses", "requirements", "properties", "users"):
                try:
                    sess.execute(f"DROP TABLE IF EXISTS {table}")
                    sess.commit()
                except Exception:
                    sess.rollback()
        finally:
            sess.close()
        self.init_schema()


db_manager = DatabaseManager(DATABASE_URL)


_COLD_START_INITIALIZED = False


def get_db():
    """FastAPI dependency yielding a DatabaseSession (auto-initializes & seeds on serverless cold start)."""
    global _COLD_START_INITIALIZED
    if not _COLD_START_INITIALIZED:
        try:
            db_manager.init_schema()
            from .seed import seed_database
            init_sess = db_manager.create_session()
            try:
                seed_database(init_sess, force_reset=False)
            finally:
                init_sess.close()
            _COLD_START_INITIALIZED = True
        except Exception:
            pass
    session = db_manager.create_session()
    try:
        yield session
    finally:
        session.close()


def serialize_localities(localities: Sequence[str], dialect: str = "sqlite") -> str:
    """Serializes a list of localities consistently as a JSON array string."""
    return json.dumps([loc.strip() for loc in localities if loc and loc.strip()])


def deserialize_localities(raw: Any) -> List[str]:
    """Deserializes localities from Postgres array or JSON string."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            pass
        return [s.strip() for s in raw.split(",") if s.strip()]
    return []
