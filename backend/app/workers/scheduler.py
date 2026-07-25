import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.config import settings
from app.workers.market_poller import poll_market_data
from app.workers.sector_updater import update_sectors

logger = logging.getLogger(__name__)

scheduler: AsyncIOScheduler | None = None


async def start_scheduler() -> AsyncIOScheduler:
    """Initialize and start background task scheduler (APScheduler)."""
    global scheduler
    if scheduler is not None:
        return scheduler

    logger.info("Initializing APScheduler...")
    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # 1. Register Market Data Poller Job
    scheduler.add_job(
        poll_market_data,
        trigger=IntervalTrigger(seconds=settings.MARKET_POLL_INTERVAL_SECONDS),
        id="market_poller",
        name="Market Data Poller",
        max_instances=1,
        replace_existing=True,
    )

    # 2. Register Sector Updater Job
    scheduler.add_job(
        update_sectors,
        trigger=IntervalTrigger(seconds=settings.SECTOR_UPDATE_INTERVAL_SECONDS),
        id="sector_updater",
        name="Sector Updater",
        max_instances=1,
        replace_existing=True,
    )

    scheduler.start()
    logger.info("APScheduler started successfully.")

    # 3. Trigger immediate poll and update tasks on start to seed cache
    asyncio.create_task(poll_market_data())
    asyncio.create_task(update_sectors())

    return scheduler


async def stop_scheduler(sched: AsyncIOScheduler = None) -> None:
    """Shutdown background task scheduler."""
    global scheduler
    s = sched or scheduler
    if s and s.running:
        logger.info("Stopping APScheduler...")
        s.shutdown(wait=True)
        scheduler = None
        logger.info("APScheduler stopped.")
