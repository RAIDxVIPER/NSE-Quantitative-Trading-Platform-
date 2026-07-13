# NSE Analytics — Premium Next.js Frontend

Transform the existing Streamlit-based NSE Quantitative Finance Dashboard into an Awwwards-level cinematic web experience using Next.js 15, Three.js, GSAP, and TradingView charts.

## Background

Your existing [final.py](file:///c:/Users/ronit/OneDrive/Desktop/test/final.py) contains 4 modules:
1. **Real-time Order Book** — simulated LOB with depth charts
2. **Market Regime Detection** — GMM clustering on OHLCV features
3. **Options Pricing** — Black-Scholes + Monte Carlo
4. **Liquidity Shock Detection** — ML stress testing with Ridge/Lasso/ElasticNet

The frontend will call REST API endpoints (assumed available at `/api/*`) and render all data with premium visuals.

## User Review Required

> [!IMPORTANT]
> **API Backend**: The plan assumes your Python backend exposes REST endpoints at the paths listed in the spec (e.g., `/api/market/tickers`, `/api/stock/quote`, etc.). If these endpoints don't exist yet, you'll need to wrap your existing Python functions in a FastAPI/Flask server. The frontend will use mock data as fallback until APIs are live.

> [!WARNING]
> **Font Licensing**: Clash Display is a commercial font from Indian Type Foundry. The plan uses it via CSS `@font-face` with files in `/public/fonts/`. You'll need to provide the font files or we can substitute with a free alternative (e.g., Space Grotesk).

> [!IMPORTANT]
> **Tailwind CSS v4**: You specified Tailwind v4 which uses the new CSS-first configuration (`@import "tailwindcss"` in CSS). This is a significant departure from v3's `tailwind.config.js`. The plan uses v4's native approach.

## Open Questions

> [!IMPORTANT]
> 1. **ShadCN UI**: ShadCN requires a `components.json` config and CLI init. Should I run `npx shadcn@latest init` during setup, or manually create the needed components (Button, Dialog, Toggle, Accordion, etc.)?
> 2. **Clash Display font files**: Do you have the `.woff2` files, or should I use a free alternative like Space Grotesk / Syne?
> 3. **Lenis smooth scroll**: Lenis is a third-party smooth scroll library. It can conflict with native scroll in some browsers. Should I include it, or use CSS `scroll-behavior: smooth` as a lighter alternative?
> 4. **GSAP SplitText**: SplitText is a GSAP Club plugin (paid). Should I implement a custom text-splitting utility instead?

## Proposed Changes

Given the massive scope (~40+ files), I'll build this in phases. Here's the full file map:

---

### Phase 1: Project Scaffolding & Design System

#### [NEW] Next.js 15 project initialization
- `npx create-next-app@latest ./nse-frontend` with TypeScript, Tailwind v4, App Router, ESLint
- Install all dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `framer-motion`, `zustand`, `@tanstack/react-query`, `lightweight-charts`, `lucide-react`, `lenis`

#### [NEW] [globals.css](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/globals.css)
- All CSS custom properties (colors, typography, glow effects)
- Custom scrollbar (2px, accent-primary)
- Glassmorphism utility classes
- Typography scale system
- Skeleton shimmer animation
- Spotlight cursor CSS variables

#### [NEW] [layout.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/layout.tsx)
- Root layout with font loading (Inter, Geist Mono, Clash Display)
- Global providers: TanStack QueryProvider, Zustand store
- Lenis smooth scroll initialization
- Persistent Three.js Canvas component
- Mouse position tracker
- Ambient glow backgrounds (fixed position)

#### [NEW] [tailwind.config.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/tailwind.config.ts)
- Extended theme with all custom colors, fonts, animations

---

### Phase 2: Core Infrastructure

#### [NEW] [lib/api.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/lib/api.ts)
- TanStack Query hooks for all 12 API endpoints
- Base URL from `NEXT_PUBLIC_API_BASE_URL`
- Mock data fallbacks for development
- Proper staleTime configs (30s live, 5min historical)

#### [NEW] [lib/store.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/lib/store.ts)
- Zustand store: active section, selected stock, watchlist, theme, 3D quality settings

#### [NEW] [lib/utils.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/lib/utils.ts)
- `cn()` class merger, formatters for currency/percentage/volume

#### [NEW] [lib/gsap.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/lib/gsap.ts)
- GSAP plugin registration (ScrollTrigger)

#### [NEW] [hooks/useMousePosition.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/hooks/useMousePosition.ts)
- Mouse position tracking with lerp for spotlight cursor effect

#### [NEW] [hooks/useScrollProgress.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/hooks/useScrollProgress.ts)
- Scroll progress for section-based animations

#### [NEW] [hooks/useLiveData.ts](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/hooks/useLiveData.ts)
- Auto-refreshing data hook using TanStack Query refetch intervals

---

### Phase 3: Reusable UI Components

#### [NEW] [components/common/GlassCard.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/common/GlassCard.tsx)
- Glassmorphism card with shine top-edge, hover elevation, glow effects

#### [NEW] [components/common/SkeletonLoader.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/common/SkeletonLoader.tsx)
- Shimmer skeleton blocks matching content shapes

#### [NEW] [components/common/Ticker.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/common/Ticker.tsx)
- Individual stock ticker with price, delta, sparkline

#### [NEW] [components/common/PriceBadge.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/common/PriceBadge.tsx)
- Colored pill badge for ▲/▼ price changes

#### [NEW] [components/layout/Navbar.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/layout/Navbar.tsx)
- Fixed nav with glass background on scroll, nav links, search trigger, live badge

#### [NEW] [components/layout/CommandMenu.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/layout/CommandMenu.tsx)
- ⌘K search modal with debounced search, keyboard navigation, result grouping

---

### Phase 4: Three.js 3D Scene

#### [NEW] [components/3d/Scene.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/3d/Scene.tsx)
- Persistent R3F Canvas (fixed, z-index 0), PerspectiveCamera, lighting rig
- PerformanceMonitor for adaptive quality

#### [NEW] [components/3d/ParticleField.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/3d/ParticleField.tsx)
- 8,000 particles with BufferGeometry, drift animation, mouse parallax

#### [NEW] [components/3d/CandlestickChart3D.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/3d/CandlestickChart3D.tsx)
- 40-60 3D candlestick bars with breathing animation, auto-generation

#### [NEW] [components/3d/Globe.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/3d/Globe.tsx)
- Dot-pattern globe with market pings, arc connections, atmosphere glow

#### [NEW] [components/3d/HolographicCard.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/3d/HolographicCard.tsx)
- Floating HTML planes in 3D space with holographic edge glow

---

### Phase 5: Chart Components

#### [NEW] [components/charts/LightweightChart.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/charts/LightweightChart.tsx)
- TradingView Lightweight Charts wrapper with dark theme, custom crosshair

#### [NEW] [components/charts/AllocationRing.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/charts/AllocationRing.tsx)
- Custom SVG donut chart with animated stroke-dasharray

#### [NEW] [components/charts/SectorBars.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/components/charts/SectorBars.tsx)
- Horizontal bar chart with Framer Motion animated bars

---

### Phase 6: Page Sections

#### [NEW] [app/(sections)/Hero.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Hero.tsx)
- Full viewport hero with GSAP text reveal, gradient headlines, CTA buttons
- Live ticker marquee strip
- Floating stat cards with Framer Motion

#### [NEW] [app/(sections)/Dashboard.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Dashboard.tsx)
- 4 KPI cards, watchlist panel, NIFTY chart, sector bars, top movers
- Market breadth donut chart

#### [NEW] [app/(sections)/Analytics.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Analytics.tsx)
- Technical indicator toggles, timeframe controls, chart type selector
- Multi-pane TradingView chart with RSI/MACD overlays
- AI Analysis panel with typewriter effect

#### [NEW] [app/(sections)/Portfolio.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Portfolio.tsx)
- Holdings table with hover actions, allocation ring, performance graph

#### [NEW] [app/(sections)/News.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/News.tsx)
- Sentiment gauge, masonry news cards with stagger animations

#### [NEW] [app/(sections)/Search.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Search.tsx)
- Embedded search bar with typewriter placeholder

#### [NEW] [app/(sections)/About.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/About.tsx)
- Horizontal scroll pinned panels (GSAP ScrollTrigger)
- Feature cards, data flow diagram, tech stack

#### [NEW] [app/(sections)/Footer.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/(sections)/Footer.tsx)
- 4-column footer with ambient glow

#### [NEW] [app/page.tsx](file:///c:/Users/ronit/OneDrive/Desktop/test/nse-frontend/app/page.tsx)
- Section assembly, page loader, global canvas integration

---

## Verification Plan

### Automated Tests
```bash
npm run lint          # ESLint checks
npm run build         # TypeScript compilation + Next.js build
```

### Manual Verification
- `npm run dev` to start the dev server
- Verify all sections render correctly in the browser
- Check responsive breakpoints (mobile, tablet, desktop)
- Verify Three.js canvas renders particles, candlesticks, globe
- Confirm ⌘K modal opens and keyboard navigation works
- Check GSAP scroll animations fire on scroll
- Verify skeleton loaders appear before data loads
- Test glassmorphism effects and hover states
