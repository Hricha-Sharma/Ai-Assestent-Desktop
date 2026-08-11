"""Mock FastAPI backend server for testing frontend without database"""
from fastapi import FastAPI, WebSocket, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid
from datetime import datetime
from typing import Optional

app = FastAPI(title="AI Assistant Mock Backend", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create sub-app for /api routes
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# In-memory storage
users_db = {}
conversations_db = {}
messages_db = {}
active_connections = []

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict

class User(BaseModel):
    id: str
    email: str
    created_at: str
    updated_at: str

class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    status: str
    created_at: str

class Conversation(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str

# Routes
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/health/ready")
async def readiness():
    return {"status": "ready"}

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    """Register new user"""
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    user = {
        "id": user_id,
        "email": req.email,
        "created_at": now,
        "updated_at": now,
    }
    users_db[user_id] = {"email": req.email, "password": req.password}
    
    return AuthResponse(
        access_token="mock_access_token_" + user_id,
        refresh_token="mock_refresh_token_" + user_id,
        user=user
    )

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Login user"""
    # Find user by email
    user = None
    user_id = None
    for uid, u in users_db.items():
        if u["email"] == req.email:
            user = uid
            user_id = uid
            break
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    now = datetime.utcnow().isoformat()
    return AuthResponse(
        access_token="mock_access_token_" + user_id,
        refresh_token="mock_refresh_token_" + user_id,
        user={
            "id": user_id,
            "email": req.email,
            "created_at": now,
            "updated_at": now,
        }
    )

@api_router.post("/auth/refresh")
async def refresh():
    """Refresh tokens"""
    return {
        "access_token": "mock_new_access_token",
        "refresh_token": "mock_new_refresh_token"
    }

@api_router.post("/auth/logout")
async def logout():
    """Logout user"""
    return {"status": "logged out"}

@api_router.get("/auth/me")
async def get_current_user():
    """Get current user"""
    return {
        "id": "mock_user_id",
        "email": "test@example.com",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

@api_router.post("/conversations")
async def create_conversation():
    """Create new conversation"""
    conv_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conv = {
        "id": conv_id,
        "userId": "mock_user_id",
        "title": "New Chat",
        "createdAt": now,
        "updatedAt": now,
    }
    conversations_db[conv_id] = conv
    return conv

@api_router.get("/conversations")
async def list_conversations():
    """List all conversations"""
    return {"conversations": list(conversations_db.values())}

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get single conversation"""
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversations_db[conversation_id]

@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str):
    """Get messages for conversation"""
    conv_messages = [m for m in messages_db.values() if m["conversation_id"] == conversation_id]
    return {"messages": conv_messages}

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete conversation"""
    if conversation_id in conversations_db:
        del conversations_db[conversation_id]
    return {"status": "deleted"}

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time messages"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "message.send":
                msg_id = str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                
                # Store message
                messages_db[msg_id] = {
                    "id": msg_id,
                    "conversation_id": message.get("conversation_id"),
                    "role": "user",
                    "content": message.get("content"),
                    "status": "completed",
                    "created_at": now,
                }
                
                # Send back AI response with streaming
                response_id = str(uuid.uuid4())
                ai_response = "This is a mock AI response to: " + message.get("content", "")
                
                # Simulate streaming by sending deltas
                for i, chunk in enumerate(ai_response.split(" ")):
                    await websocket.send_json({
                        "type": "message.delta",
                        "id": response_id,
                        "delta": chunk + " ",
                        "index": i,
                    })
                
                # Send completed message
                await websocket.send_json({
                    "type": "message.completed",
                    "id": response_id,
                    "content": ai_response,
                })
                
                # Store AI message
                messages_db[response_id] = {
                    "id": response_id,
                    "conversation_id": message.get("conversation_id"),
                    "role": "assistant",
                    "content": ai_response,
                    "status": "completed",
                    "created_at": now,
                }
            
            elif message.get("type") == "connection.ready":
                await websocket.send_json({
                    "type": "connection.ready",
                    "status": "connected",
                })
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

# Include the API router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
