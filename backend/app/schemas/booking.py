from datetime import datetime
from typing import List
from pydantic import BaseModel, EmailStr, Field, field_validator

class BookingCreate(BaseModel):
    booker_name: str = Field(..., min_length=1, max_length=255, description="Booker's full name")
    booker_email: EmailStr = Field(..., description="Booker's email address")
    seat_ids: List[str] = Field(..., min_length=1, description="List of seat UUIDs to book")

    @field_validator("booker_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Booker name cannot be empty or whitespace")
        return v.strip()

    @field_validator("seat_ids")
    @classmethod
    def validate_seat_ids(cls, v: List[str]) -> List[str]:
        if len(v) != len(set(v)):
            raise ValueError("Duplicate seat IDs in a single booking request are not allowed")
        return v

class BookingResponse(BaseModel):
    booking_ids: List[str]
    event_id: str
    booker_name: str
    booker_email: str
    seat_ids: List[str]
    seat_labels: List[str]
    created_at: datetime

class BookingHistoryItem(BaseModel):
    booking_id: str
    booker_name: str
    booker_email: str
    seat_ids: List[str]
    seat_labels: List[str]
    created_at: datetime

class BookingHistoryResponse(BaseModel):
    event_id: str
    total_bookings: int
    bookings: List[BookingHistoryItem]

