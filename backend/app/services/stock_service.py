import logging
import pandas as pd
from redis.asyncio import Redis
from app.ml.data_fetcher import fetch_ohlcv, fetch_live_quote, SYMBOL_NAMES

logger = logging.getLogger(__name__)


def calculate_rsi(prices: pd.Series, period: int = 14) -> list[float]:
    """Calculate standard 14-period RSI indicator values."""
    if len(prices) < period:
        return [50.0] * len(prices)
    
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    # Avoid division by zero warnings
    rs = gain / loss.replace(0, 0.00001)
    rsi = 100 - (100 / (1 + rs))
    return [round(float(x), 2) if not pd.isna(x) else 50.0 for x in rsi]


def calculate_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict:
    """Calculate standard MACD line, signal line, and histogram values."""
    if len(prices) < slow:
        zero_arr = [0.0] * len(prices)
        return {"macd": zero_arr, "signal": zero_arr, "histogram": zero_arr}

    exp1 = prices.ewm(span=fast, adjust=False).mean()
    exp2 = prices.ewm(span=slow, adjust=False).mean()
    
    macd_line = exp1 - exp2
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    
    return {
        "macd": [round(float(x), 4) if not pd.isna(x) else 0.0 for x in macd_line],
        "signal": [round(float(x), 4) if not pd.isna(x) else 0.0 for x in signal_line],
        "histogram": [round(float(x), 4) if not pd.isna(x) else 0.0 for x in histogram]
    }


def calculate_bollinger_bands(prices: pd.Series, period: int = 20, num_std: int = 2) -> dict:
    """Calculate standard Bollinger Bands (Upper, Middle, Lower)."""
    if len(prices) < period:
        # Fallback: use prices directly if window cannot be filled
        prices_list = [round(float(x), 2) for x in prices]
        return {"upper": prices_list, "middle": prices_list, "lower": prices_list}

    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    
    upper = sma + (std * num_std)
    lower = sma - (std * num_std)
    
    return {
        "upper": [round(float(x), 2) if not pd.isna(x) else round(float(prices.iloc[i]), 2) for i, x in enumerate(upper)],
        "middle": [round(float(x), 2) if not pd.isna(x) else round(float(prices.iloc[i]), 2) for i, x in enumerate(sma)],
        "lower": [round(float(x), 2) if not pd.isna(x) else round(float(prices.iloc[i]), 2) for i, x in enumerate(lower)]
    }


class StockService:
    """Service layer dealing with individual stock details and indicator calculations."""
    def __init__(self, redis: Redis):
        self.redis = redis

    async def get_quote(self, symbol: str) -> dict:
        """Get live quote metrics for a stock."""
        quote = await fetch_live_quote(symbol, self.redis)
        return {
            "symbol": symbol.upper(),
            "name": SYMBOL_NAMES.get(symbol.upper(), symbol.upper()),
            "price": quote["price"],
            "change": quote["change"],
            "changePercent": quote["pct"]
        }

    async def get_ohlcv(self, symbol: str, timeframe: str) -> list[dict]:
        """Get history charts resolution metrics for a stock."""
        # Convert frontend timeframe codes to yfinance periods
        tf_lower = timeframe.lower()
        period_map = {
            "1d": "1mo",
            "1w": "6mo",
            "1m": "1y",
            "3m": "1y",
            "6m": "1y",
            "1y": "2y"
        }
        period = period_map.get(tf_lower, "1y")

        df = await fetch_ohlcv(symbol, period=period, redis=self.redis)
        
        result = []
        for dt, row in df.iterrows():
            result.append({
                "time": dt.strftime("%Y-%m-%d") if isinstance(dt, pd.Timestamp) else str(dt),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"])
            })
        return result

    async def get_indicators(self, symbol: str, timeframe: str) -> dict:
        """Get computed technical indicator matrices for a stock (RSI, MACD, Bollinger Bands)."""
        # Fetch 1 year daily history to ensure calculation windows are filled
        df = await fetch_ohlcv(symbol, period="1y", redis=self.redis)
        close_prices = df["Close"]
        
        return {
            "rsi": calculate_rsi(close_prices),
            "macd": calculate_macd(close_prices),
            "bollingerBands": calculate_bollinger_bands(close_prices)
        }
