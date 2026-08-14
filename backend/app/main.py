from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import check_db_connection
from app.api.v1.events import router as events_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
