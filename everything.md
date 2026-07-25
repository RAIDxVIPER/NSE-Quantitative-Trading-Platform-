# NSE Quantitative Trading Platform — Complete Project Reference

> **Document purpose:** One source of truth for the stack, functionality, workflow, and current state of the project.
> 
> **Last updated:** 2026-07-16
> 
> **Important note on accuracy:** Some planning/verification files (e.g., `task.md`, `.kimchi/docs/final-verification.md`) describe a state where all frontend sections are wired and React was downgraded to v18. The **actual checked-in code** differs. This document reflects the real files on disk, with discrepancies called out explicitly.

---

## 1. Project Overview

**Name:** NSE Quantitative Trading Platform  
**Domain:** Indian equity market analytics (NSE/BSE) with a quantitative-finance focus.  
**Architecture:** Two-layer system:

1. **Backend / Quant Layer** — `final.py`  
   A Streamlit dashboard that fetches/synthesizes market data and runs four quantitative modules: order-book simulation, market-regime detection, options pricing, and ML-based liquidity-shock detection.

2. **Frontend / Presentation Layer** — `nse-frontend/`  
   A cinematic Next.js 15 + TypeScript + Tailwind CSS v4 web application. It uses Three.js/R3F for 3D visuals, GSAP/Framer Motion for animation, TradingView Lightweight Charts for charts, TanStack Query for server state, and Zustand for client state.

The frontend is designed to call a Python REST backend at `/api/*`, but **no backend API server is implemented yet**; the frontend falls back to mock data for every endpoint.

---

## 2. Repository Layout

```
/mnt/c/Users/ronit/OneDrive/Desktop/test/
├── .git/                                   # Git repository
├── .kimchi/
│   └── docs/
│       ├── final-verification.md           # Claims ALL_PASS with all sections wired
│       ├── implementation-plan.md          # Original phased build plan
│       ├── review.md                       # Review that flagged 2 Portfolio bugs
│       └── verification.md                 # Fix verification for Portfolio bugs
├── README.md                               # Project title only
├── task.md                                 # Frontend phase checklist (partially outdated)
├── detail.md                               # Codebase overview (partially outdated)
├── implementation_plan.md                  # Duplicate/spec of the frontend plan
├── final.py                                # Streamlit quant dashboard
├── everything.md                           # This file
└── nse-frontend/                           # Next.js frontend
    ├── app/
    │   ├── globals.css                     # Design system (Tailwind v4 CSS-first)
    │   ├── layout.tsx                      # Root layout + providers
    │   ├── page.tsx                        # Home page (currently Hero + Footer only)
    │   ├── about/
    │   │   └── page.tsx                    # About page route
    │   ├── analytics/
    │   │   └── page.tsx                    # Analytics page route
    │   ├── dashboard/
    │   │   └── page.tsx                    # Dashboard page route
    │   ├── news/
    │   │   └── page.tsx                    # News page route
    │   └── portfolio/
    │       └── page.tsx                    # Portfolio page route
    ├── components/
    │   ├── 3d/                             # Three.js scene components
    │   ├── charts/                         # Chart wrappers
    │   ├── common/                         # Reusable UI primitives
    │   ├── layout/                         # Navbar, CommandMenu
    │   ├── providers/                      # QueryProvider, MouseTracker
    │   └── sections/                       # Page sections
    ├── hooks/                              # Custom React hooks
    ├── lib/                                # api.ts, store.ts, utils.ts, mock-data.ts, gsap.ts
    ├── global.d.ts                         # Marker for R3F JSX namespace
    ├── next.config.ts                      # Next.js config
    ├── package.json                        # Dependencies
    ├── postcss.config.mjs                  # Tailwind v4 PostCSS plugin
    └── tsconfig.json                       # TypeScript config
```

---

## 3. Backend / Quant Layer (`final.py`)

### 3.1 Runtime
- **Framework:** Streamlit
- **Run command:** `streamlit run final.py`
- **Key dependencies:** `numpy`, `pandas`, `plotly`, `scipy`, `scikit-learn`, `yfinance` (optional live data)
- **UI theme:** Custom dark GitHub-style CSS injected via `st.markdown`

### 3.2 Data Layer

