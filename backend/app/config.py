import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Student Academic Performance & Dropout Risk Predictor"
    # ⚠️ Development fallback only. In production, always set SECRET_KEY via env / .env.
    SECRET_KEY: str = "dev-only-insecure-secret-key-change-before-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    DATABASE_URL: str = "sqlite:///./predictor.db"

    # ML model path
    MODEL_DIR: str = os.path.join(os.path.dirname(__file__), "ml", "models")

    # Email stub
    EMAIL_STUB_ENABLED: bool = True

    # Fairness & Privacy ML Settings
    EXCLUDE_SENSITIVE_FEATURES: bool = True

    # Attendance Settings
    ATTENDANCE_THRESHOLD_PERCENT: float = 75.0

    class Config:
        env_file = ".env"

settings = Settings()
