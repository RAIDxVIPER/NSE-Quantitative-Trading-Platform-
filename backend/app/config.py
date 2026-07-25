from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "NSE Analytics API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"    # development | staging | production
    
    # ── Server ──
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    
    # ── Database ──
    DATABASE_URL: str = "postgresql+asyncpg://nse:nse@localhost:5432/nse_analytics"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    
    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ── JWT ──
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ── Security ──
    BCRYPT_ROUNDS: int = 12
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15
    
    # ── Rate Limiting ──
    RATE_LIMIT_ENABLED: bool = True
    
    # ── Background Workers ──
    MARKET_POLL_INTERVAL_SECONDS: int = 15
    SECTOR_UPDATE_INTERVAL_SECONDS: int = 60
    NEWS_INGEST_INTERVAL_SECONDS: int = 600
    PORTFOLIO_SNAPSHOT_CRON: str = "30 15 * * 1-5"   # 3:30 PM IST, Mon-Fri
    
    # ── ML ──
    ML_PROCESS_POOL_SIZE: int = 4
    ML_DEFAULT_MC_SIMULATIONS: int = 50000
    YFINANCE_CACHE_TTL_SECONDS: int = 300

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
