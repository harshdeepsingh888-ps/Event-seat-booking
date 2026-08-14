import pytest
import pytest_asyncio
import datetime
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text
from app.main import app
from app.models import Base, Booking, Seat
from app.api.v1.events import get_db

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
async def test_create_event_success(client: AsyncClient):
    payload = {
        "name": "Tech Conference 2026",
        "event_date": "2026-09-15T18:00:00",
        "total_rows": 3,
        "total_cols": 4
    }
    response = await client.post("/api/v1/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tech Conference 2026"
    assert data["total_rows"] == 3
    assert data["total_cols"] == 4

    # Verify Detail Seat Map
    event_id = data["id"]
    detail_res = await client.get(f"/api/v1/events/{event_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["seats"]) == 12  # 3 * 4 = 12 seats
    assert detail["seats"][0]["seat_label"] == "A1"
    assert detail["seats"][11]["seat_label"] == "C4"


@pytest.mark.asyncio
async def test_create_event_validation_errors(client: AsyncClient):
    # 1. Empty Name
    res1 = await client.post("/api/v1/events", json={"name": "   ", "event_date": "2026-09-15T18:00:00", "total_rows": 5, "total_cols": 5})
    assert res1.status_code == 422

    # 2. Zero Rows
    res2 = await client.post("/api/v1/events", json={"name": "Valid Name", "event_date": "2026-09-15T18:00:00", "total_rows": 0, "total_cols": 5})
    assert res2.status_code == 422

    # 3. Negative Cols
    res3 = await client.post("/api/v1/events", json={"name": "Valid Name", "event_date": "2026-09-15T18:00:00", "total_rows": 5, "total_cols": -2})
    assert res3.status_code == 422

    # 4. Exceeding Max Rows
    res4 = await client.post("/api/v1/events", json={"name": "Valid Name", "event_date": "2026-09-15T18:00:00", "total_rows": 100, "total_cols": 5})
    assert res4.status_code == 422


@pytest.mark.asyncio
async def test_list_events(client: AsyncClient):
    await client.post("/api/v1/events", json={"name": "Event 1", "event_date": "2026-09-15T18:00:00", "total_rows": 2, "total_cols": 2})
    await client.post("/api/v1/events", json={"name": "Event 2", "event_date": "2026-10-15T18:00:00", "total_rows": 2, "total_cols": 2})

    res = await client.get("/api/v1/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 2


@pytest.mark.asyncio
async def test_missing_event(client: AsyncClient):
    res = await client.get(f"/api/v1/events/{str(uuid.uuid4())}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_seat_blocking_and_unblocking(client: AsyncClient):
    # Create Event
    create_res = await client.post("/api/v1/events", json={"name": "Concert", "event_date": "2026-09-15T18:00:00", "total_rows": 2, "total_cols": 2})
    event_id = create_res.json()["id"]

    # Get Detail
    detail_res = await client.get(f"/api/v1/events/{event_id}")
    seats = detail_res.json()["seats"]
    target_seat_id = seats[0]["id"]

    # Block Seat
    block_res = await client.patch(f"/api/v1/events/{event_id}/seats/block", json={"seat_ids": [target_seat_id], "blocked": True})
    assert block_res.status_code == 200
    blocked_seat = next(s for s in block_res.json()["seats"] if s["id"] == target_seat_id)
    assert blocked_seat["is_blocked"] is True
    assert blocked_seat["status"] == "BLOCKED"

    # Unblock Seat
    unblock_res = await client.patch(f"/api/v1/events/{event_id}/seats/block", json={"seat_ids": [target_seat_id], "blocked": False})
    assert unblock_res.status_code == 200
    unblocked_seat = next(s for s in unblock_res.json()["seats"] if s["id"] == target_seat_id)
    assert unblocked_seat["is_blocked"] is False
    assert unblocked_seat["status"] == "AVAILABLE"


@pytest.mark.asyncio
async def test_cross_event_seat_blocking_rejection(client: AsyncClient):
    e1_res = await client.post("/api/v1/events", json={"name": "Event A", "event_date": "2026-09-15T18:00:00", "total_rows": 2, "total_cols": 2})
    e2_res = await client.post("/api/v1/events", json={"name": "Event B", "event_date": "2026-09-15T18:00:00", "total_rows": 2, "total_cols": 2})

    e1_id = e1_res.json()["id"]
    e2_id = e2_res.json()["id"]

    detail1 = await client.get(f"/api/v1/events/{e1_id}")
    seat_from_e1 = detail1.json()["seats"][0]["id"]

    # Attempt to block seat from Event A through Event B
    bad_res = await client.patch(f"/api/v1/events/{e2_id}/seats/block", json={"seat_ids": [seat_from_e1], "blocked": True})
    assert bad_res.status_code == 400


@pytest.mark.asyncio
async def test_block_booked_seat_rejection(client: AsyncClient, test_session: AsyncSession):
    create_res = await client.post("/api/v1/events", json={"name": "Show", "event_date": "2026-09-15T18:00:00", "total_rows": 2, "total_cols": 2})
    event_id = create_res.json()["id"]

    detail_res = await client.get(f"/api/v1/events/{event_id}")
    seat_id = detail_res.json()["seats"][0]["id"]

    # Directly seed a booking record
    booking = Booking(
        id=str(uuid.uuid4()),
        event_id=event_id,
        seat_id=seat_id,
        booker_name="Existing Booker",
        booker_email="booker@example.com"
    )
    test_session.add(booking)
    await test_session.commit()

    # Attempt to block the booked seat
    block_res = await client.patch(f"/api/v1/events/{event_id}/seats/block", json={"seat_ids": [seat_id], "blocked": True})
    assert block_res.status_code == 409
