from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import init_db, close_db
from app.core.redis import init_redis, close_redis
from app.core.executor import shutdown_pool
from app.core.exceptions import register_exception_handlers
from app.core.middleware import (
    RequestIdMiddleware,
    TimingMiddleware,
    RateLimitMiddleware,
)
from app.routers import health, market, stock, indicators
from app.workers.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to orchestrate startup and shutdown connections."""
    # ── STARTUP ──
    await init_db()
    try:
        await init_redis()
    except Exception:
        pass
    
    # Start scheduler for background workers
    scheduler = await start_scheduler()
    
    yield

    # ── SHUTDOWN ──
    await stop_scheduler(scheduler)
    shutdown_pool()
    await close_redis()
    await close_db()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (applied bottom-up) ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id", "X-Response-Time"],
    )
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(TimingMiddleware)

    # Register customized validation and application exception handlers
    register_exception_handlers(app)

    # Register Routers
    app.include_router(health.router, prefix="/api", tags=["Health"])
    app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
    app.include_router(stock.router, prefix="/api", tags=["Stock Data"])
    app.include_router(indicators.router, prefix="/api", tags=["Indicators"])

    return app


app = create_app()


def run_dev():
    """Development server entry point."""
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
