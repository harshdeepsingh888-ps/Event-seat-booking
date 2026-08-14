import pytest
import pytest_asyncio
import asyncio
import uuid
import datetime
import os
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, event, text
from app.main import app
from app.models import Base, Event, Seat, Booking
from app.api.v1.events import get_db

TEST_DB_FILE = "./test_concurrency.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

@pytest_asyncio.fixture
async def test_session_factory():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

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

    async def override_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db

    yield session_factory

    app.dependency_overrides.clear()
    await engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except PermissionError:
            pass


@pytest.mark.asyncio
async def test_identical_seat_concurrent_bookings(test_session_factory):
    """10 simultaneous requests attempting to book the exact same seat A1."""
    event_id = str(uuid.uuid4())
    seat_id = str(uuid.uuid4())

    async with test_session_factory() as db:
        ev = Event(id=event_id, name="Concurrency Concert", event_date=datetime.datetime.now(), total_rows=1, total_cols=1)
        st = Seat(id=seat_id, event_id=event_id, row_number=1, column_number=1, seat_label="A1")
        db.add_all([ev, st])
        await db.commit()

    async def make_booking_request(user_index: int):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(
                f"/api/v1/events/{event_id}/bookings",
                json={
                    "booker_name": f"User{user_index}",
                    "booker_email": f"user{user_index}@example.com",
                    "seat_ids": [seat_id]
                }
            )
            return res.status_code

    tasks = [make_booking_request(i) for i in range(10)]
    results = await asyncio.gather(*tasks)

    successes = [code for code in results if code == 201]
    conflicts = [code for code in results if code == 409]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(conflicts) == 9, f"Expected 9 conflicts, got {len(conflicts)}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/api/v1/events/{event_id}")
        assert res.status_code == 200
        event_data = res.json()
        assert event_data["seats"][0]["status"] == "BOOKED"


@pytest.mark.asyncio
async def test_high_concurrency_stress_race(test_session_factory):
    """25 simultaneous requests targeting 1 seat."""
    event_id = str(uuid.uuid4())
    seat_id = str(uuid.uuid4())

    async with test_session_factory() as db:
        ev = Event(id=event_id, name="High Stress Race", event_date=datetime.datetime.now(), total_rows=1, total_cols=1)
        st = Seat(id=seat_id, event_id=event_id, row_number=1, column_number=1, seat_label="A1")
        db.add_all([ev, st])
        await db.commit()

    async def make_booking_request(user_index: int):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(
                f"/api/v1/events/{event_id}/bookings",
                json={
                    "booker_name": f"User{user_index}",
                    "booker_email": f"user{user_index}@example.com",
                    "seat_ids": [seat_id]
                }
            )
            return res.status_code

    tasks = [make_booking_request(i) for i in range(25)]
    results = await asyncio.gather(*tasks)

    successes = [c for c in results if c == 201]
    conflicts = [c for c in results if c == 409]

    assert len(successes) == 1
    assert len(conflicts) == 24


@pytest.mark.asyncio
async def test_multi_seat_concurrent_overlap(test_session_factory):
    """Transaction A requests [A1, A2], Transaction B requests [A2, A3]."""
    event_id = str(uuid.uuid4())
    s1_id = str(uuid.uuid4())
    s2_id = str(uuid.uuid4())
    s3_id = str(uuid.uuid4())

    async with test_session_factory() as db:
        ev = Event(id=event_id, name="Overlap Match", event_date=datetime.datetime.now(), total_rows=1, total_cols=3)
        s1 = Seat(id=s1_id, event_id=event_id, row_number=1, column_number=1, seat_label="A1")
        s2 = Seat(id=s2_id, event_id=event_id, row_number=1, column_number=2, seat_label="A2")
        s3 = Seat(id=s3_id, event_id=event_id, row_number=1, column_number=3, seat_label="A3")
        db.add_all([ev, s1, s2, s3])
        await db.commit()

    async def book_seats(user_name: str, seat_ids: list):
        email_user = user_name.replace(" ", "").lower()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            return await client.post(
                f"/api/v1/events/{event_id}/bookings",
                json={
                    "booker_name": user_name,
                    "booker_email": f"{email_user}@example.com",
                    "seat_ids": seat_ids
                }
            )

    req_a = book_seats("UserA", [s1_id, s2_id])
    req_b = book_seats("UserB", [s2_id, s3_id])

    res_a, res_b = await asyncio.gather(req_a, req_b)
    status_codes = [res_a.status_code, res_b.status_code]

    assert 201 in status_codes
    assert 409 in status_codes

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/api/v1/events/{event_id}")
        assert res.status_code == 200
        event_data = res.json()
        seat_map = {s["id"]: s["status"] for s in event_data["seats"]}
        assert seat_map[s2_id] == "BOOKED"


@pytest.mark.asyncio
async def test_atomic_multi_seat_rollback(test_session_factory):
    """Requesting [A1, A2, A3] when A3 is already booked MUST rollback A1 and A2."""
    event_id = str(uuid.uuid4())
    s1_id = str(uuid.uuid4())
    s2_id = str(uuid.uuid4())
    s3_id = str(uuid.uuid4())

    async with test_session_factory() as db:
        ev = Event(id=event_id, name="Atomic Rollback Test", event_date=datetime.datetime.now(), total_rows=1, total_cols=3)
        s1 = Seat(id=s1_id, event_id=event_id, row_number=1, column_number=1, seat_label="A1")
        s2 = Seat(id=s2_id, event_id=event_id, row_number=1, column_number=2, seat_label="A2")
        s3 = Seat(id=s3_id, event_id=event_id, row_number=1, column_number=3, seat_label="A3")
        db.add_all([ev, s1, s2, s3])

        # Pre-book A3
        pre_booking = Booking(id=str(uuid.uuid4()), event_id=event_id, seat_id=s3_id, booker_name="Early Bird", booker_email="early@example.com")
        db.add(pre_booking)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={
                "booker_name": "Group Booker",
                "booker_email": "group@example.com",
                "seat_ids": [s1_id, s2_id, s3_id]
            }
        )
        assert res.status_code == 409

    # Verify A1 and A2 remain unbooked
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/api/v1/events/{event_id}")
        assert res.status_code == 200
        event_data = res.json()
        seat_map = {s["id"]: s["status"] for s in event_data["seats"]}
        assert seat_map[s1_id] == "AVAILABLE"
        assert seat_map[s2_id] == "AVAILABLE"
        assert seat_map[s3_id] == "BOOKED"


@pytest.mark.asyncio
async def test_blocked_seat_booking_rejection(test_session_factory):
    """Attempting to book a blocked seat MUST fail with 409 Conflict."""
    event_id = str(uuid.uuid4())
    seat_id = str(uuid.uuid4())

    async with test_session_factory() as db:
        ev = Event(id=event_id, name="Blocked Show", event_date=datetime.datetime.now(), total_rows=1, total_cols=1)
        st = Seat(id=seat_id, event_id=event_id, row_number=1, column_number=1, seat_label="A1", is_blocked=True)
        db.add_all([ev, st])
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={
                "booker_name": "VIP Seeker",
                "booker_email": "vip@example.com",
                "seat_ids": [seat_id]
            }
        )
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_duplicate_seat_ids_validation(test_session_factory):
    """Duplicate seat_ids in payload MUST trigger 422 Unprocessable Entity."""
    event_id = str(uuid.uuid4())
    seat_id = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            f"/api/v1/events/{event_id}/bookings",
            json={
                "booker_name": "User",
                "booker_email": "user@example.com",
                "seat_ids": [seat_id, seat_id]
            }
        )
        assert res.status_code == 422
