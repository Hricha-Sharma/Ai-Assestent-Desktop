from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_readiness_checks_dependencies(client: TestClient) -> None:
    assert client.get("/health/ready").json() == {"status": "ready"}
