import logging
from redis.asyncio import Redis, from_url
from app.config import settings

logger = logging.getLogger(__name__)

redis_client: Redis | None = None


async def init_redis() -> None:
    """Initialize the connection pool for Redis."""
    global redis_client
    if redis_client is not None:
        return

    logger.info("Connecting to Redis...")
    redis_client = from_url(settings.REDIS_URL, decode_responses=True)
    # Ping to check connection
    await redis_client.ping()
    logger.info("Connected to Redis successfully.")


async def close_redis() -> None:
    """Close the Redis client connection."""
    global redis_client
    if redis_client:
        logger.info("Closing Redis connection...")
        await redis_client.aclose()
        redis_client = None
        logger.info("Redis connection closed.")


def get_redis_client() -> Redis:
    """Get the initialized Redis client instance."""
    if redis_client is None:
        raise RuntimeError("Redis client is not initialized.")
    return redis_client
