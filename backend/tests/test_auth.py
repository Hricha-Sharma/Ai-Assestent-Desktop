from fastapi.testclient import TestClient

from tests.helpers import register


def test_registration_login_and_session_logout(client: TestClient) -> None:
    registered, headers = register(client)
    assert client.get("/auth/me", headers=headers).json()["email"] == registered["user"]["email"]

    login = client.post(
        "/auth/login",
        json={"email": registered["user"]["email"], "password": "CorrectHorseBatteryStaple1"},
    )
    assert login.status_code == 200
    login_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.post("/auth/logout", headers=login_headers).status_code == 204
    assert client.get("/auth/me", headers=login_headers).status_code == 401
