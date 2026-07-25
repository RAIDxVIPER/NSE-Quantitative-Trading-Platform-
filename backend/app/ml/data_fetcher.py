import asyncio
import logging
import orjson
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timezone
from typing import Optional
from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)

# Ticker display name mapping
SYMBOL_NAMES = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy",
    "INFY": "Infosys",
    "HDFCBANK": "HDFC Bank",
    "ICICIBANK": "ICICI Bank",
    "WIPRO": "Wipro Ltd",
    "BAJFINANCE": "Bajaj Finance",
    "BHARTIARTL": "Bharti Airtel",
    "ITC": "ITC Ltd",
    "HINDUNILVR": "Hindustan Unilever",
    "SBIN": "State Bank of India",
    "LT": "Larsen & Toubro",
    "KOTAKBANK": "Kotak Mahindra Bank"
}


def map_symbol_to_yf(symbol: str) -> str:
    """Map clean frontend symbols to Yahoo Finance symbols."""
    symbol = symbol.upper().strip()
    if symbol in ("^NSEI", "NIFTY 50", "NIFTY_50"):
        return "^NSEI"
    if symbol in ("^BSESN", "SENSEX"):
        return "^BSESN"
    if symbol.startswith("^") or symbol.endswith(".NS") or symbol.endswith(".BO"):
        return symbol
    return f"{symbol}.NS"


def _generate_synthetic_ohlcv(symbol: str, period: str = "1y") -> pd.DataFrame:
    """Generate realistic GBM-based synthetic data matching the final.py logic."""
    np.random.seed(abs(hash(symbol)) % 2**31)

    # Map period to length in days
    days_map = {
        "1d": 1,
        "5d": 5,
        "1mo": 21,
        "3mo": 63,
        "6mo": 126,
        "1y": 252,
        "2y": 504,
        "5y": 1260,
        "10y": 2520
    }
    days = days_map.get(period.lower(), 252)
    
    dates = pd.bdate_range(end=pd.Timestamp.today(), periods=days)
    
    # Base prices for fallback
    base = {
        "^NSEI": 22000,
        "^BSESN": 73000,
        "RELIANCE": 2900,
        "TCS": 3800,
        "INFY": 1500,
        "HDFCBANK": 1650
    }.get(symbol.upper(), 1000)

    sigma, mu = 0.015, 0.0004
    log_returns = np.random.normal(mu - 0.5 * sigma**2, sigma, days)
    close = base * np.exp(np.cumsum(log_returns))
    high = close * (1 + np.abs(np.random.normal(0, 0.005, days)))
    low = close * (1 - np.abs(np.random.normal(0, 0.005, days)))
    
    open_ = np.roll(close, 1)
    open_[0] = base
    vol = np.random.randint(5_000_000, 50_000_000, days).astype(float)
    
    df = pd.DataFrame(
        {"Open": open_, "High": high, "Low": low, "Close": close, "Volume": vol},
        index=dates
    )
    df.index.name = "Date"
    df.attrs["source"] = "synthetic"
    return df


def _fetch_yf_sync(yf_symbol: str, period: str) -> pd.DataFrame:
    """Synchronous yfinance download function to run inside thread pool."""
    df = yf.download(
        tickers=yf_symbol,
        period=period,
        auto_adjust=True,
        progress=False
    )
    return df


async def fetch_ohlcv(symbol: str, period: str = "1y", redis: Optional[Redis] = None) -> pd.DataFrame:
    """
    Fetch OHLCV data. 
    1. Try Redis cache (if redis client is passed).
    2. Try yfinance inside an async thread pool.
    3. Fall back to synthetic data if yfinance fails.
    """
    cache_key = f"ohlcv:{symbol.upper()}:{period}"
    
    # 1. Read from Redis Cache
    if redis:
        try:
            cached_data = await redis.get(cache_key)
            if cached_data:
                parsed = orjson.loads(cached_data)
                df = pd.DataFrame(parsed["data"])
                df["Date"] = pd.to_datetime(df["Date"])
                df.set_index("Date", inplace=True)
                df.attrs["source"] = parsed["source"]
                return df
        except Exception as e:
            logger.error(f"Redis lookup error for ohlcv cache: {e}")

    # 2. Fetch from yfinance (run in executor to keep event loop unblocked)
    yf_symbol = map_symbol_to_yf(symbol)
    try:
        logger.info(f"Fetching live OHLCV for {yf_symbol} ({period}) from yfinance...")
        df = await asyncio.to_thread(_fetch_yf_sync, yf_symbol, period)
        
        if df.empty:
            raise ValueError("No data returned from yfinance")
            
        # Clean up column level multi-index in newer yfinance versions
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df = df[["Open", "High", "Low", "Close", "Volume"]].dropna()
        df.index = pd.to_datetime(df.index)
        df.index.name = "Date"
        df.attrs["source"] = "live"
        logger.info(f"Successfully fetched live data for {yf_symbol}")
    except Exception as e:
        logger.warning(f"Failed to fetch live data for {yf_symbol} ({e}). Falling back to synthetic...")
        df = _generate_synthetic_ohlcv(symbol, period)

    # 3. Cache inside Redis
    if redis:
        try:
            # Flatten df to dict for json serialization
            data_dict = df.reset_index().to_dict(orient="records")
            cache_payload = {
                "source": df.attrs["source"],
                "data": data_dict
            }
            await redis.set(
                cache_key,
                orjson.dumps(cache_payload),
                ex=settings.YFINANCE_CACHE_TTL_SECONDS
            )
        except Exception as e:
            logger.error(f"Failed to write ohlcv data cache: {e}")

    return df


def _fetch_quote_sync(yf_symbol: str) -> dict:
    """Synchronous quote info fetch to run inside thread pool."""
    tk = yf.Ticker(yf_symbol)
    info = tk.fast_info
    price = float(info.last_price)
    prev = float(info.previous_close) if hasattr(info, "previous_close") else price
    change = price - prev
    pct = (change / prev * 100) if prev else 0.0
    return {"price": price, "change": change, "pct": pct, "source": "live"}


async def fetch_live_quote(symbol: str, redis: Optional[Redis] = None) -> dict:
    """Fetch live quote: latest price, daily change, and daily change percentage."""
    cache_key = f"ticker:{symbol.upper()}"
    
    # 1. Try Redis cache
    if redis:
        try:
            cached_data = await redis.get(cache_key)
            if cached_data:
                return orjson.loads(cached_data)
        except Exception as e:
            logger.error(f"Redis lookup error for live quote cache: {e}")

    # 2. Try yfinance fast info
    yf_symbol = map_symbol_to_yf(symbol)
    try:
        logger.info(f"Fetching live quote for {yf_symbol} from yfinance...")
        quote = await asyncio.to_thread(_fetch_quote_sync, yf_symbol)
    except Exception as e:
        logger.warning(f"Failed to fetch quote for {yf_symbol} ({e}). Generating fallback quote...")
        # Fallback: get last 2 rows of cached/synthetic ohlcv data
        df = await fetch_ohlcv(symbol, period="1mo", redis=redis)
        price = float(df["Close"].iloc[-1])
        prev = float(df["Close"].iloc[-2]) if len(df) > 1 else price
        change = price - prev
        pct = (change / prev * 100) if prev else 0.0
        quote = {"price": price, "change": change, "pct": pct, "source": "synthetic"}

    # 3. Cache quote in Redis (expire quickly - 60s)
    if redis:
        try:
            await redis.set(
                cache_key,
                orjson.dumps(quote),
                ex=60
            )
        except Exception as e:
            logger.error(f"Failed to write quote cache: {e}")

    return quote
