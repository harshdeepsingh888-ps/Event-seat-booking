import uuid
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.event import Event
from app.models.seat import Seat
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse, BookingHistoryItem, BookingHistoryResponse

class BookingService:

    @staticmethod
    async def create_booking(db: AsyncSession, event_id: str, payload: BookingCreate) -> BookingResponse:
        """
        Concurrency-safe atomic multi-seat booking implementation.
        Uses pessimistic row locking (SELECT ... FOR UPDATE) and deterministic lock ordering.
        """
        # 1. Check Event Existence
        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

        # 2. Sort seat_ids deterministically to prevent cross-transaction deadlocks
        sorted_seat_ids = sorted(payload.seat_ids)

        try:
            # 3. Acquire Exclusive Row Locks via SELECT ... FOR UPDATE
            stmt = (
                select(Seat)
                .where(
                    Seat.event_id == event_id,
                    Seat.id.in_(sorted_seat_ids)
                )
                .with_for_update()
            )
            locked_seats_res = await db.execute(stmt)
            locked_seats = locked_seats_res.scalars().all()

            # 4. Validate Locked Seat Count & Seat Ownership
            if len(locked_seats) != len(sorted_seat_ids):
                existing_ids = {s.id for s in locked_seats}
                missing_ids = set(sorted_seat_ids) - existing_ids
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Seat(s) {list(missing_ids)} do not exist or do not belong to event '{event_id}'"
                )

            # 5. Validate Administrative Blocking
            blocked_seats = [s.seat_label for s in locked_seats if s.is_blocked]
            if blocked_seats:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Seat(s) {blocked_seats} are blocked by administration and cannot be booked"
                )

            # 6. Atomic Availability Check for locked seats
            booked_res = await db.execute(
                select(Booking.seat_id).where(Booking.seat_id.in_(sorted_seat_ids))
            )
            already_booked_seat_ids = set(booked_res.scalars().all())

            if already_booked_seat_ids:
                already_booked_labels = [
                    s.seat_label for s in locked_seats if s.id in already_booked_seat_ids
                ]
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Seat(s) {already_booked_labels} are already booked by another user"
                )

            # 7. Create Booking Records for all requested seats atomically
            new_bookings = []
            seat_labels = []
            booking_ids = []
            now = datetime.now(timezone.utc)

            for seat in locked_seats:
                b_id = str(uuid.uuid4())
                booking = Booking(
                    id=b_id,
                    event_id=event_id,
                    seat_id=seat.id,
                    booker_name=payload.booker_name,
                    booker_email=payload.booker_email,
                    created_at=now
                )
                new_bookings.append(booking)
                booking_ids.append(b_id)
                seat_labels.append(seat.seat_label)

            db.add_all(new_bookings)
            await db.commit()

            return BookingResponse(
                booking_ids=booking_ids,
                event_id=event_id,
                booker_name=payload.booker_name,
                booker_email=payload.booker_email,
                seat_ids=[s.id for s in locked_seats],
                seat_labels=seat_labels,
                created_at=now
            )

        except HTTPException:
            await db.rollback()
            raise
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking transaction failed due to concurrent database conflict"
            )

    @staticmethod
    async def get_event_booking_history(db: AsyncSession, event_id: str) -> BookingHistoryResponse:
        """
        Retrieves chronological booking history for an event (newest first).
        Groups multi-seat bookings made within the same transaction into a single BookingHistoryItem.
        Avoids N+1 queries using a single JOIN query.
        """
        event_res = await db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

        stmt = (
            select(Booking, Seat.seat_label)
            .join(Seat, Booking.seat_id == Seat.id)
            .where(Booking.event_id == event_id)
            .order_by(Booking.created_at.desc(), Booking.id.asc())
        )
        rows = (await db.execute(stmt)).all()

        grouped = {}
        for booking, seat_label in rows:
            group_key = (booking.booker_email, booking.created_at, booking.booker_name)
            if group_key not in grouped:
                grouped[group_key] = {
                    "booking_id": booking.id,
                    "booker_name": booking.booker_name,
                    "booker_email": booking.booker_email,
                    "seat_ids": [],
                    "seat_labels": [],
                    "created_at": booking.created_at
                }
            grouped[group_key]["seat_ids"].append(booking.seat_id)
            grouped[group_key]["seat_labels"].append(seat_label)

        items = [BookingHistoryItem(**item_dict) for item_dict in grouped.values()]
        return BookingHistoryResponse(
            event_id=event_id,
            total_bookings=len(items),
            bookings=items
        )

