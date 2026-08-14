import asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event, text
from app.main import app
from app.models import Base
from app.api.v1.events import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

async def verify_apis():
    print("=== STARTING STEP 4 MANUAL API VERIFICATION ===")
    
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

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health
        h_res = await client.get("/health")
        print("1. GET /health ->", h_res.status_code, h_res.json()["api"])
        assert h_res.status_code == 200

        # 2. Create Event
        c_res = await client.post("/api/v1/events", json={
            "name": "NeuBitAt Keynote 2026",
            "event_date": "2026-09-20T10:00:00",
            "total_rows": 2,
            "total_cols": 3
        })
        print("2. POST /api/v1/events ->", c_res.status_code, "ID:", c_res.json()["id"])
        assert c_res.status_code == 201
        event_id = c_res.json()["id"]

        # 3. List Events
        l_res = await client.get("/api/v1/events")
        print("3. GET /api/v1/events ->", l_res.status_code, "Count:", len(l_res.json()))
        assert l_res.status_code == 200

        # 4. Get Event Detail & Seat Map
        d_res = await client.get(f"/api/v1/events/{event_id}")
        print("4. GET /api/v1/events/{id} ->", d_res.status_code, "Total seats:", d_res.json()["total_seats"])
        assert d_res.status_code == 200
        seats = d_res.json()["seats"]
        target_seat_id = seats[0]["id"]
        print("   First seat:", seats[0]["seat_label"], "Status:", seats[0]["status"])

        # 5. Block Seat
        b_res = await client.patch(f"/api/v1/events/{event_id}/seats/block", json={
            "seat_ids": [target_seat_id],
            "blocked": True
        })
        print("5. PATCH /api/v1/events/{id}/seats/block (Block) ->", b_res.status_code)
        assert b_res.status_code == 200
        blocked_seat = next(s for s in b_res.json()["seats"] if s["id"] == target_seat_id)
        print("   Blocked seat status:", blocked_seat["status"])
        assert blocked_seat["status"] == "BLOCKED"

        # 6. Unblock Seat
        u_res = await client.patch(f"/api/v1/events/{event_id}/seats/block", json={
            "seat_ids": [target_seat_id],
            "blocked": False
        })
        print("6. PATCH /api/v1/events/{id}/seats/block (Unblock) ->", u_res.status_code)
        assert u_res.status_code == 200
        unblocked_seat = next(s for s in u_res.json()["seats"] if s["id"] == target_seat_id)
        print("   Unblocked seat status:", unblocked_seat["status"])
        assert unblocked_seat["status"] == "AVAILABLE"

    app.dependency_overrides.clear()
    await engine.dispose()
    print("=== STEP 4 MANUAL API VERIFICATION PASSED ===")

if __name__ == "__main__":
    asyncio.run(verify_apis())
