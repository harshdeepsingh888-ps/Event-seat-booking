import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text

from app.main import app
from app.models import Base
from app.db.session import get_db


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys = ON;"))
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(test_session: AsyncSession):
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_user_registration_and_login(client: AsyncClient):
    # 1. Register new user
    reg_payload = {
        "email": "user@example.com",
        "password": "userpassword123",
        "full_name": "Regular User",
        "role": "USER"
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == "user@example.com"
    assert user_data["role"] == "USER"

    # 2. Login with valid credentials
    login_payload = {
        "email": "user@example.com",
        "password": "userpassword123"
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Get current user profile
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "user@example.com"


@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoint_rejection(client: AsyncClient):
    # Creating event without token MUST return 401 Unauthorized
    payload = {
        "name": "Secret Event",
        "event_date": "2026-10-01T18:00:00Z",
        "total_rows": 2,
        "total_cols": 2
    }
    res = await client.post("/api/v1/events", json=payload)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_non_admin_forbidden_access(client: AsyncClient):
    # 1. Register regular USER
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "regular@example.com",
        "password": "password123",
        "full_name": "Regular User",
        "role": "USER"
    })
    assert reg_res.status_code == 201

    # 2. Login to get token
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "regular@example.com",
        "password": "password123"
    })
    token = login_res.json()["access_token"]

    # 3. Attempt admin operation with USER token -> MUST return 403 Forbidden
    payload = {
        "name": "Unauthorized Event",
        "event_date": "2026-10-01T18:00:00Z",
        "total_rows": 2,
        "total_cols": 2
    }
    res = await client.post("/api/v1/events", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_role_access(client: AsyncClient):
    # 1. Register ADMIN user
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "admin@example.com",
        "password": "adminpassword123",
        "full_name": "Admin User",
        "role": "ADMIN"
    })
    assert reg_res.status_code == 201

    # 2. Login as ADMIN
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@example.com",
        "password": "adminpassword123"
    })
    token = login_res.json()["access_token"]

    # 3. Create event with ADMIN token -> MUST return 201 Created
    payload = {
        "name": "Admin Authorized Event",
        "event_date": "2026-10-01T18:00:00Z",
        "total_rows": 2,
        "total_cols": 2
    }
    res = await client.post("/api/v1/events", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
