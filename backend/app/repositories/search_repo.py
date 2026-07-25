from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.market import MarketTickerCache, MarketSectorCache


class SearchRepo:
    """Repository class encapsulating database access for tickers, sectors, and search indices."""
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_tickers(self) -> list[MarketTickerCache]:
        """Fetch all tickers from the database cache."""
        result = await self.db.execute(select(MarketTickerCache))
        return list(result.scalars().all())

    async def get_all_sectors(self) -> list[MarketSectorCache]:
        """Fetch all sectors from the database cache."""
        result = await self.db.execute(select(MarketSectorCache))
        return list(result.scalars().all())
