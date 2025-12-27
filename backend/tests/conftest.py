import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment variables before importing app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_HOURS", "1")

from app.database import Base, get_db
from app.models import User, Community, CommunityTab, InputContribution, BlacklistedToken

from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    return {
        "username": "testuser",
        "email": "testuser@example.com",
        "name": "Test",
        "surname": "User",
        "password": "testpass123",
        "profession": "Software Engineer",
        "dateOfBirth": "1990-01-15",
        "consent": True
    }


@pytest.fixture
def test_user_2_data():
    return {
        "username": "testuser2",
        "email": "testuser2@example.com",
        "name": "Test",
        "surname": "User2",
        "password": "testpass456",
        "profession": "Data Scientist",
        "dateOfBirth": "1992-05-20",
        "consent": True
    }


@pytest.fixture
def admin_user_data():
    return {
        "username": "admin",
        "email": "admin@example.com",
        "name": "Admin",
        "surname": "User",
        "password": "adminpass123",
        "profession": "Administrator",
        "dateOfBirth": "1985-01-01",
        "consent": True
    }


@pytest.fixture
def authenticated_user(client, test_user_data):
    # Register user
    response = client.post("/api/auth/register", json=test_user_data)
    assert response.status_code == 201
    token = response.json()["access_token"]
    user_info = response.json()["user"]
    
    return {
        "token": token,
        "user": user_info,
        "headers": {"Authorization": f"Bearer {token}"}
    }


@pytest.fixture
def authenticated_user_2(client, test_user_2_data):
    response = client.post("/api/auth/register", json=test_user_2_data)
    assert response.status_code == 201
    token = response.json()["access_token"]
    user_info = response.json()["user"]
    
    return {
        "token": token,
        "user": user_info,
        "headers": {"Authorization": f"Bearer {token}"}
    }


@pytest.fixture
def authenticated_admin(client, admin_user_data):
    response = client.post("/api/auth/register", json=admin_user_data)
    assert response.status_code == 201
    token = response.json()["access_token"]
    user_info = response.json()["user"]
    
    return {
        "token": token,
        "user": user_info,
        "headers": {"Authorization": f"Bearer {token}"}
    }


@pytest.fixture
def sample_community_data():
    return {
        "title": "Python Developers Community",
        "description": "A community for Python developers to share knowledge and collaborate on projects.",
        "tabs": [
            {
                "name": "Projects",
                "color": "#3b82f6",
                "description": "Share your Python projects",
                "inputTypes": [
                    {
                        "type": "free text",
                        "name": "Project Name",
                        "items": [],
                        "display_order": 0
                    },
                    {
                        "type": "url",
                        "name": "GitHub Repository",
                        "items": [],
                        "display_order": 1
                    }
                ],
                "display_order": 0
            }
        ]
    }

