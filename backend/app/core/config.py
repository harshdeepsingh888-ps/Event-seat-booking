from pydantic_settings import BaseSettings, SettingsConfigDict
import urllib.parse

class Settings(BaseSettings):
    PROJECT_NAME: str = "Event Seat Booking System API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # MySQL Database Settings
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "neubit_event_booking"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        pwd = urllib.parse.quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ""
        pwd_part = f":{pwd}" if pwd else ""
        return f"mysql+aiomysql://{self.DB_USER}{pwd_part}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
