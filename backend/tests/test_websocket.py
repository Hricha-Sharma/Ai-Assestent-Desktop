from uuid import uuid4

from fastapi.testclient import TestClient

from tests.helpers import register


def test_websocket_persists_message_and_deduplicates_retry(client: TestClient) -> None:
    auth, headers = register(client)
    conversation = client.post("/conversations", json={}, headers=headers).json()
    request_id = f"test-{uuid4()}"

    with client.websocket_connect(f"/ws?token={auth['access_token']}") as socket:
        assert socket.receive_json()["type"] == "connection.ready"
        event = {
            "type": "message.send",
            "request_id": request_id,
            "conversation_id": conversation["id"],
            "content": "Explain Redis",
        }
        socket.send_json(event)
        assert [socket.receive_json()["type"] for _ in range(3)] == [
            "message.created", "message.created", "message.failed"
        ]
        socket.send_json(event)
        assert socket.receive_json() == {"type": "message.duplicate", "request_id": request_id}

    messages = client.get(f"/conversations/{conversation['id']}/messages", headers=headers).json()
    assert [(message["role"], message["status"]) for message in messages] == [
        ("user", "completed"), ("assistant", "failed"),
    ]
