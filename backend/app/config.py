import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_FILE = BACKEND_DIR / "predictor.db"

class Settings(BaseSettings):
    APP_NAME: str = "Student Academic Performance & Dropout Risk Predictor"
    # ⚠️ Development fallback only. In production, always set SECRET_KEY via env / .env.
    SECRET_KEY: str = "dev-only-insecure-secret-key-change-before-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"

    # ML model path
    MODEL_DIR: str = str(Path(__file__).resolve().parent / "ml" / "models")

    # Email stub
    EMAIL_STUB_ENABLED: bool = True

    # Fairness & Privacy ML Settings
    EXCLUDE_SENSITIVE_FEATURES: bool = True

    # Attendance Settings
    ATTENDANCE_THRESHOLD_PERCENT: float = 75.0

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **values):
        super().__init__(**values)
        # If DATABASE_URL is an SQLite URI with a relative path, resolve it relative to BACKEND_DIR
        if self.DATABASE_URL.startswith("sqlite:///"):
            raw_path = self.DATABASE_URL[len("sqlite:///"):]
            p = Path(raw_path)
            if not p.is_absolute():
                resolved = (BACKEND_DIR / p).resolve()
                self.DATABASE_URL = f"sqlite:///{resolved.as_posix()}"

    @property
    def resolved_db_path(self) -> str:
        if self.DATABASE_URL.startswith("sqlite:///"):
            return self.DATABASE_URL[len("sqlite:///"):]
        return self.DATABASE_URL

settings = Settings()
