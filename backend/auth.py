"""
Authentication and password hashing module for PropDesk Property Matcher.

- Stores passwords with bcrypt (or argon2 / PBKDF2-SHA256 fallback in restricted environments).
- Issues and verifies HMAC-SHA256 signed Bearer tokens (JWT-formatted) and supports
  both `Authorization: Bearer <token>` headers and `propdesk_token` session cookies.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import Cookie, Depends, Header, HTTPException, status

from .database import DatabaseSession, get_db

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "propdesk-indore-crm-secret-key-2026")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days

try:
    import bcrypt as _bcrypt
except ImportError:
    _bcrypt = None

try:
    from argon2 import PasswordHasher as _Argon2Hasher
    _argon2_hasher = _Argon2Hasher()
except ImportError:
    _argon2_hasher = None


def hash_password(plain_password: str) -> str:
    """
    Hashes a password using bcrypt (preferred) or argon2, with a deterministic
    cryptographic PBKDF2-HMAC-SHA256 fallback when C extensions are unavailable.
    """
    if _bcrypt is not None:
        salt = _bcrypt.gensalt(rounds=12)
        return _bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")
    if _argon2_hasher is not None:
        return _argon2_hasher.hash(plain_password)

    # Standard PBKDF2-HMAC-SHA256 with random 16-byte salt (260,000 iterations)
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 260000)
    return f"pbkdf2_sha256$260000${salt}${dk.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt, argon2, or pbkdf2 hash."""
    if not plain_password or not stored_hash:
        return False

    if stored_hash.startswith(("$2b$", "$2a$", "$2y$")):
        if _bcrypt is not None:
            try:
                return _bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash.encode("utf-8"))
            except Exception:
                return False
        return False

    if stored_hash.startswith("$argon2"):
        if _argon2_hasher is not None:
            try:
                return _argon2_hasher.verify(stored_hash, plain_password)
            except Exception:
                return False
        return False

    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations_str, salt, expected_hex = stored_hash.split("$", 3)
            dk = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations_str),
            )
            return hmac.compare_digest(dk.hex(), expected_hex)
        except Exception:
            return False

    return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user: Dict[str, Any]) -> str:
    """Creates a signed JWT-format bearer token containing user id, email, name, and role."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user["id"]),
        "user_id": int(user["id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies signature and expiration of a JWT bearer token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    propdesk_token: Optional[str] = Cookie(default=None),
    db: DatabaseSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    FastAPI dependency enforcing authentication on every protected route.
    Accepts either `Authorization: Bearer <token>` or the `propdesk_token` cookie.
    """
    token: Optional[str] = None
    if authorization:
        scheme, _, param = authorization.partition(" ")
        if scheme.lower() == "bearer" and param.strip():
            token = param.strip()
    if not token and propdesk_token:
        token = propdesk_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
        )

    payload = decode_access_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )

    rows = db.execute(
        "SELECT id, name, email, role FROM users WHERE id = :uid",
        {"uid": int(payload["user_id"])},
    )
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
        )
    return rows[0]


def require_manager(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    FastAPI dependency enforcing that only a manager can access the route.
    Agents trying a manager-only action receive HTTP 403.
    """
    if current_user.get("role") != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: only managers can perform this action.",
        )
    return current_user
