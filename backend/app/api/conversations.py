from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str | None
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    request_id: str
    role: str
    content: str
    status: str
    created_at: datetime


def _owned_conversation_query(conversation_id: int, user_id: int):
    """Every single-conversation access is constrained by its owner."""
    return select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    )


async def _get_owned_conversation(db: AsyncSession, conversation_id: int, user_id: int) -> Conversation:
    conversation = await db.scalar(_owned_conversation_query(conversation_id, user_id))
    if conversation is None:
        # Do not reveal whether another user's conversation exists.
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    conversation = Conversation(user_id=current_user.id, title=payload.title)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
    )
    return list(result.scalars())


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Conversation:
    return await _get_owned_conversation(db, conversation_id, current_user.id)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Response:
    conversation = await _get_owned_conversation(db, conversation_id, current_user.id)
    await db.delete(conversation)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Message]:
    # Ownership check precedes message retrieval, including for an empty conversation.
    await _get_owned_conversation(db, conversation_id, current_user.id)
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at, Message.id)
    )
    return list(result.scalars())
