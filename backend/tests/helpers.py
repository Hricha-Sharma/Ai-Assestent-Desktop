from uuid import uuid4

from fastapi.testclient import TestClient


def register(client: TestClient) -> tuple[dict, dict[str, str]]:
    email = f"test-{uuid4()}@example.test"
    response = client.post(
        "/auth/register", json={"email": email, "password": "CorrectHorseBatteryStaple1"}
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body, {"Authorization": f"Bearer {body['access_token']}"}