| Function | Purpose |
|----------|---------|
| `fetch_nse_data(symbol, period)` | Fetches OHLCV from Yahoo Finance via `yfinance`; falls back to synthetic GBM data. |
| `fetch_live_quote(symbol)` | Latest price, change, % change; falls back to synthetic last-close data. |
| `_synthetic_ohlcv(symbol)` | Geometric Brownian Motion-based realistic demo data. |
| `build_features(df)` | Computes returns, volatilities, moving averages, momentum, spread proxy, buy/sell pressure, imbalance, depth proxy, and a forward-return target for ML. |

### 3.3 Module 1 — Real-Time Order Book
- **`simulate_order_book(mid_price, ...)`**: Simulated limit order book with power-law depth decay and random liquidity shocks.
- **`render_order_book(...)`**: Bid/ask tables, mid price, spread, imbalance, cumulative depth chart, imbalance history, and auto-refresh toggle.

### 3.4 Module 2 — Market Regime Detection
- **`fit_regime_model(...)`**: Gaussian Mixture Model (GMM) on standardized OHLCV features.
- Detects regimes: Trending Bull, Mean-Reverting, High Volatility, Crash/Panic.
- Visualizes price colored by regime, regime distribution pie chart, stacked probability area chart, transition matrix heatmap, and per-regime statistics.

### 3.5 Module 3 — Options Pricing
- **`black_scholes(...)`**: Closed-form Black-Scholes for calls/puts.
- **`greeks(...)`**: Delta, Gamma, Vega, Theta, Rho.
- **`monte_carlo_option(...)`**: Vectorized GBM Monte Carlo for European options.
- UI inputs: strike, expiry, implied vol, risk-free rate, option type, simulation count.

### 3.6 Module 4 — Liquidity Shock Detection
- **`run_liquidity_model(...)`**: Trains Ridge, Lasso, and ElasticNet models to predict 5-day forward returns from microstructure features.
- **`detect_liquidity_shocks(...)`**: Z-score shock detection on spread proxy.
- **`monte_carlo_stress(...)`**: Bootstrap Monte Carlo PnL distribution.
- Outputs: model comparison, feature importance, predicted-vs-actual scatter, VaR/CVaR, volatility-shock overlay.

### 3.7 Entry Point
- Sidebar selects symbol and number of GMM regimes.
- `main()` orchestrates data fetch, source notification, and tabbed module rendering.

---

## 4. Frontend Stack (`nse-frontend/`)

### 4.1 Actual Installed Versions (from `npm ls`)

| Package | Version | Role |
|---------|---------|------|
| `next` | 15.5.20 | React framework, App Router |
| `react` | 19.2.7 | UI library |
| `react-dom` | 19.2.7 | DOM renderer |
| `@react-three/fiber` | 9.6.1 | React renderer for Three.js |
| `@react-three/drei` | 10.7.7 | R3F helpers |
| `three` | 0.170.0 | 3D graphics library |
| `@tanstack/react-query` | 5.101.2 | Server-state fetching/caching |
| `zustand` | 5.0.2 (with `tunnel-rat` using zustand 4.5.7) | Client state |
| `tailwindcss` | 4.0.0 | CSS-first styling |
| `@tailwindcss/postcss` | 4.0.0 | Tailwind v4 PostCSS plugin |
| `framer-motion` | 11.18.2 | Component motion |
| `gsap` | 3.12.5 | ScrollTrigger/timeline animations |
| `lightweight-charts` | 4.2.1 | TradingView charts |
| `lucide-react` | 0.468.0 | Icons |
| `clsx` / `tailwind-merge` | latest | Class merging |

> **Note:** `final-verification.md` claims React was downgraded to 18.3.1 and `@react-three/fiber` pinned to 8.x. The actual `package.json` and `node_modules` still list React 19.x and R3F 9.x / Drei 10.x.

### 4.2 Configuration

