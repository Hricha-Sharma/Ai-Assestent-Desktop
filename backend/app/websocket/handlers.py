from datetime import datetime
import logging
from uuid import uuid4

import jwt
from fastapi import WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import select

from app.core.security import decode_token
from app.db.database import AsyncSessionLocal
from app.llm.provider import get_llm_provider
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.session import Session
from app.models.user import User
from app.services.ai_service import AIService
from app.services.idempotency_service import IdempotencyServiceUnavailable, claim_request, release_request
from app.services.rate_limit_service import (
    ConcurrentRequestLimitExceeded,
    RateLimitExceeded,
    acquire_ai_request_slot,
    check_user_rate_limit,
    release_ai_request_slot,
)
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


class MessageSendEvent(BaseModel):
    type: str
    request_id: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_.:-]+$")
    conversation_id: int
    content: str = Field(min_length=1, max_length=20_000)

    @field_validator("type")
    @classmethod
    def only_message_send(cls, value: str) -> str:
        if value != "message.send":
            raise ValueError("Unsupported event type")
        return value

    @field_validator("content")
    @classmethod
    def content_is_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message content cannot be blank")
        return value


async def _authenticated_user_id(token: str | None) -> int | None:
    if not token:
        return None
    try:
        claims = decode_token(token, "access")
        user_id, session_id = int(claims["sub"]), int(claims["sid"])
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
    async with AsyncSessionLocal() as db:
        user = await db.scalar(
            select(User.id)
            .join(Session)
            .where(
                User.id == user_id,
                Session.id == session_id,
                Session.user_id == user_id,
                Session.revoked_at.is_(None),
                Session.expires_at > datetime.utcnow(),
            )
        )
    return user


async def _send_error(websocket: WebSocket, code: str, message: str) -> None:
    await websocket.send_json({"type": "error", "code": code, "message": message})


async def _process_message_event(websocket: WebSocket, user_id: int, payload: dict) -> None:
    try:
        event = MessageSendEvent.model_validate(payload)
    except ValidationError:
        await _send_error(websocket, "INVALID_MESSAGE", "Invalid message event.")
        return

    try:
        await check_user_rate_limit(user_id)
        claimed = await claim_request(event.request_id)
    except RateLimitExceeded:
        await _send_error(websocket, "RATE_LIMITED", "Message rate limit exceeded.")
        return
    except IdempotencyServiceUnavailable:
        await _send_error(websocket, "SERVICE_UNAVAILABLE", "Message service is temporarily unavailable.")
        return
    if not claimed:
        await websocket.send_json({"type": "message.duplicate", "request_id": event.request_id})
        return

    async with AsyncSessionLocal() as db:
        conversation = await db.scalar(
            select(Conversation).where(
                Conversation.id == event.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        if conversation is None:
            await release_request(event.request_id)
            await _send_error(websocket, "CONVERSATION_NOT_FOUND", "Conversation not found.")
            return

        # The database uniqueness constraint remains the durable fallback if Redis
        # loses its short-lived idempotency entry.
        existing = await db.scalar(select(Message.id).where(Message.request_id == event.request_id))
        if existing is not None:
            await websocket.send_json({"type": "message.duplicate", "request_id": event.request_id})
            return

        user_message = Message(
            conversation_id=conversation.id,
            request_id=event.request_id,
            role="user",
            content=event.content.strip(),
            status="completed",
        )
        assistant_message = Message(
            conversation_id=conversation.id,
            request_id=f"assistant:{uuid4()}",
            role="assistant",
            content="",
            status="pending",
        )
        conversation.updated_at = datetime.utcnow()
        db.add_all([user_message, assistant_message])
        await db.commit()
        await db.refresh(user_message)
        await db.refresh(assistant_message)

        # Synchronize persisted conversation events to every active desktop
        # client for this user, including the socket that initiated the request.
        await manager.send_to_user(user_id, {"type": "message.created", "message": {
            "id": user_message.id, "conversation_id": conversation.id, "request_id": user_message.request_id,
            "role": user_message.role, "content": user_message.content, "status": user_message.status,
        }})
        await manager.send_to_user(user_id, {"type": "message.created", "message": {
            "id": assistant_message.id, "conversation_id": conversation.id, "request_id": assistant_message.request_id,
            "role": assistant_message.role, "content": "", "status": assistant_message.status,
        }})

        try:
            await acquire_ai_request_slot(user_id)
        except ConcurrentRequestLimitExceeded:
            assistant_message.status = "failed"
            await db.commit()
            await manager.send_to_user(user_id, {
                "type": "message.failed", "message_id": assistant_message.id,
                "code": "TOO_MANY_CONCURRENT_REQUESTS", "message": "Too many active AI requests.",
            })
            return

        try:
            chunks: list[str] = []
            service = AIService(get_llm_provider())
            async for chunk in service.stream_conversation_response(db, conversation.id):
                chunks.append(chunk)
                await manager.send_to_user(user_id, {
                    "type": "message.delta", "message_id": assistant_message.id, "delta": chunk,
                })
            assistant_message.content = "".join(chunks)
            assistant_message.status = "completed"
            await db.commit()
            await manager.send_to_user(user_id, {"type": "message.completed", "message_id": assistant_message.id})
        except Exception:
            logger.exception("LLM generation failed for assistant message %s", assistant_message.id)
            assistant_message.status = "failed"
            await db.commit()
            await manager.send_to_user(user_id, {
                "type": "message.failed", "message_id": assistant_message.id,
                "code": "AI_PROVIDER_ERROR", "message": "Unable to generate a response.",
            })
        finally:
            await release_ai_request_slot(user_id)


async def websocket_endpoint(websocket: WebSocket) -> None:
    """Authenticate `?token=<access JWT>`, then register a live connection."""
    user_id = await _authenticated_user_id(websocket.query_params.get("token"))
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    manager.connect(user_id, websocket)
    await websocket.send_json({"type": "connection.ready", "user_id": user_id})
    try:
        while True:
            try:
                event = await websocket.receive_json()
            except ValueError:
                await _send_error(websocket, "INVALID_MESSAGE", "Expected a JSON event.")
                continue
            await _process_message_event(websocket, user_id, event)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for user %s", user_id)
    finally:
        manager.disconnect(user_id, websocket)
