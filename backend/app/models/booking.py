from datetime import datetime
import uuid
from sqlalchemy import String, DateTime, ForeignKey, ForeignKeyConstraint, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    seat_id: Mapped[str] = mapped_column(String(36), ForeignKey("seats.id", ondelete="CASCADE"), nullable=False)
    booker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    booker_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    event: Mapped["Event"] = relationship("Event", back_populates="bookings", foreign_keys="[Booking.event_id]")
    seat: Mapped["Seat"] = relationship("Seat", back_populates="bookings", foreign_keys="[Booking.seat_id]")

    __table_args__ = (
        UniqueConstraint("event_id", "seat_id", name="uq_booking_event_seat"),
        UniqueConstraint("seat_id", name="uq_booking_seat_id"),
        ForeignKeyConstraint(
            ["event_id", "seat_id"],
            ["seats.event_id", "seats.id"],
            name="fk_booking_seat_event_match",
            ondelete="CASCADE"
        ),
        Index("ix_bookings_event_id", "event_id"),
        Index("ix_bookings_seat_id", "seat_id"),
    )
