# NSE Quantitative Trading Platform — Backend Implementation Strategy

> **Complete backend blueprint consolidating audit, API spec, database design, module architecture, and phased rollout into a single reference document.**  
> **Date:** 2026-07-16

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Frontend Ground Truth Audit](#2-frontend-ground-truth-audit)
3. [REST API Specification](#3-rest-api-specification)
4. [Database Schema Design](#4-database-schema-design)
5. [Module Architecture & Async Pipeline](#5-module-architecture--async-pipeline)
6. [Phased Implementation Plan](#6-phased-implementation-plan)

---

# 1. Project Overview

## 1.1 Context

- **Frontend:** Next.js 14+ scaffold (React Three Fiber, Zustand, TypeScript, Framer Motion) — the ONLY frontend target.
- **Legacy Prototype:** `final.py` (Streamlit dashboard) — NOT the integration target, but contains the ML core to be extracted.
- **Backend:** Python / FastAPI — must use existing ML modules directly without rewrite.

## 1.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+, React Three Fiber, Zustand, TanStack Query, Framer Motion, GSAP |
| Backend API | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16+ |
| Cache | Redis 7+ |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| ML/Quant | scikit-learn, scipy, numpy, pandas, yfinance |
| Background Jobs | APScheduler |
| Auth | JWT (PyJWT) + bcrypt |

## 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (:3000)                     │
│  React Three Fiber │ Zustand │ TanStack Query │ Framer Motion   │
└───────────────────────────────┬──────────────────────────────────┘
                                │ HTTP (REST JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (:8000)                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Routers  │→ │ Services │→ │  Repos   │→ │  PostgreSQL    │  │
│  │ (thin)   │  │ (logic)  │  │ (DB I/O) │  │  (persistent)  │  │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────────────┘  │
│                      │                                            │
│                      ├──→ Redis (cache, sessions, rate limits)   │
│                      │                                            │
│                      └──→ ProcessPool → ML Modules (CPU-bound)   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Background Workers (APScheduler)                             │ │
│  │  MarketPoller(15s) │ SectorUpdater(60s) │ NewsIngester(10m) │ │
│  │  PortfolioSnapshotter(daily 3:30PM IST)                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. Frontend Ground Truth Audit

## 2.1 File Tree (Target Frontend)

```
nse-frontend/
├── app/
│   ├── globals.css, layout.tsx, page.tsx (Home/Hero)
│   ├── about/page.tsx, analytics/page.tsx, dashboard/page.tsx
│   ├── news/page.tsx, portfolio/page.tsx
├── components/
│   ├── 3d/        → Scene, ParticleField, Globe*, HolographicCard*, CandlestickChart3D*
│   ├── charts/    → LightweightChart, SectorBars, AllocationRing
│   ├── common/    → GlassCard, PriceBadge, Ticker/TickerStrip/Sparkline, SkeletonLoader
│   ├── layout/    → Navbar, CommandMenu
│   ├── providers/ → QueryProvider, MouseTracker
│   └── sections/  → Hero, Dashboard, Analytics, Portfolio, News, Search, About, Footer
├── hooks/         → useLiveData, useMousePosition, useScrollProgress
├── lib/           → api.ts, mock-data.ts, store.ts, utils.ts, gsap.ts
├── .env.local     → NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
└── package.json
```

> Items marked with `*` are built but NOT currently rendered in the Scene component.

## 2.2 All 16 API Hooks (from `lib/api.ts`)

Every data dependency in the frontend flows through these TanStack Query hooks. All use an `apiFetch()` wrapper that tries the real API and falls back to mock data on failure.

| # | Hook | Endpoint Called | Mock Fallback | Polling | Auth | Consumers |
|---|------|----------------|---------------|---------|------|-----------|
| 1 | `useMarketTickers` | `GET /api/market/tickers` | `MOCK_TICKERS` | 30s | No | Hero (ticker strip) |
| 2 | `useMarketMovers` | `GET /api/market/movers` | `MOCK_GAINERS/LOSERS` | 60s | No | Dashboard |
| 3 | `useNiftyHistorical` | `GET /api/nifty/historical?timeframe=` | `MOCK_NIFTY_OHLCV` | — | No | Dashboard (chart) |
| 4 | `useStockQuote` | `GET /api/stock/quote?symbol=` | `MOCK_TICKERS.find()` | 15s | No | (unused — available for future) |
| 5 | `useStockOHLCV` | `GET /api/stock/ohlcv?symbol=&tf=` | `MOCK_NIFTY_OHLCV` | — | No | Analytics |
| 6 | `useIndicators` | `GET /api/indicators?symbol=&tf=` | Inline random data | — | No | Analytics (RSI, MACD) |
| 7 | `useWatchlist` | `GET /api/watchlist` | `MOCK_WATCHLIST` | 30s | **Yes** | Dashboard |
| 8 | `usePortfolioHoldings` | `GET /api/portfolio/holdings` | `MOCK_HOLDINGS` | — | **Yes** | Portfolio |
| 9 | `usePortfolioPerformance` | `GET /api/portfolio/performance?period=` | `generatePortfolioPerformance()` | — | **Yes** | Portfolio |
| 10 | `useNewsFeed` | `GET /api/news/feed` | `MOCK_NEWS` | — | No | News |
| 11 | `useSentiment` | `GET /api/sentiment/score` | `MOCK_SENTIMENT` | — | No | News (gauge) |
| 12 | `useSearch` | `GET /api/search?q=` | `MOCK_SEARCH_RESULTS` (filtered) | — | No | Search, CommandMenu |
| 13 | `useSectorPerformance` | `GET /api/market/sectors` | `MOCK_SECTORS` | — | No | Dashboard |
| 14 | `useMarketKPIs` | `GET /api/market/kpis` | `MOCK_KPIS` | 30s | No | Hero, Dashboard |
| 15 | `useMarketBreadth` | `GET /api/market/breadth` | `MOCK_BREADTH` | — | No | Dashboard |
| 16 | `useAIAnalysis` | `POST /api/ai/analyze` | `MOCK_AI_ANALYSIS` | — | Optional | Analytics |

## 2.3 Section Component → Data Hook Matrix

| Section Component | Hooks Consumed | Additional State |
|-------------------|---------------|-----------------|
| **Hero** | `useMarketTickers`, `useMarketKPIs` | Hardcoded fallback KPIs |
| **Dashboard** | `useMarketKPIs`, `useWatchlist`, `useNiftyHistorical`, `useSectorPerformance`, `useMarketMovers`, `useMarketBreadth` | `selectedTimeframe` from Zustand |
| **Analytics** | `useStockOHLCV`, `useIndicators`, `useAIAnalysis` | `selectedStock`, `selectedTimeframe`, `selectedChartType`, `activeIndicators` from Zustand |
| **Portfolio** | `usePortfolioHoldings`, `usePortfolioPerformance` | Derived summary (totalValue, totalPnl, dayPnl, sectorSegments) |
| **News** | `useNewsFeed`, `useSentiment` | Category filter, featured item selection |
| **Search** | `useSearch` | Debounced query, typewriter placeholder |
| **About / Footer** | None | Static content |

## 2.4 State That Needs Backend Backing

| Current Location | What | Backend Equivalent |
|-----------------|------|-------------------|
| Zustand `store.ts` | `watchlist: string[]` (hardcoded) | User's persisted watchlist table |
| Zustand `store.ts` | `selectedStock` (defaults to `^NSEI`) | User preferences (stored in `users.preferences` JSONB) |
| Zustand `store.ts` | `activeIndicators`, `selectedTimeframe`, `selectedChartType` | User preferences |
| Hero.tsx | Hardcoded fallback KPI values | Market KPIs endpoint |
| Portfolio.tsx | `dayPnl` (computed from `Math.sin()` seed) | Real-time `(ltp - prevClose) * qty` |

## 2.5 Python ML Core (`final.py`) — Modules to Extract

| Module | Key Functions | Backend Endpoint |
|--------|--------------|-----------------|
| Data Layer | `fetch_nse_data()`, `fetch_live_quote()` | `/api/stock/ohlcv`, `/api/stock/quote` |
| Feature Engineering | `build_features()` | Internal (used by regime, liquidity) |
| Order Book | `simulate_order_book()` | `GET /api/orderbook` |
| Regime Detection | `fit_regime_model()`, `get_regime_name()` | `GET /api/regime/detect` |
| Options Pricing | `black_scholes()`, `greeks()`, `monte_carlo_option()` | `POST /api/options/price` |
| Liquidity Shocks | `run_liquidity_model()`, `detect_liquidity_shocks()`, `monte_carlo_stress()` | `POST /api/liquidity/analyze` |

---

# 3. REST API Specification

**Base URL:** `http://localhost:8000`  
**Content-Type:** `application/json`

## 3.1 Common Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "symbol", "message": "Symbol is required" }]
  }
}
```

## 3.2 All 28 Endpoints

### Authentication (5 endpoints)

---

#### `POST /api/auth/register`
- **Auth:** None | **Rate Limit:** 5/min per IP
- **Body:** `{ email, password, name, phone? }`
- **Validation:** email unique, password 8+ chars with uppercase+lowercase+digit+special
- **Response (201):**
```json
{
  "user": { "id": "usr_abc123", "email": "...", "name": "...", "createdAt": "..." },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ...", "expiresIn": 900 }
}
```
- **Errors:** `400` validation, `409` duplicate email, `429` rate limited

---

#### `POST /api/auth/login`
- **Auth:** None | **Rate Limit:** 10/min per IP, lockout after 5 failures (15min)
- **Body:** `{ email, password }`
- **Response (200):** Same shape as register
- **Errors:** `401` invalid credentials, `429` rate limited/locked

---

#### `POST /api/auth/refresh`
- **Auth:** None (refresh token in body) | **Rate Limit:** 30/hr per user
- **Body:** `{ refreshToken }`
- **Response (200):** `{ tokens: { accessToken, refreshToken, expiresIn } }`
- **Security:** Old token rotated (revoked). Reuse of revoked token → all sessions revoked.

---

#### `GET /api/auth/me`
- **Auth:** Required | **Response (200):**
```json
{
  "id": "usr_abc123", "email": "...", "name": "...", "phone": "...",
  "createdAt": "...",
  "preferences": { "defaultSymbol": "^NSEI", "defaultTimeframe": "1D", "chartType": "candles", "activeIndicators": ["RSI"], "qualityLevel": "high" }
}
```

---

#### `POST /api/auth/logout`
- **Auth:** Required
- **Body:** `{ refreshToken }`
- **Response:** `204 No Content`

---

### Market Data (6 endpoints)

---

#### `GET /api/market/tickers`
- **Auth:** None | **Rate Limit:** 120/min
- **Response (200):** `TickerData[]`
```json
[{ "symbol": "NIFTY 50", "name": "NIFTY 50", "price": 22456.80, "change": 275.40, "changePercent": 1.24 }]
```
- Returns 10–15 tickers. During holidays returns last trading day with `change: 0`. Stale data flagged with `X-Data-Stale: true` header.

---

#### `GET /api/market/movers`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):**
```json
{
  "gainers": [{ "symbol": "WIPRO", "name": "Wipro", "price": 468.90, "changePercent": 2.70 }],
  "losers": [{ "symbol": "BAJFINANCE", "name": "Bajaj Finance", "price": 7234.00, "changePercent": -2.12 }]
}
```

---

#### `GET /api/nifty/historical?timeframe={1D|1W|1M|3M|6M|1Y}`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):** `OHLCVBar[]`
```json
[{ "time": "2026-07-15", "open": 22380.50, "high": 22500.20, "low": 22350.10, "close": 22456.80, "volume": 18500000 }]
```
- Timeframe → data points: 1D→252 daily, 1W→52 weekly, 1M→12 monthly, 3M→756, 6M→1512, 1Y→252

---

#### `GET /api/market/sectors`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):** `SectorPerformance[]`
```json
[{ "sector": "IT", "change": 2.34 }, { "sector": "Banking", "change": 1.85 }]
```
- 12 sectors: IT, Banking, Pharma, FMCG, Auto, Metal, Realty, Energy, Media, Infra, PSU Bank, Pvt Bank

---

#### `GET /api/market/kpis`
- **Auth:** None | **Rate Limit:** 120/min
- **Response (200):**
```json
{
  "nifty": { "value": 22456.80, "change": 1.24 },
  "sensex": { "value": 73852.94, "change": 1.14 },
  "vix": { "value": 13.42, "change": -4.56 },
  "advancesDeclines": { "advances": 1247, "declines": 598, "unchanged": 102 }
}
```

---

#### `GET /api/market/breadth`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):** `{ "advances": 1247, "declines": 598, "unchanged": 102 }`

---

### Stock Data (3 endpoints)

---

#### `GET /api/stock/quote?symbol={RELIANCE}`
- **Auth:** None | **Rate Limit:** 120/min
- **Validation:** `symbol` required, 1–20 chars
- **Response (200):** `{ "symbol": "RELIANCE", "name": "Reliance Industries", "price": 2943.50, "change": 42.30, "changePercent": 1.46 }`
- **Errors:** `400` missing symbol, `404` unknown symbol

---

#### `GET /api/stock/ohlcv?symbol={RELIANCE}&tf={1D}`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):** `OHLCVBar[]` (same shape as nifty/historical)

---

#### `GET /api/indicators?symbol={RELIANCE}&tf={1D}`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):**
```json
{
  "rsi": [45.2, 48.1, 52.3, 55.0, 53.8],
  "macd": { "macd": [12.5, 15.3], "signal": [10.2, 12.8], "histogram": [2.3, 2.5] },
  "bollingerBands": { "upper": [22500.0], "middle": [22300.0], "lower": [22100.0] }
}
```
- RSI: 14-period. MACD: 12/26/9. Bollinger: 20-period SMA ± 2σ.

---

### Portfolio (5 endpoints)

---

#### `GET /api/watchlist`
- **Auth:** Required | **Rate Limit:** 60/min
- **Response (200):** `WatchlistItem[]`
```json
[{ "symbol": "RELIANCE", "name": "Reliance Industries", "price": 2943.50, "change": 42.30, "changePercent": 1.46, "sparkline": [2910.5, 2920.3, 2915.1, 2930.0, 2943.5] }]
```
- Sparkline = last 20 close prices. Max 50 items per user.

---

#### `POST /api/watchlist`
- **Auth:** Required | **Rate Limit:** 30/min
- **Body:** `{ "symbol": "HDFCBANK" }`
- **Response (201):** Single `WatchlistItem`
- **Errors:** `409` already in watchlist, `422` limit reached (50 items)

---

#### `DELETE /api/watchlist/{symbol}`
- **Auth:** Required | **Rate Limit:** 30/min
- **Response:** `204 No Content`
- **Errors:** `404` symbol not in watchlist

---

#### `GET /api/portfolio/holdings`
- **Auth:** Required | **Rate Limit:** 60/min
- **Response (200):** `Holding[]`
```json
[{
  "symbol": "RELIANCE", "name": "Reliance Industries", "qty": 50, "avgBuy": 2780.00,
  "ltp": 2943.50, "currentValue": 147175.00, "pnl": 8175.00, "pnlPercent": 5.88,
  "dayChange": 42.30, "dayChangePercent": 1.46, "sector": "Energy"
}]
```
- `ltp` from live feed. `pnl = (ltp - avgBuy) * qty`. `dayChange = ltp - prevClose`.

---

#### `GET /api/portfolio/performance?period={1W|1M|3M|YTD}`
- **Auth:** Required | **Rate Limit:** 30/min
- **Response (200):** `{ date: string, value: number }[]`
- Only trading days (no weekends/holidays). YTD from Jan 1.

---

### News & Sentiment (2 endpoints)

---

#### `GET /api/news/feed?category=&limit=20&offset=0`
- **Auth:** None | **Rate Limit:** 60/min
- **Params:** `category` ∈ {Earnings, Economy, Sector, Global}, `limit` 1–50, `offset` ≥ 0
- **Response (200):**
```json
{
  "items": [{ "id": "news_abc", "headline": "...", "source": "Economic Times", "timestamp": "...", "excerpt": "...", "category": "Economy", "sentiment": "Neutral", "imageUrl": null, "featured": true }],
  "total": 42, "limit": 20, "offset": 0
}
```

---

#### `GET /api/sentiment/score`
- **Auth:** None | **Rate Limit:** 30/min
- **Response (200):** `{ "score": 62, "label": "Greed", "previousScore": 55, "change": 7 }`
- Score 0–100 (0=Extreme Fear, 100=Extreme Greed). Computed from VIX, put/call, breadth, FII/DII, momentum.

---

### Search (2 endpoints)

---

#### `GET /api/search?q={RELI}&type=&limit=10`
- **Auth:** None | **Rate Limit:** 120/min
- **Params:** `q` required (1–100 chars), `type` ∈ {Stock, Index, Sector}, `limit` 1–50
- **Response (200):** `SearchResult[]`
```json
[{ "symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy", "type": "Stock", "price": 2943.50, "changePercent": 1.46 }]
```
- Case-insensitive. Prefix match on symbol, fuzzy on name. Sorted: exact match first, then market cap desc.

---

#### `GET /api/search/trending`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):** `SearchResult[]` (top 9 items ranked by volume)

---

### Quantitative ML (5 endpoints)

---

#### `GET /api/orderbook?symbol={RELIANCE}&depth=10`
- **Auth:** None | **Rate Limit:** 60/min
- **Response (200):**
```json
{
  "symbol": "RELIANCE", "mid": 2943.50, "spread": 0.85, "imbalance": 0.127,
  "totalBid": 12500, "totalAsk": 11200,
  "bids": [{ "price": 2943.15, "quantity": 2800 }],
  "asks": [{ "price": 2944.00, "quantity": 2200 }],
  "source": "simulated", "timestamp": "2026-07-16T10:30:00Z"
}
```

---

#### `GET /api/regime/detect?symbol={^NSEI}&n_regimes=4`
- **Auth:** None | **Rate Limit:** 10/min (compute-heavy)
- **Response (200):**
```json
{
  "symbol": "^NSEI",
  "currentRegime": { "id": 0, "name": "📈 Trending Bull", "confidence": 0.87 },
  "regimes": [{ "id": 0, "name": "📈 Trending Bull", "count": 142, "avgReturn": "0.082%", "avgVolatility": "0.152", "avgSpread": "18.5 bps", "avgConfidence": "82.1%" }],
  "transitionMatrix": [[0.92, 0.05, 0.02, 0.01], ...],
  "regimeProbabilities": [{ "date": "2026-07-15", "probabilities": [0.87, 0.08, 0.04, 0.01] }],
  "priceWithRegimes": [{ "date": "2026-07-15", "close": 22456.80, "regime": 0 }]
}
```
- Uses 2 years of data. Features: log_ret, vol_20, momentum, imbalance, spread_proxy. Cached 10min.

---

#### `POST /api/options/price`
- **Auth:** None | **Rate Limit:** 30/min
- **Body:** `{ symbol, strikePrice, expiryDays, impliedVolatility, riskFreeRate, optionType: "call"|"put", mcSimulations?: 50000 }`
- **Response (200):**
```json
{
  "spotPrice": 2943.50, "bsPrice": 58.42, "mcPrice": 57.85, "mcStdError": 0.32,
  "greeks": { "delta": 0.4215, "gamma": 0.000892, "vega": 4.23, "theta": -2.15, "rho": 0.81 },
  "moneyness": "OTM", "moneynessRatio": 0.981,
  "priceSensitivity": [{ "strike": 2800, "bsPrice": 185.40 }, ...]
}
```

---

#### `POST /api/liquidity/analyze`
- **Auth:** None | **Rate Limit:** 10/min (compute-heavy)
- **Body:** `{ symbol, shockThreshold?: 2.5, mcSimulations?: 2000 }`
- **Response (200):**
```json
{
  "symbol": "^NSEI",
  "shockSummary": { "detected": 23, "frequency": "4.6%", "avgSpreadNormal": "18.5 bps", "avgSpreadShock": "45.2 bps" },
  "forecast": { "direction": "BULLISH", "predictedReturn": 0.003412, "predictedReturnPercent": 0.34, "bestModel": "Ridge (L2)", "modelR2": 0.0312, "latestDate": "2026-07-15" },
  "modelComparison": [{ "model": "Ridge (L2)", "r2": 0.0312, "rmse": 0.0198 }],
  "featureImportance": [{ "feature": "vol_20", "importance": 0.245 }],
  "stressTest": { "meanPnl": 12.45, "stdDev": 28.30, "var95": -34.20, "cvar95": -48.60, "simulations": 2000 }
}
```

---

#### `POST /api/ai/analyze`
- **Auth:** Optional | **Rate Limit:** 5/min (unauth) / 20/min (auth)
- **Body:** `{ "symbol": "^NSEI", "timeframe": "1D" }`
- **Response (200):**
```json
{
  "summary": "Based on technical analysis of NIFTY 50, the index is showing strong bullish momentum...",
  "signal": "Bullish",
  "confidence": 0.78,
  "tags": ["Breakout", "Volume Confirmation", "EMA Support", "MACD Bullish"]
}
```

---

# 4. Database Schema Design

## 4.1 Technology

| Layer | Choice |
|-------|--------|
| Primary Database | PostgreSQL 16+ |
| Cache / Sessions | Redis 7+ |
| ORM | SQLAlchemy 2.0 (async with asyncpg) |
| Migrations | Alembic |

## 4.2 Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ watchlists : has
    users ||--o{ portfolio_holdings : owns
    users ||--o{ portfolio_snapshots : tracks
    users ||--o{ refresh_tokens : authenticates
    users ||--o{ audit_log : generates

    watchlists { uuid id PK; uuid user_id FK; varchar symbol; int sort_order; timestamp created_at }
    portfolio_holdings { uuid id PK; uuid user_id FK; varchar symbol; varchar name; int qty; decimal avg_buy; varchar sector; timestamp created_at; timestamp updated_at }
    portfolio_snapshots { uuid id PK; uuid user_id FK; date snapshot_date; decimal total_value; timestamp created_at }
    users { uuid id PK; varchar email; varchar password_hash; varchar name; varchar phone; jsonb preferences; int failed_login_attempts; timestamp locked_until; timestamp created_at; timestamp updated_at }
    refresh_tokens { uuid id PK; uuid user_id FK; varchar token_hash; timestamp expires_at; boolean revoked; timestamp created_at }
    news_articles { uuid id PK; varchar headline; varchar source; timestamp published_at; text excerpt; varchar category; varchar sentiment; varchar image_url; boolean featured; timestamp created_at }
    market_tickers_cache { varchar symbol PK; varchar name; decimal price; decimal change_val; decimal change_pct; decimal prev_close; bigint volume; timestamp updated_at }
    market_sectors_cache { varchar sector PK; decimal change_pct; timestamp updated_at }
    search_index { varchar symbol PK; varchar name; varchar sector; varchar type; tsvector search_vector; decimal market_cap }
    audit_log { bigint id PK; uuid user_id FK; varchar action; varchar ip_address; jsonb metadata; timestamp created_at }
```

## 4.3 Table DDL Summaries

### `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(15),
    preferences     JSONB NOT NULL DEFAULT '{"defaultSymbol":"^NSEI","defaultTimeframe":"1D","chartType":"candles","activeIndicators":["RSI"],"qualityLevel":"high"}'::jsonb,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes: idx_users_email (B-tree on email)
-- Trigger: auto-update updated_at on UPDATE
```

### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 of actual token
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Token rotation: old revoked, new created on refresh
-- Reuse detection: revoked token reuse → all user sessions revoked
-- Cleanup: delete where expires_at < NOW() - 7 days
```

### `watchlists`
```sql
CREATE TABLE watchlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol      VARCHAR(20) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);
-- Max 50 items per user (enforced at app layer)
-- Price/sparkline enriched at query time from Redis cache
-- This is the SERVER-SIDE source of truth (replaces Zustand's local watchlist)
```

### `portfolio_holdings`
```sql
CREATE TABLE portfolio_holdings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol      VARCHAR(20) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    qty         INTEGER NOT NULL CHECK (qty > 0),
    avg_buy     DECIMAL(12,2) NOT NULL CHECK (avg_buy > 0),
    sector      VARCHAR(50) NOT NULL DEFAULT 'Other',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);
-- ltp, currentValue, pnl, dayChange are ALL COMPUTED at query time from Redis cache
-- dayPnl = (ltp - prev_close) * qty (resolves audit clarification #7)
```

### `portfolio_snapshots`
```sql
CREATE TABLE portfolio_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    total_value     DECIMAL(14,2) NOT NULL CHECK (total_value >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);
-- One row per user per trading day, generated by daily batch job at 3:30 PM IST
```

### `news_articles`
```sql
CREATE TABLE news_articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline        VARCHAR(500) NOT NULL,
    source          VARCHAR(100) NOT NULL,
    published_at    TIMESTAMPTZ NOT NULL,
    excerpt         TEXT,
    category        VARCHAR(20) NOT NULL CHECK (category IN ('Earnings','Economy','Sector','Global')),
    sentiment       VARCHAR(20) NOT NULL DEFAULT 'Neutral' CHECK (sentiment IN ('Positive','Negative','Neutral')),
    image_url       VARCHAR(500),
    featured        BOOLEAN NOT NULL DEFAULT FALSE,
    source_url      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Indexes: published_at DESC, (category, published_at DESC), featured WHERE TRUE
-- Retention: 90 days
```

### `market_tickers_cache`
```sql
CREATE TABLE market_tickers_cache (
    symbol      VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    price       DECIMAL(12,2) NOT NULL,
    change_val  DECIMAL(12,2) NOT NULL DEFAULT 0,
    change_pct  DECIMAL(8,4) NOT NULL DEFAULT 0,
    prev_close  DECIMAL(12,2),
    volume      BIGINT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Write-through cache: updated by background poller every 15s
-- Redis is the primary fast-read; this is the durable fallback
-- ~200 symbols (NIFTY 200 + indices)
```

### `market_sectors_cache`
```sql
CREATE TABLE market_sectors_cache (
    sector      VARCHAR(50) PRIMARY KEY,
    change_pct  DECIMAL(8,4) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 12 sectors, updated every 60s
```

### `search_index`
```sql
CREATE TABLE search_index (
    symbol          VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    sector          VARCHAR(50) NOT NULL DEFAULT 'Other',
    type            VARCHAR(20) NOT NULL CHECK (type IN ('Stock','Index','Sector')),
    market_cap      DECIMAL(16,2),
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', symbol), 'A') ||
        setweight(to_tsvector('english', name), 'B') ||
        setweight(to_tsvector('english', sector), 'C')
    ) STORED
);
-- GIN index on search_vector for full-text search
-- Pre-populated with ~200 stocks + 5 indices + 12 sectors
-- Enriched with live price at query time via JOIN on market_tickers_cache
```

### `audit_log`
```sql
CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(50) NOT NULL,  -- LOGIN, LOGIN_FAILED, LOGOUT, REGISTER, WATCHLIST_ADD, etc.
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Retention: 90 days
```

## 4.4 Redis Key Namespace

| Namespace | Key Pattern | TTL | Purpose |
|-----------|------------|-----|---------|
| `ticker:` | `ticker:{symbol}` | 60s | Per-symbol live data hash |
| `tickers:all` | — | 30s | Pre-serialized `/api/market/tickers` response |
| `movers:gainers` / `movers:losers` | — | 60s | Top 5 gainers/losers |
| `sectors:all` | — | 60s | Sector performance array |
| `kpis:market` | — | 30s | Market KPIs |
| `breadth:market` | — | 60s | Advances/declines/unchanged |
| `ohlcv:{symbol}:{tf}` | — | 300s | Historical OHLCV |
| `indicators:{symbol}:{tf}` | — | 300s | Technical indicators |
| `sentiment:score` | — | 300s | Fear/greed score |
| `search:trending` | — | 600s | Trending search results |
| `regime:{symbol}:{n}` | — | 600s | Cached regime detection |
| `session:{user_id}` | — | — | Active refresh token hashes (Set) |
| `blacklist:{jti}` | — | JWT exp | Revoked access tokens |
| `rate:{ip}:{endpoint}` | — | 60s | Sliding window rate limiting |
| `rate:user:{user_id}:{endpoint}` | — | 60s | Per-user rate limiting |

## 4.5 Data Retention

| Table | Retention | Method |
|-------|-----------|--------|
| users | Indefinite | Manual only |
| refresh_tokens | 7 days past expiry | pg_cron DELETE |
| watchlists / portfolio_holdings | User lifecycle | CASCADE |
| portfolio_snapshots | 2 years | pg_cron DELETE |
| news_articles | 90 days | pg_cron DELETE |
| market_tickers_cache / market_sectors_cache | Overwritten continuously | — |
| search_index | Indefinite | Manual re-seed |
| audit_log | 90 days | pg_cron DELETE |

---

# 5. Module Architecture & Async Pipeline

## 5.1 Backend Directory Structure

```
backend/
├── pyproject.toml                ← Dependencies, scripts
├── .env / .env.example           ← Environment variables
├── alembic.ini                   ← Alembic config
├── Dockerfile                    ← Production container
├── docker-compose.yml            ← Dev stack (API + Postgres + Redis)
│
├── alembic/
│   ├── env.py
│   └── versions/
│       ├── 001_initial_schema.py
│       ├── 002_seed_search_index.py
│       └── 003_seed_sectors.py
│
├── app/
│   ├── main.py                   ← FastAPI app factory + lifespan
│   ├── config.py                 ← Pydantic Settings
│   │
│   ├── routers/                  ← Thin API route handlers
│   │   ├── auth.py               ← /api/auth/*        (5 endpoints)
│   │   ├── market.py             ← /api/market/*       (6 endpoints)
│   │   ├── stock.py              ← /api/stock/*        (2 endpoints)
│   │   ├── indicators.py         ← /api/indicators     (1 endpoint)
│   │   ├── portfolio.py          ← /api/portfolio/*    (2 endpoints)
│   │   ├── watchlist.py          ← /api/watchlist*     (3 endpoints)
│   │   ├── news.py               ← /api/news/*         (1 endpoint)
│   │   ├── sentiment.py          ← /api/sentiment/*    (1 endpoint)
│   │   ├── search.py             ← /api/search*        (2 endpoints)
│   │   ├── quant.py              ← /api/orderbook, regime, options, liquidity (4 endpoints)
│   │   ├── ai.py                 ← /api/ai/*           (1 endpoint)
│   │   └── health.py             ← /api/health         (liveness + readiness)
│   │
│   ├── services/                 ← Business logic
│   │   ├── auth_service.py, market_service.py, stock_service.py
│   │   ├── portfolio_service.py, watchlist_service.py
│   │   ├── news_service.py, sentiment_service.py, search_service.py
│   │   ├── quant_service.py, ai_service.py
│   │
│   ├── repositories/             ← Database access (SQLAlchemy)
│   │   ├── user_repo.py, token_repo.py, watchlist_repo.py
│   │   ├── portfolio_repo.py, news_repo.py, search_repo.py
│   │
│   ├── models/                   ← SQLAlchemy ORM models
│   │   ├── base.py (DeclarativeBase + TimestampMixin)
│   │   ├── user.py, token.py, watchlist.py, portfolio.py
│   │   ├── news.py, market.py, search.py, audit.py
│   │
│   ├── schemas/                  ← Pydantic request/response schemas
│   │   ├── auth.py, market.py, stock.py, portfolio.py, watchlist.py
│   │   ├── news.py, sentiment.py, search.py, quant.py, ai.py, common.py
│   │
│   ├── core/                     ← Cross-cutting infrastructure
│   │   ├── database.py           ← AsyncEngine + session factory
│   │   ├── redis.py              ← Redis client factory
│   │   ├── security.py           ← JWT + bcrypt
│   │   ├── dependencies.py       ← get_db, get_redis, get_current_user
│   │   ├── exceptions.py         ← Exception hierarchy + handlers
│   │   ├── middleware.py         ← CORS, rate limiting, request ID, timing
│   │   └── executor.py           ← ProcessPoolExecutor for CPU-bound ML
│   │
│   ├── workers/                  ← Background async tasks
│   │   ├── scheduler.py          ← APScheduler setup
│   │   ├── market_poller.py      ← Live prices every 15s → Redis + DB
│   │   ├── sector_updater.py     ← Sector aggregation every 60s
│   │   ├── news_ingester.py      ← RSS fetch + sentiment every 10min
│   │   └── portfolio_snapshotter.py ← Daily snapshot at 3:30 PM IST
│   │
│   └── ml/                       ← ML/Quant modules (from final.py)
│       ├── data_fetcher.py       ← yfinance wrapper + cache + fallback
│       ├── features.py           ← Feature engineering
│       ├── order_book.py         ← Power-law order book simulation
│       ├── regime.py             ← GMM regime detection
│       ├── options.py            ← Black-Scholes + Monte Carlo
│       ├── liquidity.py          ← Ridge/Lasso/ElasticNet + shock detection
│       └── analyzer.py           ← AI analysis orchestrator
│
└── tests/
    ├── conftest.py               ← Fixtures
    └── test_*.py                 ← Per-module test files
```

## 5.2 Request Flow Pattern

```
Request → TimingMiddleware → RequestIdMiddleware → RateLimitMiddleware → CORSMiddleware
    → Router (validate input, parse params)
    → Service (business logic, Redis cache check, computation)
    → Repository (database queries via SQLAlchemy)
    → Response (Pydantic model serialization)
```

## 5.3 Dependency Injection

```python
# Every router handler gets its dependencies injected:

@router.get("/tickers")
async def get_tickers(
    db: AsyncSession = Depends(get_db),          # Database session
    redis = Depends(get_redis),                   # Redis client
):
    service = MarketService(db, redis)
    return await service.get_tickers()

@router.get("/holdings")
async def get_holdings(
    user: User = Depends(get_current_user),       # Auth required → 401 if missing
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
):
    service = PortfolioService(db, redis)
    return await service.get_holdings(user.id)
```

## 5.4 ML Computation Pipeline

CPU-bound ML work runs in a **ProcessPoolExecutor** to avoid blocking FastAPI's async event loop:

```python
# In quant_service.py:
async def detect_regime(self, symbol: str, n_regimes: int):
    # 1. Check Redis cache
    cached = await self.redis.get(f"regime:{symbol}:{n_regimes}")
    if cached: return json.loads(cached)

    # 2. Run CPU-bound ML in separate process
    result = await run_cpu_bound(regime.detect, symbol, n_regimes)

    # 3. Cache result
    await self.redis.set(f"regime:{symbol}:{n_regimes}", json.dumps(result), ex=600)
    return result
```

## 5.5 Background Workers

| Worker | Interval | What It Does | Writes To |
|--------|----------|-------------|-----------|
| **MarketPoller** | 15s (market hours) / 5min (off hours) | Batch-fetch ~200 symbols via yfinance | Redis (`ticker:*`, `tickers:all`, `kpis:market`, `movers:*`, `breadth:market`) + DB (`market_tickers_cache`) |
| **SectorUpdater** | 60s | Aggregate individual stock changes per sector | Redis (`sectors:all`) + DB (`market_sectors_cache`) |
| **NewsIngester** | 10min | Fetch RSS feeds, classify sentiment, insert articles | DB (`news_articles`) + Redis (`sentiment:score`) |
| **PortfolioSnapshotter** | Daily 3:30 PM IST (Mon–Fri) | For each user: SUM(qty * closing_price) | DB (`portfolio_snapshots`) |

## 5.6 JWT Auth Flow

```
Login:  email+password → verify → generate access(15min) + refresh(7d) → store refresh_hash in DB
                                                                         → SADD to session:{user_id} in Redis

Refresh: refreshToken → validate hash in DB → revoke old → create new pair → return new tokens

Logout:  refreshToken → revoke in DB → SET blacklist:{jti} in Redis (TTL=remaining access life)
                                      → SREM from session:{user_id}
```

## 5.7 Exception Hierarchy

```
AppException (base)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitedError (429)
└── ExternalServiceError (502)   ← yfinance/RSS unreachable
```

## 5.8 Configuration (Key Environment Variables)

```env
# Server
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql+asyncpg://nse:nse@localhost:5432/nse_analytics
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=change-me-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

# Workers
MARKET_POLL_INTERVAL_SECONDS=15
SECTOR_UPDATE_INTERVAL_SECONDS=60
NEWS_INGEST_INTERVAL_SECONDS=600
PORTFOLIO_SNAPSHOT_CRON=30 15 * * 1-5

# ML
ML_PROCESS_POOL_SIZE=4
YFINANCE_CACHE_TTL_SECONDS=300
```

---

# 6. Phased Implementation Plan

## Phase Overview

| Phase | Focus | Endpoints Delivered | Key Dependency |
|-------|-------|-------------------|----------------|
| **1. Foundation** | Project scaffold, DB, Redis, core infra | `/api/health` (1) | None |
| **2. Market Data** | Pollers, cache, market/stock endpoints | 9 endpoints | Phase 1 |
| **3. User System** | Auth, watchlist, portfolio, news, search | 14 endpoints | Phase 2 |
| **4. Quant ML** | Order book, regime, options, liquidity, AI | 5 endpoints | Phase 2 |
| **5. Frontend Integration** | Update api.ts, auth UI, protected routes | — | Phases 3+4 |
| **6. Polish** | Docker, tests, logging, WebSocket docs | — | Phase 5 |

> **Phases 3 and 4 can run in parallel** after Phase 2 is complete.

---

## Phase 1 — Foundation (8 Tasks)

| Task | Creates | Verification |
|------|---------|-------------|
| **1.1** Project Scaffold | `pyproject.toml`, `.env`, `main.py`, `config.py` | `uvicorn app.main:app` starts, Swagger at `/api/docs` |
| **1.2** Database Engine | `core/database.py` | Logs "Database engine initialized" |
| **1.3** Redis Client | `core/redis.py` | Logs "Redis connected" |
| **1.4** ORM Models | 10 model files in `models/` | All imports succeed |
| **1.5** Alembic Migrations | 3 migration files | `alembic upgrade head` creates 10 tables, seeds search_index (217 rows) + sectors (12) |
| **1.6** Core Dependencies | `core/dependencies.py`, `core/security.py` | JWT roundtrip test, password hash test |
| **1.7** Middleware | `core/middleware.py` | Responses include `X-Request-Id`, `X-Response-Time` |
| **1.8** Exceptions + Health | `core/exceptions.py`, `routers/health.py` | `GET /api/health` → `{"status":"ok"}`, `GET /api/health/ready` → DB+Redis status |

---

## Phase 2 — Market Data Pipeline (8 Tasks)

| Task | Creates | Verification |
|------|---------|-------------|
| **2.1** Data Fetcher | `ml/data_fetcher.py` | `fetch_ohlcv("^NSEI")` returns DataFrame |
| **2.2** Market Poller | `workers/market_poller.py`, `workers/scheduler.py` | Redis `tickers:all` populated after 30s |
| **2.3** Sector Updater | `workers/sector_updater.py` | Redis `sectors:all` populated |
| **2.4** Market Service + Repo | `services/market_service.py`, `repositories/search_repo.py` | Service returns data from Redis/DB |
| **2.5** Market Router | `routers/market.py`, `schemas/market.py` | All 5 market endpoints return JSON |
| **2.6** Stock Endpoints | `routers/stock.py`, `routers/indicators.py`, `services/stock_service.py`, `schemas/stock.py` | Quote, OHLCV, indicators endpoints work |
| **2.7** NIFTY Historical | Extend `market.py` router | `/api/nifty/historical?timeframe=1Y` returns ~252 bars |
| **2.8** Process Pool | `core/executor.py` | `run_cpu_bound()` doesn't block event loop |

---

## Phase 3 — User System (10 Tasks)

| Task | Creates | Verification |
|------|---------|-------------|
| **3.1** Auth Service | `services/auth_service.py`, `repositories/user_repo.py`, `repositories/token_repo.py` | Register→login→refresh→me→logout flow |
| **3.2** Auth Router | `routers/auth.py`, `schemas/auth.py` | All 5 auth curl commands succeed |
| **3.3** Audit Log | `repositories/audit_repo.py` | Auth events appear in audit_log table |
| **3.4** Watchlist | `routers/watchlist.py`, `services/watchlist_service.py`, `repositories/watchlist_repo.py`, `schemas/watchlist.py` | GET/POST/DELETE with live price enrichment |
| **3.5** Portfolio | `routers/portfolio.py`, `services/portfolio_service.py`, `repositories/portfolio_repo.py`, `schemas/portfolio.py` | Holdings with P&L, performance chart |
| **3.6** Snapshotter | `workers/portfolio_snapshotter.py` | Daily snapshot rows in DB |
| **3.7** News Service | `routers/news.py`, `services/news_service.py`, `repositories/news_repo.py`, `schemas/news.py` | Paginated feed with category filter |
| **3.8** News Ingester | `workers/news_ingester.py` | Real articles with sentiment after 10min |
| **3.9** Sentiment | `routers/sentiment.py`, `services/sentiment_service.py`, `schemas/sentiment.py` | Score endpoint returns fear/greed |
| **3.10** Search | `routers/search.py`, `services/search_service.py`, `schemas/search.py` | Full-text search + trending |

---

## Phase 4 — Quantitative ML (6 Tasks)

> Can run **in parallel** with Phase 3.

| Task | Creates | Verification |
|------|---------|-------------|
| **4.1** Feature Engineering | `ml/features.py` | DataFrame with log_ret, vol_20, momentum, imbalance, spread_proxy |
| **4.2** Order Book | `ml/order_book.py`, extend `routers/quant.py` | `GET /api/orderbook?symbol=RELIANCE` returns bids/asks |
| **4.3** Regime Detection | `ml/regime.py`, extend `routers/quant.py` | `GET /api/regime/detect?symbol=^NSEI` returns regimes (<5s) |
| **4.4** Options Pricing | `ml/options.py`, extend `routers/quant.py` | `POST /api/options/price` returns BS + MC + Greeks |
| **4.5** Liquidity Analysis | `ml/liquidity.py`, extend `routers/quant.py` | `POST /api/liquidity/analyze` returns shocks + stress test |
| **4.6** AI Analysis | `ml/analyzer.py`, `routers/ai.py`, `services/ai_service.py`, `services/quant_service.py` | `POST /api/ai/analyze` returns signal + confidence |

---

## Phase 5 — Frontend Integration (6 Tasks)

| Task | Modifies/Creates | Verification |
|------|-----------------|-------------|
| **5.1** Update `api.ts` | `nse-frontend/lib/api.ts` — auth headers, proper errors, production mode | Dashboard shows live data |
| **5.2** Auth Token Mgmt | `lib/api.ts`, `lib/store.ts` — token storage, auto-refresh | Login persists, requests include Bearer token |
| **5.3** Login Page | `app/login/page.tsx`, `components/sections/AuthForm.tsx` | Register + login UI works |
| **5.4** Protected Routes | `components/providers/AuthProvider.tsx`, modify portfolio page | /portfolio redirects to /login if unauthenticated |
| **5.5** Watchlist Sync | `lib/store.ts`, `lib/api.ts` — add mutation hooks | Add/remove persists across refreshes |
| **5.6** Quant Integration | `lib/api.ts` — add quant hooks | AI analysis button returns real ML results |

---

## Phase 6 — Polish & Deploy (4 Tasks)

| Task | Creates | Verification |
|------|---------|-------------|
| **6.1** Docker | `Dockerfile`, `docker-compose.yml` | `docker compose up` runs full stack |
| **6.2** Test Suite | `tests/conftest.py`, `tests/test_*.py` (10 files) | `pytest -v` passes, coverage >80% |
| **6.3** Logging | `core/logging.py`, modify middleware | Structured JSON logs with request_id |
| **6.4** WebSocket Docs | `docs/websocket-upgrade.md` | Architecture documented for future WS migration |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| yfinance downtime | Synthetic fallback + Redis cache extension + `X-Data-Stale` header |
| ML computation timeout | ProcessPool with 30s timeout + cached results |
| PostgreSQL connection exhaustion | Pool size 20 + overflow 10 + health check |
| Redis failure | Graceful degradation → direct DB queries |
| JWT secret compromise | Short access TTL (15min), rotate via env, revoke all refresh tokens |
| News RSS changes | Multi-source fallback, per-source error tracking |

---

## Endpoint → Phase Cross-Reference

| Endpoint | Phase.Task |
|----------|-----------|
| `GET /api/health` | 1.8 |
| `GET /api/market/tickers` | 2.5 |
| `GET /api/market/movers` | 2.5 |
| `GET /api/market/sectors` | 2.5 |
| `GET /api/market/kpis` | 2.5 |
| `GET /api/market/breadth` | 2.5 |
| `GET /api/nifty/historical` | 2.7 |
| `GET /api/stock/quote` | 2.6 |
| `GET /api/stock/ohlcv` | 2.6 |
| `GET /api/indicators` | 2.6 |
| `POST /api/auth/register` | 3.2 |
| `POST /api/auth/login` | 3.2 |
| `POST /api/auth/refresh` | 3.2 |
| `GET /api/auth/me` | 3.2 |
| `POST /api/auth/logout` | 3.2 |
| `GET /api/watchlist` | 3.4 |
| `POST /api/watchlist` | 3.4 |
| `DELETE /api/watchlist/{symbol}` | 3.4 |
| `GET /api/portfolio/holdings` | 3.5 |
| `GET /api/portfolio/performance` | 3.5 |
| `GET /api/news/feed` | 3.7 |
| `GET /api/sentiment/score` | 3.9 |
| `GET /api/search` | 3.10 |
| `GET /api/search/trending` | 3.10 |
| `GET /api/orderbook` | 4.2 |
| `GET /api/regime/detect` | 4.3 |
| `POST /api/options/price` | 4.4 |
| `POST /api/liquidity/analyze` | 4.5 |
| `POST /api/ai/analyze` | 4.6 |
