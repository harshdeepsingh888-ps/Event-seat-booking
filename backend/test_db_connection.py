import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT DATABASE(), USER()")
            )
            print("DATABASE CONNECTION SUCCESS:")
            print(result.fetchone())
    except Exception as exc:
        print("DATABASE CONNECTION FAILED:")
        print(type(exc).__name__)
        print(exc)

asyncio.run(main())
