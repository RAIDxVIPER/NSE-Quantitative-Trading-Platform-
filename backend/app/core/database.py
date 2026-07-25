import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

logger = logging.getLogger(__name__)

engine = None
async_session_factory = None


async def init_db() -> None:
    """Initialize the asynchronous engine and session maker."""
    global engine, async_session_factory
    if engine is not None:
        return

    logger.info("Initializing database engine...")
    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        echo=settings.DEBUG,
    )
    async_session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    logger.info("Database engine initialized successfully.")


async def close_db() -> None:
    """Dispose of the database engine."""
    global engine
    if engine:
        logger.info("Closing database engine...")
        await engine.dispose()
        engine = None
        logger.info("Database engine closed.")


def get_db_session() -> AsyncSession:
    """Get a new database session instance dynamically."""
    if async_session_factory is None:
        raise RuntimeError("Database session factory is not initialized. Call init_db() first.")
    return async_session_factory()
