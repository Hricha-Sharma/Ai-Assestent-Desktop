from fastapi.testclient import TestClient

from tests.helpers import register


def test_conversation_access_is_limited_to_owner(client: TestClient) -> None:
    _, owner_headers = register(client)
    _, other_headers = register(client)
    created = client.post("/conversations", json={"title": "Private"}, headers=owner_headers)
    assert created.status_code == 201
    conversation_id = created.json()["id"]

    assert client.get(f"/conversations/{conversation_id}", headers=owner_headers).status_code == 200
    assert client.get(f"/conversations/{conversation_id}/messages", headers=owner_headers).json() == []
    # A 404 deliberately avoids disclosing another user's conversation ID.
    assert client.get(f"/conversations/{conversation_id}", headers=other_headers).status_code == 404
    assert client.delete(f"/conversations/{conversation_id}", headers=owner_headers).status_code == 204
