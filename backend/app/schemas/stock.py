from pydantic import BaseModel
from typing import List


class QuoteResp(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float


class OHLCVBarResp(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class MACDResp(BaseModel):
    macd: List[float]
    signal: List[float]
    histogram: List[float]


class BollingerBandsResp(BaseModel):
    upper: List[float]
    middle: List[float]
    lower: List[float]


class IndicatorResp(BaseModel):
    rsi: List[float]
    macd: MACDResp
    bollingerBands: BollingerBandsResp
