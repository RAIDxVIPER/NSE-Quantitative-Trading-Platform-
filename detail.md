# NSE Analytics — Codebase Overview

## 1. Project Summary

This repository contains a **Quantitative Finance Analytics Platform** for the Indian stock market (NSE/BSE). It is currently split between:

1. **Backend / Data Science Layer** — `final.py`  
   A Streamlit-based Python dashboard that fetches market data, simulates order books, detects market regimes, prices options, and runs ML-based liquidity shock detection.

2. **Frontend Layer** — `nse-frontend/`  
   A premium, cinematic **Next.js 15 + TypeScript + Tailwind CSS v4** web application intended to replace/augment the Streamlit UI. It features 3D WebGL scenes (Three.js / React Three Fiber), GSAP animations, TradingView Lightweight Charts, and a glassmorphic design system.

3. **Planning Documents** — `task.md`, `implementation_plan.md`  
   Track the original requirements and the phased implementation plan for the Next.js frontend.

---

## 2. Root-Level Files

| File | Purpose |
|------|---------|
| `final.py` | Original monolithic Python dashboard. Contains all quantitative analytics, data fetching, simulation, ML, and Streamlit rendering code. |
| `implementation_plan.md` | Detailed spec for building the Next.js 15 frontend: phases, file map, dependencies, open questions, and verification plan. |
| `task.md` | High-level task tracker showing which frontend phases are complete and which remain. |
| `detail.md` | This file — a comprehensive overview of the codebase. |

---

## 3. Backend / Data Science Layer (`final.py`)

### 3.1 Runtime & Dependencies
- Built for **Streamlit** (`streamlit run dashboard.py`).
- Key Python libraries: `numpy`, `pandas`, `plotly`, `scipy`, `scikit-learn`, `yfinance` (optional live data).
- Dark-themed GitHub-style UI via Streamlit custom CSS.

### 3.2 Data Layer
- **`fetch_nse_data(symbol, period)`** — Fetches OHLCV from Yahoo Finance via `yfinance`. Falls back to realistic synthetic GBM data if offline.
- **`fetch_live_quote(symbol)`** — Latest price, change, and % change. Falls back to synthetic last-close data.
- **`_synthetic_ohlcv(symbol)`** — Geometric Brownian Motion-based realistic demo data.

### 3.3 Feature Engineering
- **`build_features(df)`** computes:
  - Returns (`returns`, `log_ret`)
  - Volatility (`vol_20`, `vol_5`)
  - Moving averages (`ma_10`, `ma_50`)
  - Momentum
  - Spread proxy, buy/sell pressure, imbalance
  - Depth proxy (with outlier clipping)
  - Forward return target (`future_ret`) for ML models

### 3.4 Modules

#### Module 1 — Real-Time Order Book
- **`simulate_order_book(mid_price, ...)`** — Generates a simulated limit order book with power-law depth decay and occasional liquidity shocks.
- **`render_order_book(...)`** — Renders bid/ask tables, mid price, spread, imbalance metrics, cumulative depth chart, and imbalance history.
- Includes auto-refresh toggle.

#### Module 2 — Market Regime Detection
- **`fit_regime_model(...)`** — Fits a Gaussian Mixture Model (GMM) on standardized OHLCV features.
- Detects regimes: Trending Bull, Mean-Reverting, High Volatility, Crash/Panic.
- Visualizes price colored by regime, regime distribution pie chart, stacked probability area chart, transition matrix heatmap, and per-regime statistics.

#### Module 3 — Options Pricing
- **`black_scholes(...)`** — Black-Scholes closed-form pricing for calls/puts.
- **`greeks(...)`** — Delta, Gamma, Vega, Theta, Rho.
- **`monte_carlo_option(...)`** — Vectorized GBM Monte Carlo simulation for European options.
- UI for strike, expiry, implied vol, risk-free rate, option type, and simulation count.

#### Module 4 — Liquidity Shock Detection
- **`run_liquidity_model(...)`** — Trains Ridge, Lasso, and ElasticNet models to predict 5-day forward returns using microstructure features.
- **`detect_liquidity_shocks(...)`** — Z-score shock detection on spread proxy.
- **`monte_carlo_stress(...)`** — Bootstrap Monte Carlo PnL distribution.
- Outputs model comparison, feature importance, predicted vs actual scatter, VaR/CVaR, and volatility shock overlay.

