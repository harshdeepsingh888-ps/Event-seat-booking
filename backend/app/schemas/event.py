from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class EventCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Event name")
    event_date: datetime = Field(..., description="Event start date and time")
    total_rows: int = Field(..., ge=1, le=50, description="Total rows (1 to 50)")
    total_cols: int = Field(..., ge=1, le=50, description="Total columns (1 to 50)")

    @field_validator("name")
    @classmethod
    def validate_name_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Event name cannot be empty or only whitespace")
        return v.strip()

class SeatResponse(BaseModel):
    id: str
    event_id: str
    row_number: int
    column_number: int
    seat_label: str
    is_blocked: bool
    is_booked: bool
    status: str  # "AVAILABLE", "BOOKED", "BLOCKED"

class EventResponse(BaseModel):
    id: str
    name: str
    event_date: datetime
    total_rows: int
    total_cols: int
    created_at: datetime

class EventDetailResponse(EventResponse):
    seats: List[SeatResponse] = []
    total_seats: int
    booked_seats: int
    blocked_seats: int
    available_seats: int

class SeatBlockRequest(BaseModel):
    seat_ids: List[str] = Field(..., min_length=1, description="List of seat UUIDs to block or unblock")
    blocked: bool = Field(..., description="True to block, False to unblock")

class EventSummaryResponse(BaseModel):
    event_id: str
    event_name: str
    total_seats: int
    available_seats: int
    booked_seats: int
    blocked_seats: int
    occupancy_percentage: float
    total_revenue: float = 0.0

