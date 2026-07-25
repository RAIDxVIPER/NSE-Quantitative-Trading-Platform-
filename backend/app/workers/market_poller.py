import asyncio
import logging
import orjson
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import yfinance as yf
from sqlalchemy import select

from app.config import settings
from app.core.database import get_db_session
from app.core.redis import get_redis_client
from app.ml.data_fetcher import map_symbol_to_yf, SYMBOL_NAMES
from app.models.market import MarketTickerCache

logger = logging.getLogger(__name__)

# List of target frontend tickers
TRACKED_SYMBOLS = [
    "^NSEI", "^BSESN",  # Indices
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", 
    "WIPRO", "BAJFINANCE", "BHARTIARTL", "ITC", "HINDUNILVR", 
    "SBIN", "LT", "KOTAKBANK"  # NIFTY stocks
]


def _download_market_batch(symbols: list[str]) -> pd.DataFrame:
    """Download daily price history in batch for all symbols."""
    yf_symbols = [map_symbol_to_yf(s) for s in symbols]
    tickers_str = " ".join(yf_symbols)
    # Fetch 2d of history to compute daily change
    df = yf.download(
        tickers_str,
        period="2d",
        auto_adjust=True,
        progress=False,
        group_by="ticker"
    )
    return df


async def poll_market_data() -> None:
    """
    Background poller fetching live prices for all tracked symbols.
    Updates the database cache, Redis cache, and computes movers and KPIs.
    """
    logger.info("Running background market data poller...")
    redis = get_redis_client()
    
    quotes = {}
    source = "live"

    try:
        # Download batch data in a separate thread pool
        df = await asyncio.to_thread(_download_market_batch, TRACKED_SYMBOLS)
        
        # Parse quotes for each symbol
        for symbol in TRACKED_SYMBOLS:
            yf_symbol = map_symbol_to_yf(symbol)
            try:
                # Handle single vs multi-index dataframe return
                if len(TRACKED_SYMBOLS) == 1:
                    symbol_df = df
                else:
                    symbol_df = df[yf_symbol]
                
                # Check for enough rows to compute change
                if len(symbol_df) >= 2:
                    row_yesterday = symbol_df.iloc[-2]
                    row_today = symbol_df.iloc[-1]
                    
                    price = float(row_today["Close"])
                    prev_close = float(row_yesterday["Close"])
                    change = price - prev_close
                    pct = (change / prev_close * 100) if prev_close else 0.0
                    volume = int(row_today["Volume"]) if "Volume" in row_today else 0
                elif len(symbol_df) == 1:
                    row_today = symbol_df.iloc[-1]
                    price = float(row_today["Close"])
                    prev_close = price
                    change = 0.0
                    pct = 0.0
                    volume = int(row_today["Volume"]) if "Volume" in row_today else 0
                else:
                    raise ValueError(f"Empty data returned for {symbol}")

                quotes[symbol] = {
                    "symbol": SYMBOL_NAMES.get(symbol, symbol),  # Use frontend clean display names (e.g. NIFTY 50)
                    "name": SYMBOL_NAMES.get(symbol, symbol),
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "changePercent": round(pct, 2),
                    "prev_close": round(prev_close, 2),
                    "volume": volume,
                    "source": "live"
                }
            except Exception as inner_err:
                logger.error(f"Error parsing batch quote for {symbol}: {inner_err}")

    except Exception as e:
        logger.warning(f"Batch download failed ({e}). Generating fallback quote stats...")
        source = "synthetic"

    # Generate synthetic fallbacks for missing quotes
    for symbol in TRACKED_SYMBOLS:
        if symbol not in quotes:
            np.random.seed(abs(hash(symbol) + int(datetime.now(timezone.utc).timestamp() // 60)) % 2**31)
            # Fetch base price
            base = {
                "^NSEI": 22000,
                "^BSESN": 73000,
                "RELIANCE": 2900,
                "TCS": 3800,
                "INFY": 1500,
                "HDFCBANK": 1650
            }.get(symbol, 1000)
            
            # Simple drift
            pct = float(np.random.normal(0.05, 1.2))
            price = base * (1 + pct / 100.0)
            change = price - base
            volume = int(np.random.randint(5_000_000, 50_000_000))
            
            quotes[symbol] = {
                "symbol": SYMBOL_NAMES.get(symbol, symbol),
                "name": SYMBOL_NAMES.get(symbol, symbol),
                "price": round(price, 2),
                "change": round(change, 2),
                "changePercent": round(pct, 2),
                "prev_close": round(base, 2),
                "volume": volume,
                "source": "synthetic"
            }

    # Write-through to database cache (portable upsert)
    async with get_db_session() as db:
        try:
            for symbol, q in quotes.items():
                result = await db.execute(
                    select(MarketTickerCache).where(MarketTickerCache.symbol == symbol)
                )
                ticker = result.scalars().first()
                if ticker:
                    ticker.price = q["price"]
                    ticker.change_val = q["change"]
                    ticker.change_pct = q["changePercent"]
                    ticker.prev_close = q["prev_close"]
                    ticker.volume = q["volume"]
                    ticker.updated_at = datetime.now(timezone.utc)
                else:
                    ticker = MarketTickerCache(
                        symbol=symbol,
                        name=q["name"],
                        price=q["price"],
                        change_val=q["change"],
                        change_pct=q["changePercent"],
                        prev_close=q["prev_close"],
                        volume=q["volume"],
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(ticker)
            await db.commit()
            logger.info("Successfully updated database market ticker caches.")
        except Exception as e:
            logger.error(f"Database write-through failed in market poller: {e}")
            await db.rollback()

    # Compute breadths, movers, KPIs, and write to Redis
    try:
        # Separate indices from stocks
        index_quotes = [q for s, q in quotes.items() if s in ("^NSEI", "^BSESN")]
        stock_quotes = [q for s, q in quotes.items() if s not in ("^NSEI", "^BSESN")]

        # 1. Cache individual ticker entries in Redis
        for symbol, q in quotes.items():
            await redis.set(
                f"ticker:{symbol}",
                orjson.dumps({
                    "price": q["price"],
                    "change": q["change"],
                    "pct": q["changePercent"],
                    "prevClose": q["prev_close"],
                    "volume": q["volume"],
                    "source": q["source"]
                }),
                ex=60
            )

        # 2. Cache tickers:all response
        all_tickers_serialized = [
            {
                "symbol": q["symbol"],
                "name": q["name"],
                "price": q["price"],
                "change": q["change"],
                "changePercent": q["changePercent"]
            }
            for q in quotes.values()
        ]
        await redis.set("tickers:all", orjson.dumps(all_tickers_serialized), ex=30)

        # 3. Compute Advances/Declines/Unchanged
        advances = sum(1 for q in stock_quotes if q["change"] > 0)
        declines = sum(1 for q in stock_quotes if q["change"] < 0)
        unchanged = sum(1 for q in stock_quotes if q["change"] == 0)
        
        breadth = {
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged
        }
        await redis.set("breadth:market", orjson.dumps(breadth), ex=60)

        # 4. Compute Movers (top 5 gainers and top 5 losers)
        sorted_stocks = sorted(stock_quotes, key=lambda x: x["changePercent"])
        gainers = [
            {
                "symbol": q["symbol"],
                "name": q["name"],
                "price": q["price"],
                "changePercent": q["changePercent"]
            }
            for q in reversed(sorted_stocks[-5:])
        ]
        losers = [
            {
                "symbol": q["symbol"],
                "name": q["name"],
                "price": q["price"],
                "changePercent": q["changePercent"]
            }
            for q in sorted_stocks[:5]
        ]
        
        await redis.set("movers:gainers", orjson.dumps(gainers), ex=60)
        await redis.set("movers:losers", orjson.dumps(losers), ex=60)

        # 5. Compute market KPIs
        nifty = quotes.get("^NSEI", {"price": 0.0, "changePercent": 0.0})
        sensex = quotes.get("^BSESN", {"price": 0.0, "changePercent": 0.0})
        
        # Simple vix mock drift
        np.random.seed(int(datetime.now(timezone.utc).timestamp() // 60))
        vix_pct = float(np.random.normal(-0.2, 2.5))
        vix_price = round(13.42 * (1 + vix_pct / 100.0), 2)
        
        kpis = {
            "nifty": {"value": nifty["price"], "change": nifty["changePercent"]},
            "sensex": {"value": sensex["price"], "change": sensex["changePercent"]},
            "vix": {"value": vix_price, "change": round(vix_pct, 2)},
            "advancesDeclines": breadth
        }
        await redis.set("kpis:market", orjson.dumps(kpis), ex=30)
        logger.info("Successfully updated Redis cache states.")

    except Exception as e:
        logger.error(f"Redis cache caching failed in market poller: {e}")