### 3.5 Sidebar & Main Entry Point
- Sidebar lets users select symbol and number of GMM regimes.
- `main()` orchestrates data fetch, source notification, and tabbed module rendering.

---

## 4. Frontend Layer (`nse-frontend/`)

### 4.1 Technology Stack

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 15.x | React framework, App Router, Turbopack dev server |
| React | 19.x | UI library |
| TypeScript | 5.7.x | Type safety |
| Tailwind CSS | 4.x | CSS-first styling with `@theme` custom properties |
| Three.js | 0.170 | 3D graphics |
| @react-three/fiber | 8.x | React renderer for Three.js |
| @react-three/drei | 9.x | R3F helpers (Html, PerformanceMonitor, Preload) |
| GSAP | 3.12.5 | ScrollTrigger + timeline animations |
| Framer Motion | 11.x | Component-level motion, layout animations |
| TanStack Query | 5.x | Server-state fetching/caching/refetching |
| Zustand | 5.x | Client state management |
| lightweight-charts | 4.x | TradingView candlestick/line/area charts |
| lucide-react | 0.468 | Iconography |
| clsx + tailwind-merge | latest | Conditional class merging (`cn()`) |

### 4.2 Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config: strict mode, WebP images, optimizePackageImports for `lucide-react`, `framer-motion`, `@react-three/drei`. |
| `tsconfig.json` | TypeScript config with path alias `@/*` → `./*`. |
| `postcss.config.mjs` | Tailwind v4 PostCSS plugin (`@tailwindcss/postcss`). |
| `package.json` | Scripts (`dev`, `build`, `start`, `lint`) and full dependency list. |
| `.env.local` | `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` |

### 4.3 Directory Structure

```
nse-frontend/
├── app/
│   ├── globals.css        # Design system, Tailwind v4 theme, custom utilities
│   ├── layout.tsx         # Root layout: providers, ambient glow, mouse tracker, 3D mount
│   └── page.tsx           # Home page assembly (Hero, Dashboard, Analytics)
├── components/
│   ├── 3d/                # Three.js scene components
│   │   ├── Scene.tsx
│   │   ├── ParticleField.tsx
│   │   ├── CandlestickChart3D.tsx
│   │   ├── Globe.tsx
│   │   └── HolographicCard.tsx
│   ├── charts/            # Charting components
│   │   ├── LightweightChart.tsx
│   │   ├── AllocationRing.tsx
│   │   └── SectorBars.tsx
│   ├── common/            # Reusable UI primitives
│   │   ├── GlassCard.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── Ticker.tsx
│   │   └── PriceBadge.tsx
│   ├── layout/            # Layout components
│   │   ├── Navbar.tsx
│   │   └── CommandMenu.tsx
│   ├── providers/         # Context/provider wrappers
│   │   ├── QueryProvider.tsx
│   │   └── MouseTracker.tsx
│   └── sections/          # Page sections
│       ├── Hero.tsx
│       ├── Dashboard.tsx
│       ├── Analytics.tsx
│       └── (Portfolio, News, Search, About, Footer — not yet built)
├── hooks/                 # Custom React hooks
│   ├── useMousePosition.ts
│   ├── useScrollProgress.ts
│   └── useLiveData.ts
├── lib/                   # Core logic, state, utilities, mock data
│   ├── api.ts
│   ├── store.ts
│   ├── utils.ts
│   ├── gsap.ts
│   └── mock-data.ts
```

### 4.4 Design System (`app/globals.css`)

- **Color palette** (dark cinematic):
  - Backgrounds: `#050508` (void), `#0A0A12` (surface), `#111120` (elevated)
  - Accents: Indigo `#6C63FF`, Cyan `#00D4FF`, Gold `#F5A623`, Crimson `#FF3B6B`, Emerald `#00E5A0`
  - Text: `#F0F0FF` primary, `#7878A0` secondary, `#3A3A5C` tertiary
