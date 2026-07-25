from pydantic import BaseModel
from typing import List


class TickerResp(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float


class StockMover(BaseModel):
    symbol: str
    name: str
    price: float
    changePercent: float


class MoverResp(BaseModel):
    gainers: List[StockMover]
    losers: List[StockMover]


class SectorResp(BaseModel):
    sector: str
    change: float


class BreadthResp(BaseModel):
    advances: int
    declines: int
    unchanged: int


class KPIEntry(BaseModel):
    value: float
    change: float


class KPIResp(BaseModel):
    nifty: KPIEntry
    sensex: KPIEntry
    vix: KPIEntry
    advancesDeclines: BreadthResp
