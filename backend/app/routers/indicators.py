from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_redis
from app.schemas.stock import IndicatorResp
from app.services.stock_service import StockService

router = APIRouter()


@router.get("/indicators", response_model=IndicatorResp)
async def get_indicators(
    symbol: str = Query(..., min_length=1, max_length=20),
    tf: str = Query("1D", description="Timeframe resolution"),
    redis = Depends(get_redis)
):
    """Retrieve standard computed indicator matrices for a stock."""
    service = StockService(redis)
    return await service.get_indicators(symbol, tf)