- **Typography**: Clash Display (display), Space Grotesk (fallback), Inter (body), Geist Mono (mono).
- **Glassmorphism**: `glass`, `glass-hover`, backdrop blur, top-edge shine.
- **Spotlight cursor**: CSS variables `--cursor-x` / `--cursor-y` driven by mouse.
- **Animations**: shimmer, pulse-dot, float, marquee, scroll-dot, ripple, typewriter-cursor.
- **Custom utilities**: `.text-hero`, `.text-gradient`, `.text-outline`, pill badges, buttons.
- **Responsive**: Adjusts hero/heading sizes for mobile/tablet.

### 4.5 State Management

#### Zustand Store (`lib/store.ts`)
Key slices:
- **Navigation**: `activeSection`, nav scrolled, mobile menu, page loaded.
- **Selected Stock**: `selectedStock` (default `^NSEI` / NIFTY 50).
- **Search**: `isSearchOpen`, open/close/toggle.
- **3D Quality**: `qualityLevel` (high/medium/low) → `particleCount` (8000/4000/2000).
- **Watchlist**: Add/remove tracked symbols.
- **Analytics**: `selectedTimeframe`, `selectedChartType` (candles/line/area/bars), `activeIndicators` (RSI toggle, etc.).

#### TanStack Query (`components/providers/QueryProvider.tsx`)
- Default stale time: 60s.
- `refetchOnWindowFocus: false`, retry once.

### 4.6 Data Layer (`lib/api.ts`)

A centralized API hook file built on TanStack Query. Every hook tries a real REST endpoint and falls back to mock data if unreachable.

