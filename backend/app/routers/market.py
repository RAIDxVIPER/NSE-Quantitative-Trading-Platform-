from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db, get_redis
from app.schemas.market import TickerResp, MoverResp, SectorResp, KPIResp, BreadthResp
from app.services.market_service import MarketService

router = APIRouter()


@router.get("/tickers", response_model=List[TickerResp])
async def get_tickers(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Retrieve all cached market tickers."""
    service = MarketService(db, redis)
    return await service.get_tickers()


@router.get("/movers", response_model=MoverResp)
async def get_movers(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Retrieve top 5 gainers and losers in the market."""
    service = MarketService(db, redis)
    return await service.get_movers()


@router.get("/sectors", response_model=List[SectorResp])
async def get_sectors(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Retrieve sector performance metrics."""
    service = MarketService(db, redis)
    return await service.get_sectors()


@router.get("/kpis", response_model=KPIResp)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Retrieve macro performance KPIs."""
    service = MarketService(db, redis)
    return await service.get_kpis()


@router.get("/breadth", response_model=BreadthResp)
async def get_breadth(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    """Retrieve advances/declines counts."""
    service = MarketService(db, redis)
    return await service.get_breadth()
