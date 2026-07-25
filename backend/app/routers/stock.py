from fastapi import APIRouter, Depends, Query
from typing import List

from app.core.dependencies import get_redis
from app.schemas.stock import QuoteResp, OHLCVBarResp
from app.services.stock_service import StockService

router = APIRouter()


@router.get("/stock/quote", response_model=QuoteResp)
async def get_quote(
    symbol: str = Query(..., min_length=1, max_length=20),
    redis = Depends(get_redis)
):
    """Retrieve standard quote properties for a single stock."""
    service = StockService(redis)
    return await service.get_quote(symbol)


@router.get("/stock/ohlcv", response_model=List[OHLCVBarResp])
async def get_ohlcv(
    symbol: str = Query(..., min_length=1, max_length=20),
    tf: str = Query("1D", description="Timeframe resolution"),
    redis = Depends(get_redis)
):
    """Retrieve daily historical OHLCV chart bars for a single stock."""
    service = StockService(redis)
    return await service.get_ohlcv(symbol, tf)


@router.get("/nifty/historical", response_model=List[OHLCVBarResp])
async def get_nifty_historical(
    timeframe: str = Query("1D", description="Timeframe resolution"),
    redis = Depends(get_redis)
):
    """Retrieve daily historical OHLCV chart bars for the NIFTY 50 index."""
    service = StockService(redis)
    return await service.get_ohlcv("^NSEI", timeframe)
