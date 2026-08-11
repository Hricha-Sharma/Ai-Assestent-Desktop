from collections.abc import Generator

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    # Lifespan closes shared async pools at the end of each test client session.
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def cleanup_test_users() -> Generator[None, None, None]:
    yield
    database_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    with psycopg.connect(database_url) as connection:
        # All test identities use this reserved domain. Cascades remove their
        # sessions, conversations, and messages without touching developer data.
        connection.execute("DELETE FROM users WHERE email LIKE 'test-%@example.test'")
        connection.commit()
