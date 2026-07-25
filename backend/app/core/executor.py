import asyncio
import logging
from concurrent.futures import ProcessPoolExecutor
from app.config import settings

logger = logging.getLogger(__name__)

_pool: ProcessPoolExecutor | None = None


def get_process_pool() -> ProcessPoolExecutor:
    """Lazy initialize the process pool executor."""
    global _pool
    if _pool is None:
        logger.info(f"Initializing ProcessPoolExecutor with max_workers={settings.ML_PROCESS_POOL_SIZE}...")
        _pool = ProcessPoolExecutor(max_workers=settings.ML_PROCESS_POOL_SIZE)
    return _pool


async def run_cpu_bound(func, *args):
    """Run a CPU-bound function in a separate OS process to prevent event loop blocking."""
    loop = asyncio.get_running_loop()
    pool = get_process_pool()
    return await loop.run_in_executor(pool, func, *args)


def shutdown_pool() -> None:
    """Shutdown the process pool executor synchronously."""
    global _pool
    if _pool:
        logger.info("Shutting down ProcessPoolExecutor...")
        _pool.shutdown(wait=True)
        _pool = None
        logger.info("ProcessPoolExecutor shutdown complete.")