- **`next.config.ts`**: Strict mode, WebP images, `transpilePackages` for `three`, `@react-three/fiber`, `@react-three/drei`, experimental `optimizePackageImports` for `lucide-react` and `framer-motion`.
- **`tsconfig.json`**: Path alias `@/*` maps to `./*`.
- **`postcss.config.mjs`**: Loads `@tailwindcss/postcss`.
- **`.env.local`**: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` (assumed; referenced in docs).

### 4.3 Design System (`app/globals.css`)

- **Color palette** (dark cinematic):
  - Void background: `#050508`
  - Surface: `#0A0A12`
  - Elevated: `#111120`
  - Accents: Indigo `#6C63FF`, Cyan `#00D4FF`, Gold `#F5A623`, Crimson `#FF3B6B`, Emerald `#00E5A0`
  - Text: `#F0F0FF` primary, `#7878A0` secondary, `#3A3A5C` tertiary
- **Typography**: Clash Display (display, requires `/public/fonts/ClashDisplay-Variable.woff2`), Space Grotesk fallback, Inter body, Geist Mono mono.
- **Glassmorphism**: `.glass`, `.glass-hover`, backdrop blur, top-edge shine.
- **Spotlight cursor**: CSS vars `--cursor-x` / `--cursor-y` updated by `MouseTracker`.
- **Animations**: shimmer, pulse-dot, float, marquee, scroll-dot, ripple, typewriter-cursor.
- **Responsive**: Hero/heading sizes clamp for mobile/tablet.
- **Accessibility**: `prefers-reduced-motion` disables animations and spotlight cursor.

### 4.4 State Management

#### Zustand (`lib/store.ts`)
- Navigation: `activeSection`, scrolled state, mobile menu, page loaded.
- Selected stock: default `^NSEI` (NIFTY 50).
- Search: open/close/toggle.
- 3D quality: `qualityLevel` → particle count 8000/4000/2000.
- Watchlist: add/remove tracked symbols.
- Analytics: `selectedTimeframe`, `selectedChartType` (candles/line/area/bars), `activeIndicators` (RSI toggle, etc.).

#### TanStack Query (`components/providers/QueryProvider.tsx`)
- Default stale time: 60s.
- `refetchOnWindowFocus: false`, retry once.

### 4.5 Data Layer (`lib/api.ts`)

