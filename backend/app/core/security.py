"""Password and signed-token helpers used by the authentication API."""

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Return an Argon2 hash for a plaintext password."""
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Safely verify a plaintext password against its Argon2 hash."""
    return _password_hash.verify(password, password_hash)


def _create_token(*, subject: str, session_id: int, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "sid": str(session_id),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_access_token(*, subject: str, session_id: int) -> str:
    return _create_token(
        subject=subject,
        session_id=session_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(*, subject: str, session_id: int) -> str:
    return _create_token(
        subject=subject,
        session_id=session_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str) -> dict:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != expected_type or not payload.get("sub") or not payload.get("sid"):
        raise jwt.InvalidTokenError("Invalid token claims")
    return payload


def token_digest(token: str) -> str:
    """Store only a non-reversible digest of a refresh token in the database."""
    return sha256(token.encode("utf-8")).hexdigest()
