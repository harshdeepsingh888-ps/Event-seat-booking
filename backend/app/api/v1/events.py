from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.schemas.event import EventCreate, EventResponse, EventDetailResponse, SeatBlockRequest, EventSummaryResponse
from app.schemas.booking import BookingCreate, BookingResponse, BookingHistoryResponse
from app.services.event_service import EventService
from app.services.booking_service import BookingService

router = APIRouter(prefix="/events", tags=["Events"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    return await EventService.create_event(db, payload)

@router.get("", response_model=List[EventResponse], status_code=status.HTTP_200_OK)
async def list_events(db: AsyncSession = Depends(get_db)):
    return await EventService.list_events(db)

@router.get("/{event_id}", response_model=EventDetailResponse, status_code=status.HTTP_200_OK)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    return await EventService.get_event_detail(db, event_id)

@router.get("/{event_id}/summary", response_model=EventSummaryResponse, status_code=status.HTTP_200_OK)
async def get_event_summary(event_id: str, db: AsyncSession = Depends(get_db)):
    return await EventService.get_event_summary(db, event_id)

@router.get("/{event_id}/bookings", response_model=BookingHistoryResponse, status_code=status.HTTP_200_OK)
async def get_event_bookings(event_id: str, db: AsyncSession = Depends(get_db)):
    return await BookingService.get_event_booking_history(db, event_id)

@router.patch("/{event_id}/seats/block", response_model=EventDetailResponse, status_code=status.HTTP_200_OK)
async def block_seats(event_id: str, payload: SeatBlockRequest, db: AsyncSession = Depends(get_db)):
    return await EventService.block_unblock_seats(db, event_id, payload)

@router.post("/{event_id}/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(event_id: str, payload: BookingCreate, db: AsyncSession = Depends(get_db)):
    return await BookingService.create_booking(db, event_id, payload)