All hooks try a real REST endpoint and fall back to mock data if unreachable.

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

Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL` (defaults to empty string → relative `/api/*`).

### 4.6 Mock Data (`lib/mock-data.ts`)

Provides TypeScript types and static mock datasets for:
- Tickers, OHLCV bars, watchlist items, holdings, news, sectors, market movers, search results, sentiment, AI analysis, KPIs, market breadth.
- Helpers: `generateOHLCV()`, `miniSparkline()`, `generatePortfolioPerformance()`.

### 4.7 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useMousePosition(lerpFactor)` | Cursor tracking with lerp; writes `--cursor-x/y` CSS vars. |
| `useScrollProgress()` | Scroll progress, `scrollY`, `isScrolled`. |
| `useLiveData(intervalMs)` | Invalidates `market`, `stock`, `watchlist` queries every 30s. |

### 4.8 Utilities

- `lib/utils.ts`: `cn(...)` class merger; formatters for currency, price, percent, volume, compact numbers, timestamps; `lerp`, `mapRange`, `randomBetween`, delta helpers.
- `lib/gsap.ts`: Registers `ScrollTrigger`; custom `splitTextIntoWords` / `animateTextReveal` replacement for GSAP SplitText; `animateStaggerEntrance`.

---

## 5. Frontend Components

### 5.1 Common Components (`components/common/`)
- **`GlassCard`** — Glassmorphic container with top shine, hover lift, configurable glow.
- **`SkeletonLoader`** — Skeleton blocks, text, card, chart, and table variants.
- **`Ticker`** — Stock ticker with symbol, price, change; includes `TickerStrip` (marquee) and `Sparkline`.
- **`PriceBadge`** — Positive/negative/neutral delta pill.

### 5.2 Layout Components (`components/layout/`)
- **`Navbar`** — Fixed glass nav with logo, links, live badge, IST clock, search trigger (⌘K), mobile menu.
- **`CommandMenu`** — ⌘K modal with debounced search, keyboard navigation (↑↓/Enter/Esc), grouped results.

### 5.3 3D Components (`components/3d/`)
- **`Scene`** — Persistent R3F Canvas with `PerformanceMonitor` adaptive quality; loaded dynamically with `ssr: false`.
- **`ParticleField`** — 8,000 animated particles with drift and mouse parallax.
- **`CandlestickChart3D`** — Procedural 3D candlesticks with breathing animation.
- **`Globe`** — Dot-matrix globe with exchange pings, arcs, atmosphere glow.
- **`HolographicCard`** — Floating HTML-in-3D card with holographic edge glow.

> **Note:** `global.d.ts` is a marker file for R3F JSX namespace augmentation. With React 19 + R3F 9.x, the augmentation mechanism may differ from the R3F v8 era.

### 5.4 Chart Components (`components/charts/`)
- **`LightweightChart`** — TradingView Lightweight Charts wrapper (candles/line/area/bars); dark-themed.
- **`AllocationRing`** — Animated SVG donut chart.
- **`SectorBars`** — Animated horizontal sector-performance bars.

### 5.5 Page Sections (`components/sections/`)
All eight section components exist:
1. **`Hero`** — Full-viewport hero with GSAP text reveal, KPI cards, ticker marquee, scroll indicator.
2. **`Dashboard`** — KPI cards, NIFTY chart + timeframe selector, watchlist, breadth donut, sector bars, top movers.
3. **`Analytics`** — Stock selector, chart type/timeframe controls, TradingView chart, RSI/MACD overlays, AI analysis typewriter panel.
4. **`Portfolio`** — Holdings table, summary cards, sector allocation ring, performance area chart.
5. **`News`** — Featured card, sentiment gauge, masonry grid with category icons, relative timestamps.
6. **`Search`** — ⌘K-style search with typewriter placeholder, debounced grouped results, popular tickers empty state.
7. **`About`** — Two-column layout, feature cards, tech stack row.
8. **`Footer`** — 4-column footer with ambient glow, links, social icons, back-to-top.

### 5.6 Current Page Assembly (`app/page.tsx`)

As of the checked-in code, `app/page.tsx` renders only:

```tsx
<Navbar />
<CommandMenu />
<Scene />
<Hero />
<Footer />
```

`Dashboard`, `Analytics`, `Portfolio`, `News`, `Search`, and `About` are **not imported or rendered** on the home page. They exist as standalone files and some have dedicated route folders (`/dashboard`, `/analytics`, `/portfolio`, `/news`, `/about`), but those route files have not been inspected here.

> **Discrepancy:** `.kimchi/docs/final-verification.md` and the explore summary claim `app/page.tsx` renders all 8 sections in order. The actual `app/page.tsx` does not.

---

## 6. Data Flow

1. **User opens `/`** → `layout.tsx` mounts `QueryProvider`, ambient glows, `MouseTracker`, and the 3D canvas mount point.
2. **`page.tsx` mounts** `Navbar`, `CommandMenu`, `Scene` (dynamic, SSR-off), `Hero`, `Footer`.
3. **Data fetching** happens through TanStack Query hooks in `lib/api.ts`.
   - First attempts a real REST call to `NEXT_PUBLIC_API_BASE_URL`.
   - On failure/empty, returns mock data from `lib/mock-data.ts`.
4. **State** is shared via Zustand for UI state and selected stock/timeframe/chart type.
5. **Charts** receive OHLCV arrays and render via `lightweight-charts`.
6. **3D scene** runs in a fixed background Canvas and reacts to performance + mouse.
7. **Live data** is refreshed by `useLiveData` invalidating query caches every 30s.

---

## 7. API Contract (Assumed Backend)

The frontend expects a Python backend (FastAPI/Flask) exposing:

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

## 8. Build & Verification Status

### 8.1 Claims from `.kimchi/docs/final-verification.md`
- Verdict: **ALL_PASS**
- `npm run build` exit code 0
- `npm run lint` passes
- All 8 sections wired in `app/page.tsx`
- React downgraded to 18.3.1, R3F pinned to 8.x

### 8.2 Actual Checked-In State (as of 2026-07-16)
- `package.json` declares React 19.x and R3F 9.x / Drei 10.x; `npm ls` confirms React 19.2.7 is installed.
- `app/page.tsx` imports and renders only `Hero` and `Footer` (plus `Navbar`, `CommandMenu`, `Scene`).
- All section component files exist, but most are not used on the home page.
- The project has **not been rebuilt in this session**, so the current pass/fail status of `npm run build` and `npm run lint` is unknown against the checked-in files.

### 8.3 Known Pre-existing Issues
1. **CSS `@import` order warning** — Google Fonts `@import` appears after other rules in `globals.css`.
2. **Lint warnings**:
   - `lib/api.ts:6` — unused `UseQueryOptions` import.
   - `lib/store.ts:53` — unused `get` parameter.
3. **Font licensing** — Clash Display is commercial; Space Grotesk fallback is defined.
4. **Backend not implemented** — frontend runs entirely on mock data.
5. **Potential R3F + React 19 compatibility** — docs describe a React 18 downgrade to resolve JSX namespace errors, but the repo currently ships React 19 + R3F 9. Type-check results against this combination have not been verified here.

### 8.4 Reviewed & Fixed Issues (from `review.md` / `verification.md`)
- **Portfolio rupee symbol** — `₹` escape sequences were replaced with the actual `₹` character.
- **Portfolio chart-type state mutation** — `LightweightChart` now accepts an optional `chartType` prop; Portfolio passes `chartType="area"` instead of mutating global store.

---

## 9. How to Run

### 9.1 Streamlit Backend
```bash
pip install -r requirements.txt   # numpy, pandas, plotly, scipy, scikit-learn, yfinance, streamlit
streamlit run final.py
```

### 9.2 Next.js Frontend
```bash
cd nse-frontend
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint
npm run build    # Production build + TypeScript check
```

---

## 10. File-by-File Reference

| Path | What it does |
|------|--------------|
| `final.py` | Streamlit quant dashboard with order book, GMM regimes, options pricing, liquidity ML. |
| `implementation_plan.md` / `.kimchi/docs/implementation-plan.md` | Original Next.js build plan and open questions. |
| `task.md` | Frontend phase checklist; partially outdated. |
| `detail.md` | Codebase overview; partially outdated. |
| `.kimchi/docs/review.md` | Review findings on new sections + pre-existing issues. |
| `.kimchi/docs/verification.md` | Verification that Portfolio fixes resolved review issues. |
| `.kimchi/docs/final-verification.md` | Claims final ALL_PASS; actual code differs in section wiring and React version. |
| `nse-frontend/app/layout.tsx` | Root layout, metadata, providers, ambient visuals. |
| `nse-frontend/app/page.tsx` | Home page assembly (currently Hero + Footer only). |
| `nse-frontend/app/globals.css` | Design tokens, utilities, animations. |
| `nse-frontend/lib/api.ts` | All TanStack Query hooks with API + mock fallback. |
| `nse-frontend/lib/store.ts` | Zustand global state. |
| `nse-frontend/lib/mock-data.ts` | Types and mock datasets. |
| `nse-frontend/lib/utils.ts` | Formatters and helper functions. |
| `nse-frontend/lib/gsap.ts` | GSAP setup and custom text animations. |
| `nse-frontend/global.d.ts` | R3F JSX namespace marker. |
| `nse-frontend/components/3d/Scene.tsx` | WebGL canvas root (dynamic, SSR-off). |
| `nse-frontend/components/sections/Hero.tsx` | Hero section. |
| `nse-frontend/components/sections/Dashboard.tsx` | Market dashboard section. |
| `nse-frontend/components/sections/Analytics.tsx` | Technical chart + AI analysis section. |
| `nse-frontend/components/sections/Portfolio.tsx` | Portfolio section (review fixes applied). |
| `nse-frontend/components/layout/CommandMenu.tsx` | ⌘K search modal. |

---

## 11. Summary

- **Backend:** A complete Streamlit quantitative dashboard with four modules (order book, regime detection, options pricing, liquidity shock detection).
- **Frontend:** A premium Next.js 15 + Tailwind v4 + Three.js application. All planned component files exist, but the home page currently only wires `Hero` and `Footer`.
- **API:** No real backend API is implemented; the frontend uses mock data fallbacks.
- **Build/docs discrepancy:** Verification documents claim an ALL_PASS state with all sections wired and React 18, but the actual checked-in `package.json` and `app/page.tsx` do not match those claims.
- **Next steps to finish:** wire the remaining sections into `app/page.tsx`, verify `npm run build` and `npm run lint` against the current React/R3F versions, and optionally implement the Python REST API so the frontend can use live data.
