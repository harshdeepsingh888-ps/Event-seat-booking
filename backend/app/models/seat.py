import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    column_number: Mapped[int] = mapped_column(Integer, nullable=False)
    seat_label: Mapped[str] = mapped_column(String(20), nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    event: Mapped["Event"] = relationship("Event", back_populates="seats")
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="seat", foreign_keys="[Booking.seat_id]", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "row_number", "column_number", name="uq_event_row_col"),
        UniqueConstraint("event_id", "id", name="uq_seat_event_id"),
        Index("ix_seats_event_id", "event_id"),
    )
