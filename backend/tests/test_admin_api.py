import pytest
import pytest_asyncio
import uuid
import datetime
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text

from app.main import app
from app.models import Base, Event, Seat, Booking
from app.db.session import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_session():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

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
        async def override_db():
            yield session

        app.dependency_overrides[get_db] = override_db
        yield session

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


from app.models.user import User
from app.core.security import hash_password, create_access_token

async def get_admin_headers(session: AsyncSession) -> dict[str, str]:
    admin_user = User(
        id=str(uuid.uuid4()),
        email=f"admin_{uuid.uuid4()}@test.com",
        hashed_password=hash_password("admin123"),
        full_name="Admin Test",
        role="ADMIN"
    )
    session.add(admin_user)
    await session.commit()
    token = create_access_token(subject=admin_user.id, role="ADMIN")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_summary_empty_event(test_session: AsyncSession):
    """Event with 6 seats, 0 booked, 0 blocked -> 100% available, 0% occupancy."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        # Create 2x3 event
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Empty Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        # Fetch Summary
        sum_res = await client.get(f"/api/v1/events/{event_id}/summary")
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["event_id"] == event_id
        assert summary["event_name"] == "Empty Show"
        assert summary["total_seats"] == 6
        assert summary["available_seats"] == 6
        assert summary["booked_seats"] == 0
        assert summary["blocked_seats"] == 0
        assert summary["occupancy_percentage"] == 0.0
        assert summary["total_revenue"] == 0.0


@pytest.mark.asyncio
async def test_summary_blocked_seats(test_session: AsyncSession):
    """Event with 6 seats where 2 seats are blocked."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Blocked Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        detail_res = await client.get(f"/api/v1/events/{event_id}")
        seats = detail_res.json()["seats"]
        a1_id, a2_id = seats[0]["id"], seats[1]["id"]

        # Block 2 seats
        await client.patch(f"/api/v1/events/{event_id}/seats/block", json={"seat_ids": [a1_id, a2_id], "blocked": True})

        # Check summary
        sum_res = await client.get(f"/api/v1/events/{event_id}/summary")
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["total_seats"] == 6
        assert summary["blocked_seats"] == 2
        assert summary["available_seats"] == 4
        assert summary["booked_seats"] == 0
        assert summary["occupancy_percentage"] == 0.0


@pytest.mark.asyncio
async def test_summary_booked_seats(test_session: AsyncSession):
    """Event with 6 seats where 2 seats are booked -> 33.33% occupancy."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Booked Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        detail_res = await client.get(f"/api/v1/events/{event_id}")
        seats = detail_res.json()["seats"]
        a1_id, a2_id = seats[0]["id"], seats[1]["id"]

        # Book 2 seats
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "Alice", "booker_email": "alice@example.com", "seat_ids": [a1_id, a2_id]}
        )

        sum_res = await client.get(f"/api/v1/events/{event_id}/summary")
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["total_seats"] == 6
        assert summary["booked_seats"] == 2
        assert summary["blocked_seats"] == 0
        assert summary["available_seats"] == 4
        assert summary["occupancy_percentage"] == 33.33


@pytest.mark.asyncio
async def test_summary_mixed_state(test_session: AsyncSession):
    """2 booked + 1 blocked + 3 available == 6 total."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Mixed Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        detail_res = await client.get(f"/api/v1/events/{event_id}")
        seats = detail_res.json()["seats"]
        a1_id, a2_id, b1_id = seats[0]["id"], seats[1]["id"], seats[3]["id"]

        # Book A1 and A2
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "Bob", "booker_email": "bob@example.com", "seat_ids": [a1_id, a2_id]}
        )

        # Block B1
        await client.patch(f"/api/v1/events/{event_id}/seats/block", json={"seat_ids": [b1_id], "blocked": True})

        sum_res = await client.get(f"/api/v1/events/{event_id}/summary")
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["total_seats"] == 6
        assert summary["booked_seats"] == 2
        assert summary["blocked_seats"] == 1
        assert summary["available_seats"] == 3
        assert summary["available_seats"] + summary["booked_seats"] + summary["blocked_seats"] == summary["total_seats"]


