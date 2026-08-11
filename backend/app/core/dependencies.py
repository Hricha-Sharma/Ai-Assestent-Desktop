from datetime import datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.database import get_db
from app.models.session import Session
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve an authenticated, non-revoked user session from an access JWT."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        claims = decode_token(credentials.credentials, "access")
        session_id, user_id = int(claims["sid"]), int(claims["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        raise unauthorized

    result = await db.execute(
        select(User)
        .join(Session)
        .where(
            User.id == user_id,
            Session.id == session_id,
            Session.user_id == user_id,
            Session.revoked_at.is_(None),
            Session.expires_at > datetime.utcnow(),
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise unauthorized
    return user
