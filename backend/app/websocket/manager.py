from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """Process-local registry of live sockets, grouped by authenticated user."""

    def __init__(self) -> None:
        self.connections: dict[int, set[WebSocket]] = defaultdict(set)

    def connect(self, user_id: int, websocket: WebSocket) -> None:
        self.connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self.connections.get(user_id)
        if sockets is None:
            return
        sockets.discard(websocket)
        if not sockets:
            self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, event: dict) -> None:
        for websocket in list(self.connections.get(user_id, set())):
            await websocket.send_json(event)


manager = ConnectionManager()
