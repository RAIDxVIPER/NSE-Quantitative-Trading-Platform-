from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_redis

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def liveness():
    """Liveness probe to check if the process is alive."""
    return {"status": "ok"}


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Readiness probe checking database and redis connection states."""
    db_ok = False
    redis_ok = False

    try:
        # Run simple query to verify postgres connectivity
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        # DB failed query check
        pass

    try:
        # Run ping command to verify Redis connectivity
        await redis.ping()
        redis_ok = True
    except Exception:
        # Redis failed ping check
        pass

    if not db_ok or not redis_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "database": "connected" if db_ok else "disconnected",
                "redis": "connected" if redis_ok else "disconnected"
            }
        )

    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected"
    }
