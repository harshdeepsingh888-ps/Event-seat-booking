from datetime import datetime
import uuid
from sqlalchemy import String, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_cols: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    seats: Mapped[list["Seat"]] = relationship("Seat", back_populates="event", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="event", cascade="all, delete-orphan")
