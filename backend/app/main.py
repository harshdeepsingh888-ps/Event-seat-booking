from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User
from app.core.security import hash_password
from app.api.v1.events import router as events_router
from app.api.v1.auth import router as auth_router
from app.models import Base
from app.db.session import check_db_connection, AsyncSessionLocal, engine

async def ensure_default_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            new_admin = User(
                email="admin@example.com",
                hashed_password=hash_password("adminpassword123"),
                full_name="System Administrator",
                role="ADMIN"
            )
            session.add(new_admin)
            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_default_admin()
    except Exception as e:
        print(f"[SEED WARNING] Default admin check: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    db_ok = await check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "api": "online",
        "database": "connected" if db_ok else "disconnected",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
