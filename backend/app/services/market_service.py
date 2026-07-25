import logging
import orjson
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.search_repo import SearchRepo

logger = logging.getLogger(__name__)


class MarketService:
    """Service layer coordinating caching and DB calls for NIFTY indices and stocks."""
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
        self.repo = SearchRepo(db)

    async def get_tickers(self) -> list[dict]:
        """Get live ticker stats, first reading from Redis and falling back to SQL."""
        try:
            cached = await self.redis.get("tickers:all")
            if cached:
                return orjson.loads(cached)
        except Exception as e:
            logger.error(f"Redis cache read error in get_tickers: {e}")

        tickers = await self.repo.get_all_tickers()
        result = [
            {
                "symbol": t.symbol,
                "name": t.name,
                "price": float(t.price),
                "change": float(t.change_val),
                "changePercent": float(t.change_pct)
            }
            for t in tickers
        ]

        try:
            await self.redis.set("tickers:all", orjson.dumps(result), ex=30)
        except Exception as e:
            logger.error(f"Redis cache write error in get_tickers: {e}")

        return result

    async def get_movers(self) -> dict:
        """Get top 5 gainers and losers from Redis or SQL cache aggregation."""
        try:
            gainers_cached = await self.redis.get("movers:gainers")
            losers_cached = await self.redis.get("movers:losers")
            if gainers_cached and losers_cached:
                return {
                    "gainers": orjson.loads(gainers_cached),
                    "losers": orjson.loads(losers_cached)
                }
        except Exception as e:
            logger.error(f"Redis cache read error in get_movers: {e}")

        tickers = await self.repo.get_all_tickers()
        stock_tickers = [t for t in tickers if t.symbol not in ("^NSEI", "^BSESN")]
        
        sorted_tickers = sorted(stock_tickers, key=lambda x: float(x.change_pct))
        gainers = [
            {
                "symbol": t.symbol,
                "name": t.name,
                "price": float(t.price),
                "changePercent": float(t.change_pct)
            }
            for t in reversed(sorted_tickers[-5:])
        ]
        losers = [
            {
                "symbol": t.symbol,
                "name": t.name,
                "price": float(t.price),
                "changePercent": float(t.change_pct)
            }
            for t in sorted_tickers[:5]
        ]
        
        try:
            await self.redis.set("movers:gainers", orjson.dumps(gainers), ex=60)
            await self.redis.set("movers:losers", orjson.dumps(losers), ex=60)
        except Exception as e:
            logger.error(f"Redis cache write error in get_movers: {e}")

        return {"gainers": gainers, "losers": losers}

    async def get_sectors(self) -> list[dict]:
        """Get sectors performance summary from Redis or SQL cache."""
        try:
            cached = await self.redis.get("sectors:all")
            if cached:
                return orjson.loads(cached)
        except Exception as e:
            logger.error(f"Redis cache read error in get_sectors: {e}")

        sectors = await self.repo.get_all_sectors()
        result = [
            {
                "sector": s.sector,
                "change": float(s.change_pct)
            }
            for s in sectors
        ]

        try:
            await self.redis.set("sectors:all", orjson.dumps(result), ex=60)
        except Exception as e:
            logger.error(f"Redis cache write error in get_sectors: {e}")

        return result

    async def get_kpis(self) -> dict:
        """Get key market performance stats."""
        try:
            cached = await self.redis.get("kpis:market")
            if cached:
                return orjson.loads(cached)
        except Exception as e:
            logger.error(f"Redis cache read error in get_kpis: {e}")

        tickers = await self.repo.get_all_tickers()
        nifty = next((t for t in tickers if t.symbol == "^NSEI"), None)
        sensex = next((t for t in tickers if t.symbol == "^BSESN"), None)
        
        stock_tickers = [t for t in tickers if t.symbol not in ("^NSEI", "^BSESN")]
        advances = sum(1 for t in stock_tickers if t.change_val > 0)
        declines = sum(1 for t in stock_tickers if t.change_val < 0)
        unchanged = sum(1 for t in stock_tickers if t.change_val == 0)
        breadth = {"advances": advances, "declines": declines, "unchanged": unchanged}

        # Simulated standard VIX stats for consistency
        vix_price, vix_pct = 13.42, 0.0
        
        result = {
            "nifty": {
                "value": float(nifty.price) if nifty else 0.0,
                "change": float(nifty.change_pct) if nifty else 0.0
            },
            "sensex": {
                "value": float(sensex.price) if sensex else 0.0,
                "change": float(sensex.change_pct) if sensex else 0.0
            },
            "vix": {
                "value": vix_price,
                "change": vix_pct
            },
            "advancesDeclines": breadth
        }

        try:
            await self.redis.set("kpis:market", orjson.dumps(result), ex=30)
        except Exception as e:
            logger.error(f"Redis cache write error in get_kpis: {e}")

        return result

    async def get_breadth(self) -> dict:
        """Get advances/declines market breadth metrics."""
        try:
            cached = await self.redis.get("breadth:market")
            if cached:
                return orjson.loads(cached)
        except Exception as e:
            logger.error(f"Redis cache read error in get_breadth: {e}")

        tickers = await self.repo.get_all_tickers()
        stock_tickers = [t for t in tickers if t.symbol not in ("^NSEI", "^BSESN")]
        advances = sum(1 for t in stock_tickers if t.change_val > 0)
        declines = sum(1 for t in stock_tickers if t.change_val < 0)
        unchanged = sum(1 for t in stock_tickers if t.change_val == 0)
        
        result = {"advances": advances, "declines": declines, "unchanged": unchanged}

        try:
            await self.redis.set("breadth:market", orjson.dumps(result), ex=60)
        except Exception as e:
            logger.error(f"Redis cache write error in get_breadth: {e}")

        return result
