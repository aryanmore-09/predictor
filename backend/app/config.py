import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Student Academic Performance & Dropout Risk Predictor"
    SECRET_KEY: str = "mit-cse-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    DATABASE_URL: str = "sqlite:///./predictor.db"

    # ML model path
    MODEL_DIR: str = os.path.join(os.path.dirname(__file__), "ml", "models")

    # Email stub
    EMAIL_STUB_ENABLED: bool = True

    # Fairness & Privacy ML Settings
    EXCLUDE_SENSITIVE_FEATURES: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
