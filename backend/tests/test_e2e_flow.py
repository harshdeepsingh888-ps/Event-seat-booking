import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text

from app.main import app
from app.models import Base
from app.api.v1.events import get_db

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


@pytest.mark.asyncio
async def test_full_e2e_event_lifecycle(test_session: AsyncSession):
    """
    End-to-End Integration Test:
    1. Admin creates event & seat grid.
    2. User 1 books seats A1, A2.
    3. Admin checks summary & booking history.
    4. Admin blocks seat B1.
    5. User 2 booking attempts rejected for blocked/booked seats.
    6. User 2 books seat A3.
    7. Admin unblocks seat B1 and verifies summary integrity.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: Admin Creates Event (2 rows x 3 cols = 6 seats)
        create_res = await client.post(
            "/api/v1/events",
            json={
                "name": "E2E Grand Concert",
                "event_date": "2026-09-15T20:00:00Z",
                "total_rows": 2,
                "total_cols": 3
            }
        )
        assert create_res.status_code == 201
        event_id = create_res.json()["id"]

        # Verify initial seat grid
        event_res = await client.get(f"/api/v1/events/{event_id}")
        assert event_res.status_code == 200
        event_data = event_res.json()
        assert len(event_data["seats"]) == 6
        assert all(s["status"] == "AVAILABLE" for s in event_data["seats"])

        seat_map = {s["seat_label"]: s["id"] for s in event_data["seats"]}
        a1_id, a2_id, a3_id = seat_map["A1"], seat_map["A2"], seat_map["A3"]
        b1_id = seat_map["B1"]

        # Step 2: User 1 Books A1 and A2
        user1_booking_res = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={
                "booker_name": "User One",
                "booker_email": "user1@example.com",
                "seat_ids": [a1_id, a2_id]
            }
        )
        assert user1_booking_res.status_code == 201
        booking1_data = user1_booking_res.json()
        assert set(booking1_data["seat_labels"]) == {"A1", "A2"}


        # Step 3: Admin Checks Summary & History
        sum_res1 = await client.get(f"/api/v1/events/{event_id}/summary")
        assert sum_res1.status_code == 200
        summary1 = sum_res1.json()
        assert summary1["total_seats"] == 6
        assert summary1["booked_seats"] == 2
        assert summary1["blocked_seats"] == 0
        assert summary1["available_seats"] == 4
        assert summary1["occupancy_percentage"] == 33.33

        hist_res1 = await client.get(f"/api/v1/events/{event_id}/bookings")
        assert hist_res1.status_code == 200
        hist1 = hist_res1.json()
        assert hist1["total_bookings"] == 1
        assert hist1["bookings"][0]["booker_name"] == "User One"
        assert set(hist1["bookings"][0]["seat_labels"]) == {"A1", "A2"}

        # Step 4: Admin Blocks Seat B1
        block_res = await client.patch(
            f"/api/v1/events/{event_id}/seats/block",
            json={"seat_ids": [b1_id], "blocked": True}
        )
        assert block_res.status_code == 200

        # Step 5: Safety Rejections
        # 5a. Admin attempts to block already-booked seat A1 -> 409 Conflict
        block_booked_res = await client.patch(
            f"/api/v1/events/{event_id}/seats/block",
            json={"seat_ids": [a1_id], "blocked": True}
        )
        assert block_booked_res.status_code == 409

        # 5b. User 2 attempts to book blocked seat B1 -> 409 Conflict
        user2_blocked_booking = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "User Two", "booker_email": "user2@example.com", "seat_ids": [b1_id]}
        )
        assert user2_blocked_booking.status_code == 409

        # 5c. User 2 attempts to book already-booked seat A1 -> 409 Conflict
        user2_booked_booking = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "User Two", "booker_email": "user2@example.com", "seat_ids": [a1_id]}
        )
        assert user2_booked_booking.status_code == 409

        # Step 6: User 2 Successfully Books Seat A3
        user2_success_booking = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={"booker_name": "User Two", "booker_email": "user2@example.com", "seat_ids": [a3_id]}
        )
        assert user2_success_booking.status_code == 201

        # Check Updated Admin Analytics
        sum_res2 = await client.get(f"/api/v1/events/{event_id}/summary")
        summary2 = sum_res2.json()
        assert summary2["total_seats"] == 6
        assert summary2["booked_seats"] == 3
        assert summary2["blocked_seats"] == 1
        assert summary2["available_seats"] == 2
        assert summary2["occupancy_percentage"] == 50.0

        # Step 7: Admin Unblocks Seat B1
        unblock_res = await client.patch(
            f"/api/v1/events/{event_id}/seats/block",
            json={"seat_ids": [b1_id], "blocked": False}
        )
        assert unblock_res.status_code == 200

        # Final Summary Verification
        sum_res3 = await client.get(f"/api/v1/events/{event_id}/summary")
        summary3 = sum_res3.json()
        assert summary3["total_seats"] == 6
        assert summary3["booked_seats"] == 3
        assert summary3["blocked_seats"] == 0
        assert summary3["available_seats"] == 3
        assert summary3["occupancy_percentage"] == 50.0