@pytest.mark.asyncio
async def test_summary_nonexistent_event(test_session: AsyncSession):
    """Invalid event_id summary request MUST return 404 Not Found."""
    fake_id = str(uuid.uuid4())
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        res = await client.get(f"/api/v1/events/{fake_id}/summary")
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_booking_history_multi_seat_grouping(test_session: AsyncSession):
    """Booking 1 (A1, A2) and Booking 2 (B1) MUST be represented as 2 distinct grouped history items."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "History Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        detail_res = await client.get(f"/api/v1/events/{event_id}")
        seats = detail_res.json()["seats"]
        a1_id, a2_id, b1_id = seats[0]["id"], seats[1]["id"], seats[3]["id"]

        # Booking 1: 2 seats
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "Group User", "booker_email": "group@example.com", "seat_ids": [a1_id, a2_id]}
        )

        # Booking 2: 1 seat
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "Single User", "booker_email": "single@example.com", "seat_ids": [b1_id]}
        )

        hist_res = await client.get(f"/api/v1/events/{event_id}/bookings")
        assert hist_res.status_code == 200
        data = hist_res.json()
        assert data["event_id"] == event_id
        assert data["total_bookings"] == 2
        assert len(data["bookings"]) == 2

        # Verify Booking 1 grouping
        group_booking = next(b for b in data["bookings"] if b["booker_email"] == "group@example.com")
        assert len(group_booking["seat_ids"]) == 2
        assert set(group_booking["seat_labels"]) == {"A1", "A2"}

        # Verify Booking 2 grouping
        single_booking = next(b for b in data["bookings"] if b["booker_email"] == "single@example.com")
        assert len(single_booking["seat_ids"]) == 1
        assert single_booking["seat_labels"] == ["B1"]


@pytest.mark.asyncio
async def test_booking_history_ordering(test_session: AsyncSession):
    """Booking history MUST be ordered newest first (created_at DESC)."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Order Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 1, "total_cols": 3}
        )
        event_id = create_res.json()["id"]

        detail_res = await client.get(f"/api/v1/events/{event_id}")
        seats = detail_res.json()["seats"]
        a1_id, a2_id = seats[0]["id"], seats[1]["id"]

        # First booking
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "First Booker", "booker_email": "first@example.com", "seat_ids": [a1_id]}
        )

        await asyncio.sleep(0.01)

        # Second booking
        await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "Second Booker", "booker_email": "second@example.com", "seat_ids": [a2_id]}
        )

        hist_res = await client.get(f"/api/v1/events/{event_id}/bookings")
        assert hist_res.status_code == 200
        bookings = hist_res.json()["bookings"]
        assert len(bookings) == 2
        assert bookings[0]["booker_name"] == "Second Booker"
        assert bookings[1]["booker_name"] == "First Booker"


@pytest.mark.asyncio
async def test_booking_history_empty_event(test_session: AsyncSession):
    """Event with no bookings MUST return 200 OK with bookings: []."""
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "No Bookings Show", "event_date": "2026-09-01T18:00:00Z", "total_rows": 1, "total_cols": 2}
        )
        event_id = create_res.json()["id"]

        hist_res = await client.get(f"/api/v1/events/{event_id}/bookings")
        assert hist_res.status_code == 200
        data = hist_res.json()
        assert data["event_id"] == event_id
        assert data["total_bookings"] == 0
        assert data["bookings"] == []


@pytest.mark.asyncio
async def test_booking_history_nonexistent_event(test_session: AsyncSession):
    """Invalid event_id booking history request MUST return 404 Not Found."""
    fake_id = str(uuid.uuid4())
    headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as client:
        res = await client.get(f"/api/v1/events/{fake_id}/bookings")
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_event_success_and_protection(test_session: AsyncSession):
    """Admin MUST be able to delete an event, unauthenticated/non-admin rejected, nonexistent returns 404."""
    admin_headers = await get_admin_headers(test_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=admin_headers) as client:
        # Create event
        create_res = await client.post(
            "/api/v1/events",
            json={"name": "Event to Delete", "event_date": "2026-09-01T18:00:00Z", "total_rows": 2, "total_cols": 2}
        )
        assert create_res.status_code == 201
        event_id = create_res.json()["id"]

    # 1. Unauthenticated delete attempt -> 401
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        unauth_del = await client.delete(f"/api/v1/events/{event_id}")
        assert unauth_del.status_code == 401

    # 2. Admin delete attempt -> 204
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=admin_headers) as client:
        del_res = await client.delete(f"/api/v1/events/{event_id}")
        assert del_res.status_code == 204

        # Verify event no longer exists
        get_res = await client.get(f"/api/v1/events/{event_id}")
        assert get_res.status_code == 404

        # Subsequent delete on missing event -> 404
        del_again = await client.delete(f"/api/v1/events/{event_id}")
        assert del_again.status_code == 404


