from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import bearer_scheme, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    token_digest,
    verify_password,
)
from app.db.database import get_db
from app.models.session import Session
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["authentication"])


class RegisterRequest(BaseModel):
    # Keep this dependency-free; Pydantic's EmailStr requires the optional
    # email-validator package, which is not otherwise needed by this service.
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(RegisterRequest):
    pass


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def _client_id(request: Request) -> str:
    return request.headers.get("X-Client-ID") or request.headers.get("User-Agent", "unknown")[:255]


async def _create_session_response(db: AsyncSession, user: User, client_id: str) -> AuthResponse:
    session = Session(
        user_id=user.id,
        client_id=client_id,
        token_hash="pending",
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.flush()
    access_token = create_access_token(subject=str(user.id), session_id=session.id)
    refresh_token = create_refresh_token(subject=str(user.id), session_id=session.id)
    session.token_hash = token_digest(refresh_token)
    await db.commit()
    return AuthResponse(user=user, access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    email = str(payload.email).lower()
    existing = await db.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.flush()
        return await _create_session_response(db, user, _client_id(request))
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    user = await db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return await _create_session_response(db, user, _client_id(request))


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    try:
        claims = decode_token(payload.refresh_token, "refresh")
        session_id, user_id = int(claims["sid"]), int(claims["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session = await db.scalar(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    if session is None or session.revoked_at is not None or session.expires_at <= datetime.utcnow() or session.token_hash != token_digest(payload.refresh_token):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    # Refresh tokens are intentionally not rotated; the stored digest binds one
    # long-lived refresh token to one revocable session.
    return {"access_token": create_access_token(subject=str(user_id), session_id=session_id), "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials=Depends(bearer_scheme), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    try:
        claims = decode_token(credentials.credentials, "access")
        session_id = int(claims["sid"])
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    session = await db.scalar(select(Session).where(Session.id == session_id, Session.user_id == user.id))
    if session and session.revoked_at is None:
        session.revoked_at = datetime.utcnow()
        await db.commit()


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
