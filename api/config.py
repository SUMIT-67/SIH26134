from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "AIRFARE-INDEX"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/airfare.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Collector
    MOCK_MODE: bool = True
    SCRAPE_INTERVAL_SECONDS: int = 60
    RAW_SNAPSHOT_DIR: str = str(BASE_DIR / "data" / "raw_snapshots")
    AIRPORTS_JSON_PATH: str = str(BASE_DIR / "data" / "airports.json")
    ROUTES_JSON_PATH: str = str(BASE_DIR / "data" / "routes.json")

    # Thresholds
    Z_SCORE_SPIKE_THRESHOLD: float = 2.5
    PCT_SPIKE_THRESHOLD: float = 0.20
    OUTLIER_Z_THRESHOLD: float = 3.0
    IQR_MULTIPLIER: float = 1.5

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
