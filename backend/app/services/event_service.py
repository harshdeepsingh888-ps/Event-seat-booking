import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.event import Event
from app.models.seat import Seat
from app.models.booking import Booking
from app.schemas.event import EventCreate, EventResponse, EventDetailResponse, SeatResponse, SeatBlockRequest, EventSummaryResponse

def generate_row_label(row_num: int) -> str:

    """Converts 1-based row index to deterministic row label (1 -> A, 26 -> Z, 27 -> AA)."""
    result = ""
    while row_num > 0:
        row_num -= 1
        result = chr(65 + (row_num % 26)) + result
        row_num //= 26
    return result

class EventService:
    @staticmethod
    async def create_event(db: AsyncSession, payload: EventCreate) -> EventResponse:
        """Atomic event creation and seat grid generation within one transaction boundary."""
        event_id = str(uuid.uuid4())
        new_event = Event(
            id=event_id,
            name=payload.name,
            event_date=payload.event_date,
            total_rows=payload.total_rows,
            total_cols=payload.total_cols
        )
        db.add(new_event)

        # Generate seat grid deterministically
        seats_to_create = []
        for r in range(1, payload.total_rows + 1):
            row_label = generate_row_label(r)
            for c in range(1, payload.total_cols + 1):
                seat_label = f"{row_label}{c}"
                seat = Seat(
                    id=str(uuid.uuid4()),
                    event_id=event_id,
                    row_number=r,
                    column_number=c,
                    seat_label=seat_label,
                    is_blocked=False
                )
                seats_to_create.append(seat)

        db.add_all(seats_to_create)
        await db.commit()
        await db.refresh(new_event)

        return EventResponse(
            id=new_event.id,
            name=new_event.name,
            event_date=new_event.event_date,
            total_rows=new_event.total_rows,
            total_cols=new_event.total_cols,
            created_at=new_event.created_at
        )

    @staticmethod
    async def list_events(db: AsyncSession) -> List[EventResponse]:
        """Lightweight event list retrieval without heavy seat grids."""
        result = await db.execute(select(Event).order_by(Event.event_date.asc()))
        events = result.scalars().all()
        return [
            EventResponse(
                id=e.id,
                name=e.name,
                event_date=e.event_date,
                total_rows=e.total_rows,
                total_cols=e.total_cols,
                created_at=e.created_at
            ) for e in events
        ]

    @staticmethod
    async def get_event_detail(db: AsyncSession, event_id: str) -> EventDetailResponse:
        """Retrieves event details and derives seat states (AVAILABLE, BOOKED, BLOCKED)."""
        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

        seats_res = await db.execute(
            select(Seat).where(Seat.event_id == event_id).order_by(Seat.row_number.asc(), Seat.column_number.asc())
        )
        seats = seats_res.scalars().all()

        bookings_res = await db.execute(
            select(Booking.seat_id).where(Booking.event_id == event_id)
        )
        booked_seat_ids = set(bookings_res.scalars().all())

        seat_responses = []
        booked_count = 0
        blocked_count = 0
        available_count = 0

        for s in seats:
            is_booked = s.id in booked_seat_ids
            if s.is_blocked:
                derived_status = "BLOCKED"
                blocked_count += 1
            elif is_booked:
                derived_status = "BOOKED"
                booked_count += 1
            else:
                derived_status = "AVAILABLE"
                available_count += 1

            seat_responses.append(
                SeatResponse(
                    id=s.id,
                    event_id=s.event_id,
                    row_number=s.row_number,
                    column_number=s.column_number,
                    seat_label=s.seat_label,
                    is_blocked=s.is_blocked,
                    is_booked=is_booked,
                    status=derived_status
                )
            )

        return EventDetailResponse(
            id=event.id,
            name=event.name,
            event_date=event.event_date,
            total_rows=event.total_rows,
            total_cols=event.total_cols,
            created_at=event.created_at,
            seats=seat_responses,
            total_seats=len(seats),
            booked_seats=booked_count,
            blocked_seats=blocked_count,
            available_seats=available_count
        )

    @staticmethod
    async def block_unblock_seats(db: AsyncSession, event_id: str, payload: SeatBlockRequest) -> EventDetailResponse:
        """Blocks or unblocks targeted seats. Rejects blocking already booked seats (409 Conflict)."""
        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

        seats_res = await db.execute(
            select(Seat).where(Seat.id.in_(payload.seat_ids))
        )
        target_seats = seats_res.scalars().all()

        if len(target_seats) != len(set(payload.seat_ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more specified seat IDs do not exist"
            )

        # Cross-event check: all seats MUST belong to specified event_id
        mismatched_seats = [s.id for s in target_seats if s.event_id != event_id]
        if mismatched_seats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat(s) {mismatched_seats} do not belong to event '{event_id}'"
            )

        # Reject blocking booked seats
        if payload.blocked:
            booked_res = await db.execute(
                select(Booking.seat_id).where(Booking.seat_id.in_(payload.seat_ids))
            )
            booked_target_ids = set(booked_res.scalars().all())
            if booked_target_ids:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot block seat(s) {list(booked_target_ids)} because they are already booked."
                )

        for s in target_seats:
            s.is_blocked = payload.blocked

        await db.commit()
        return await EventService.get_event_detail(db, event_id)

    @staticmethod
    async def get_event_summary(db: AsyncSession, event_id: str) -> EventSummaryResponse:
        """Retrieves real-time event seating summary and occupancy statistics."""
        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

        # 1. Total seats count
        total_res = await db.execute(select(func.count(Seat.id)).where(Seat.event_id == event_id))
        total_seats = total_res.scalar() or 0

        # 2. Blocked seats count
        blocked_res = await db.execute(
            select(func.count(Seat.id)).where(Seat.event_id == event_id, Seat.is_blocked == True)
        )
        blocked_seats = blocked_res.scalar() or 0

        # 3. Booked seats count
        booked_res = await db.execute(
            select(func.count(Booking.id)).where(Booking.event_id == event_id)
        )
        booked_seats = booked_res.scalar() or 0

        # 4. Derived available seats count
        available_seats = total_seats - booked_seats - blocked_seats

        # 5. Occupancy percentage calculation
        occupancy = round((booked_seats / total_seats) * 100.0, 2) if total_seats > 0 else 0.0

        return EventSummaryResponse(
            event_id=event.id,
            event_name=event.name,
            total_seats=total_seats,
            available_seats=available_seats,
            booked_seats=booked_seats,
            blocked_seats=blocked_seats,
            occupancy_percentage=occupancy,
            total_revenue=0.0
        )

