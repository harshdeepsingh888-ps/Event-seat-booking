import pytest
import pytest_asyncio
import datetime
import uuid
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, event, text
from app.models import Base, Event, Seat, Booking

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


@pytest.mark.asyncio
async def test_seat_uniqueness_within_same_event(test_session: AsyncSession):
    """Test 1: A seat cannot be duplicated within the same event (event_id, row, col)."""
    event = Event(id=str(uuid.uuid4()), name="Concert A", event_date=datetime.datetime.now())
    test_session.add(event)
    await test_session.commit()

    seat1 = Seat(id=str(uuid.uuid4()), event_id=event.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat1)
    await test_session.commit()

    # Attempt to insert duplicate seat (row 1, col 1) for same event
    seat2 = Seat(id=str(uuid.uuid4()), event_id=event.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat2)
    with pytest.raises(IntegrityError):
        await test_session.commit()


@pytest.mark.asyncio
async def test_same_seat_position_in_different_events(test_session: AsyncSession):
    """Test 2: The same seat position (Row 1, Col 1) CAN exist in another event."""
    event1 = Event(id=str(uuid.uuid4()), name="Concert A", event_date=datetime.datetime.now())
    event2 = Event(id=str(uuid.uuid4()), name="Concert B", event_date=datetime.datetime.now())
    test_session.add_all([event1, event2])
    await test_session.commit()

    seat_e1 = Seat(id=str(uuid.uuid4()), event_id=event1.id, row_number=1, column_number=1, seat_label="A1")
    seat_e2 = Seat(id=str(uuid.uuid4()), event_id=event2.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add_all([seat_e1, seat_e2])
    await test_session.commit()

    res1 = await test_session.execute(select(Seat).where(Seat.event_id == event1.id))
    res2 = await test_session.execute(select(Seat).where(Seat.event_id == event2.id))
    assert len(res1.scalars().all()) == 1
    assert len(res2.scalars().all()) == 1


@pytest.mark.asyncio
async def test_seat_foreign_key_to_event(test_session: AsyncSession):
    """Test 3: A seat must reference a valid event."""
    fake_event_id = str(uuid.uuid4())
    seat = Seat(id=str(uuid.uuid4()), event_id=fake_event_id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat)
    with pytest.raises(IntegrityError):
        await test_session.commit()


@pytest.mark.asyncio
async def test_booking_valid_references(test_session: AsyncSession):
    """Test 4: A booking must reference valid event and seat records."""
    event = Event(id=str(uuid.uuid4()), name="Concert A", event_date=datetime.datetime.now())
    test_session.add(event)
    await test_session.commit()

    seat = Seat(id=str(uuid.uuid4()), event_id=event.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat)
    await test_session.commit()

    booking = Booking(
        id=str(uuid.uuid4()),
        event_id=event.id,
        seat_id=seat.id,
        booker_name="Harshdeep Singh",
        booker_email="harsh@example.com"
    )
    test_session.add(booking)
    await test_session.commit()

    b = (await test_session.execute(select(Booking).where(Booking.id == booking.id))).scalar_one()
    assert b.booker_name == "Harshdeep Singh"
    assert b.seat_id == seat.id


@pytest.mark.asyncio
async def test_duplicate_booking_prevention(test_session: AsyncSession):
    """Test 5: The database rejects duplicate booking of the same event seat."""
    event = Event(id=str(uuid.uuid4()), name="Concert A", event_date=datetime.datetime.now())
    test_session.add(event)
    await test_session.commit()

    seat = Seat(id=str(uuid.uuid4()), event_id=event.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat)
    await test_session.commit()

    booking1 = Booking(
        id=str(uuid.uuid4()),
        event_id=event.id,
        seat_id=seat.id,
        booker_name="User 1",
        booker_email="user1@example.com"
    )
    test_session.add(booking1)
    await test_session.commit()

    booking2 = Booking(
        id=str(uuid.uuid4()),
        event_id=event.id,
        seat_id=seat.id,
        booker_name="User 2",
        booker_email="user2@example.com"
    )
    test_session.add(booking2)
    with pytest.raises(IntegrityError):
        await test_session.commit()


@pytest.mark.asyncio
async def test_cross_event_mismatch_prevention(test_session: AsyncSession):
    """Test 6: Booking event_id MUST match seat event_id."""
    event1 = Event(id=str(uuid.uuid4()), name="Concert A", event_date=datetime.datetime.now())
    event2 = Event(id=str(uuid.uuid4()), name="Concert B", event_date=datetime.datetime.now())
    test_session.add_all([event1, event2])
    await test_session.commit()

    seat_e1 = Seat(id=str(uuid.uuid4()), event_id=event1.id, row_number=1, column_number=1, seat_label="A1")
    test_session.add(seat_e1)
    await test_session.commit()

    # Mismatch: Booking for Event B using a seat from Event A
    mismatch_booking = Booking(
        id=str(uuid.uuid4()),
        event_id=event2.id, # Event B
        seat_id=seat_e1.id, # Seat from Event A
        booker_name="Bad User",
        booker_email="bad@example.com"
    )
    test_session.add(mismatch_booking)
    with pytest.raises(IntegrityError):
        await test_session.commit()