| Hook | Endpoint | Fallback |
|------|----------|----------|
| `useMarketTickers()` | `GET /api/market/tickers` | `MOCK_TICKERS` |
| `useMarketMovers()` | `GET /api/market/movers` | `MOCK_GAINERS` / `MOCK_LOSERS` |
| `useNiftyHistorical(tf)` | `GET /api/nifty/historical?timeframe=` | `MOCK_NIFTY_OHLCV` |
| `useStockQuote(symbol)` | `GET /api/stock/quote?symbol=` | matched ticker |
| `useStockOHLCV(symbol, tf)` | `GET /api/stock/ohlcv?symbol=&tf=` | `MOCK_NIFTY_OHLCV` |
| `useIndicators(symbol, tf)` | `GET /api/indicators?symbol=&tf=` | random RSI/MACD/BB arrays |
| `useWatchlist()` | `GET /api/watchlist` | `MOCK_WATCHLIST` |
| `usePortfolioHoldings()` | `GET /api/portfolio/holdings` | `MOCK_HOLDINGS` |
| `usePortfolioPerformance(period)` | `GET /api/portfolio/performance?period=` | generated data |
| `useNewsFeed()` | `GET /api/news/feed` | `MOCK_NEWS` |
| `useSentiment()` | `GET /api/sentiment/score` | `MOCK_SENTIMENT` |
| `useSearch(query)` | `GET /api/search?q=` | filtered `MOCK_SEARCH_RESULTS` |
| `useSectorPerformance()` | `GET /api/market/sectors` | `MOCK_SECTORS` |
| `useMarketKPIs()` | `GET /api/market/kpis` | `MOCK_KPIS` |
| `useMarketBreadth()` | `GET /api/market/breadth` | `MOCK_BREADTH` |
| `useAIAnalysis()` | `POST /api/ai/analyze` | `MOCK_AI_ANALYSIS` |

Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL` (defaults to empty string, so relative `/api/*` calls).

### 4.7 Mock Data (`lib/mock-data.ts`)
Provides TypeScript types and static mock datasets for every entity used in the frontend:
- Tickers, OHLCV bars, watchlist items, holdings, news, sectors, market movers, search results, sentiment, AI analysis, KPIs, market breadth.
- Helper functions: `generateOHLCV()`, `miniSparkline()`, `generatePortfolioPerformance()`.

### 4.8 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useMousePosition(lerpFactor)` | Tracks cursor with linear interpolation, writes `--cursor-x/y` CSS vars for spotlight cursor. |
| `useScrollProgress()` | Returns scroll progress, `scrollY`, and `isScrolled` boolean. |
| `useLiveData(intervalMs)` | Periodically invalidates `market`, `stock`, and `watchlist` query caches. |

### 4.9 Utilities (`lib/utils.ts`)
- `cn(...)` — className merger.
- Formatters: currency, price, percent, volume, compact number, timestamp, date.
- Helpers: `lerp`, `mapRange`, `randomBetween`, `getDeltaSymbol`, `getDeltaColor`.

### 4.10 GSAP Utilities (`lib/gsap.ts`)
- Registers `ScrollTrigger` on the client.
- Exports easing constants (`EASE_OUT_EXPO`, `EASE_OUT_QUART`).
- `splitTextIntoWords()` / `animateTextReveal()` — custom replacement for GSAP SplitText.
- `animateStaggerEntrance()` — reusable scroll-triggered entrance animations.

### 4.11 Component Inventory

#### Common Components
- **`GlassCard`** — Glassmorphic container with top shine, hover lift, configurable glow.
- **`SkeletonLoader`** — Skeleton blocks, text, card, chart, and table variants.
- **`Ticker`** — Stock ticker display with symbol, price, change. Includes `TickerStrip` (marquee) and `Sparkline` (mini SVG chart).
- **`PriceBadge`** — Positive/negative/neutral delta pill.

#### Layout Components
- **`Navbar`** — Fixed glass nav with logo, links, live badge, IST clock, search trigger (⌘K), mobile menu.
- **`CommandMenu`** — ⌘K modal with debounced search, keyboard navigation (↑↓/Enter/Esc), grouped results, mock API integration.

#### 3D Components
- **`Scene`** — Persistent R3F Canvas with PerformanceMonitor-based quality adaptation, ambient + point lights.
- **`ParticleField`** — 8,000 (configurable) animated particles with drift, mouse parallax, and wrap-around.
- **`CandlestickChart3D`** — Procedurally generated 3D candlestick bars with breathing animation.
- **`Globe`** — Dot-matrix globe with exchange pings, arcs, atmosphere glow, slow rotation.
- **`HolographicCard`** — Floating HTML-in-3D card with holographic edge glow.

#### Chart Components
- **`LightweightChart`** — TradingView Lightweight Charts wrapper supporting candles, bars, line, and area. Themed for dark mode.
- **`AllocationRing`** — Animated SVG donut chart with segments and center label.
- **`SectorBars`** — Animated horizontal bar chart for sector performance.

#### Section Components
- **`Hero`** — Full-viewport hero with GSAP text reveal, KPI stat cards, CTA buttons, ticker marquee, scroll indicator.
- **`Dashboard`** — KPI cards, NIFTY chart with timeframe selector, watchlist, market breadth donut, sector bars, top gainers/losers.
- **`Analytics`** — Stock selector, chart type + timeframe controls, TradingView chart, indicator toggles (RSI/MACD mini-charts), AI analysis panel with typewriter effect.
- **Planned but not built**: `Portfolio`, `News`, `Search`, `About`, `Footer`.

---

## 5. Current Build Status

According to `task.md`:

### ✅ Completed
- Project scaffolding & config
- Core infrastructure (API hooks, store, utils, GSAP, mock data)
- Reusable UI components (GlassCard, SkeletonLoader, Ticker, PriceBadge)
- Layout components (Navbar, CommandMenu)
- Three.js 3D scene (Scene, ParticleField, CandlestickChart3D, Globe, HolographicCard)
- Chart components (LightweightChart, AllocationRing, SectorBars)
- Page sections: Hero, Dashboard, Analytics
- Providers wrapper

### ⏳ Incomplete
- `components/sections/Portfolio.tsx`
- `components/sections/News.tsx`
- `components/sections/Search.tsx`
- `components/sections/About.tsx`
- `components/sections/Footer.tsx`
- Final `app/page.tsx` assembly for all sections
- Full verification (`npm run build` + `npm run lint`)

> Note: `app/page.tsx` currently imports only `Hero`, `Dashboard`, and `Analytics`; the remaining sections are commented out.

---

## 6. Data Flow

1. **User opens page** → `layout.tsx` mounts providers, ambient glows, mouse tracker, and 3D canvas root.
2. **`page.tsx` mounts** `Navbar`, `CommandMenu`, `Scene`, `Hero`, `Dashboard`, `Analytics`.
3. **Data fetching** happens through TanStack Query hooks in `lib/api.ts`.
   - First attempts real REST call to `NEXT_PUBLIC_API_BASE_URL`.
   - On failure/empty, returns mock data from `lib/mock-data.ts`.
4. **State** is shared via Zustand (`lib/store.ts`) for UI state and selected stock/timeframe/chart type.
5. **Charts** receive OHLCV arrays and render via `lightweight-charts`.
6. **3D scene** runs in a fixed background Canvas and reacts to performance + mouse.
7. **Live data** is refreshed by `useLiveData` invalidating query caches every 30s.

---

## 7. API Assumptions

The frontend expects a Python backend (likely FastAPI/Flask) exposing these endpoints:

```
GET  /api/market/tickers
GET  /api/market/movers
GET  /api/nifty/historical?timeframe=
GET  /api/stock/quote?symbol=
GET  /api/stock/ohlcv?symbol=&tf=
GET  /api/indicators?symbol=&tf=
GET  /api/watchlist
GET  /api/portfolio/holdings
GET  /api/portfolio/performance?period=
GET  /api/news/feed
GET  /api/sentiment/score
GET  /api/search?q=
GET  /api/market/sectors
GET  /api/market/kpis
GET  /api/market/breadth
POST /api/ai/analyze
```

Until the backend exists, the frontend is fully demo-able with mock data.

---

## 8. Notable Implementation Details

- **Tailwind v4 CSS-first config** — No `tailwind.config.ts`; theming is done inside `globals.css` via `@theme`.
- **Custom SplitText replacement** — `lib/gsap.ts` implements word-splitting without the paid GSAP Club plugin.
- **Performance-adaptive 3D** — `PerformanceMonitor` in `Scene.tsx` lowers particle count if FPS drops.
- **Spotlight cursor** — Implemented via CSS custom properties updated by `useMousePosition`.
- **Command palette** — Fully keyboard-navigable search modal wired to Zustand selection.
- **Responsive** — Mobile menu, adaptive typography, grid reflows.
- **Accessibility** — `prefers-reduced-motion` media query disables animations and spotlight cursor.

---

## 9. How to Run

### Streamlit Backend
```bash
pip install -r requirements.txt   # numpy, pandas, plotly, scipy, scikit-learn, yfinance, streamlit
streamlit run final.py
```

### Next.js Frontend
```bash
cd nse-frontend
npm install
npm run dev      # http://localhost:3000 with Turbopack
npm run lint     # ESLint
npm run build    # Production build + TypeScript check
```

---

## 10. Summary of Key Files

| Path | What it does |
|------|--------------|
| `final.py` | Streamlit quant dashboard with order book, GMM regimes, options pricing, liquidity ML. |
| `implementation_plan.md` | Full Next.js build plan and open questions. |
| `task.md` | Phase checklist. |
| `nse-frontend/app/layout.tsx` | Root layout, metadata, providers, ambient visuals. |
| `nse-frontend/app/page.tsx` | Section assembly. |
| `nse-frontend/app/globals.css` | Design tokens, utilities, animations. |
| `nse-frontend/lib/api.ts` | All TanStack Query hooks with API + mock fallback. |
| `nse-frontend/lib/store.ts` | Zustand global state. |
| `nse-frontend/lib/mock-data.ts` | Types and mock datasets. |
| `nse-frontend/lib/utils.ts` | Formatters and helper functions. |
| `nse-frontend/lib/gsap.ts` | GSAP setup and custom text animations. |
| `nse-frontend/components/3d/Scene.tsx` | WebGL canvas root. |
| `nse-frontend/components/sections/Dashboard.tsx` | Main market dashboard. |
| `nse-frontend/components/sections/Analytics.tsx` | Technical chart + AI analysis. |
| `nse-frontend/components/layout/CommandMenu.tsx` | ⌘K search. |

---

*Generated: 2026-07-13*
