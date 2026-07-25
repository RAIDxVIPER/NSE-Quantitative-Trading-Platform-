import logging
import orjson
import random
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.database import get_db_session
from app.core.redis import get_redis_client
from app.models.market import MarketTickerCache, MarketSectorCache

logger = logging.getLogger(__name__)

# Tracked stock to sector mappings
STOCK_SECTOR_MAP = {
    "TCS": "IT",
    "INFY": "IT",
    "WIPRO": "IT",
    "HDFCBANK": "Pvt Bank",
    "ICICIBANK": "Pvt Bank",
    "KOTAKBANK": "Pvt Bank",
    "SBIN": "PSU Bank",
    "BAJFINANCE": "Banking",
    "RELIANCE": "Energy",
    "ITC": "FMCG",
    "HINDUNILVR": "FMCG",
    "LT": "Infra",
    "BHARTIARTL": "Telecom"
}

# Entire list of seeded sectors
ALL_SECTORS = [
    "IT", "Banking", "Pharma", "FMCG", "Auto", "Metal", 
    "Realty", "Energy", "Media", "Infra", "PSU Bank", "Pvt Bank"
]


async def update_sectors() -> None:
    """
    Compute and update sector performances.
    1. Read individual stock price changes from the database cache.
    2. Compute the average change per sector for sectors with active stocks.
    3. Generate a small realistic drift for sectors without active stocks in our list.
    4. Save results to the database and update the Redis 'sectors:all' cache.
    """
    logger.info("Running background sector performance updater...")
    redis = get_redis_client()

    sector_changes = {}

    async with get_db_session() as db:
        try:
            # 1. Fetch all stock cache entries
            result = await db.execute(select(MarketTickerCache))
            tickers = result.scalars().all()
            
            # Map ticker changes by sector
            sector_groups = {sec: [] for sec in ALL_SECTORS}
            for ticker in tickers:
                symbol = ticker.symbol
                if symbol in STOCK_SECTOR_MAP:
                    sec = STOCK_SECTOR_MAP[symbol]
                    if sec in sector_groups:
                        sector_groups[sec].append(float(ticker.change_pct))

            # 2. Compute averages or simulate realistic drifts
            random.seed(int(datetime.now(timezone.utc).timestamp() // 60))
            for sector in ALL_SECTORS:
                changes = sector_groups.get(sector, [])
                if changes:
                    # Average of constituent stock changes
                    sector_changes[sector] = round(sum(changes) / len(changes), 2)
                else:
                    # Generate a small simulated drift for sectors with no active tickers
                    sector_changes[sector] = round(random.normalvariate(0.05, 0.8), 2)

            # 3. Write-through to database cache
            for sector, pct in sector_changes.items():
                sec_result = await db.execute(
                    select(MarketSectorCache).where(MarketSectorCache.sector == sector)
                )
                sec_cache = sec_result.scalars().first()
                if sec_cache:
                    sec_cache.change_pct = pct
                    sec_cache.updated_at = datetime.now(timezone.utc)
                else:
                    sec_cache = MarketSectorCache(
                        sector=sector,
                        change_pct=pct,
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(sec_cache)
            await db.commit()
            logger.info("Successfully updated database market sector caches.")

        except Exception as e:
            logger.error(f"Database write failed in sector updater: {e}")
            await db.rollback()

    # 4. Cache response in Redis for Frontend consumption
    try:
        sectors_payload = [
            {"sector": sec, "change": pct}
            for sec, pct in sector_changes.items()
        ]
        # Cache for 60 seconds
        await redis.set("sectors:all", orjson.dumps(sectors_payload), ex=60)
        logger.info("Successfully updated Redis sectors:all cache.")
    except Exception as e:
        logger.error(f"Redis cache write failed in sector updater: {e}")
