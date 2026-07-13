# NSE Analytics Frontend — Task Tracker

## Phase 1: Project Scaffolding & Config
- `[x]` package.json, tsconfig, next.config, postcss, .env, eslint
- `[x]` globals.css (design system)
- `[x]` layout.tsx (root layout + providers)

## Phase 2: Core Infrastructure  
- `[x]` lib/api.ts (TanStack Query hooks + mock data)
- `[x]` lib/store.ts (Zustand)
- `[x]` lib/utils.ts
- `[x]` lib/gsap.ts
- `[x]` lib/mock-data.ts
- `[x]` hooks/useMousePosition.ts
- `[x]` hooks/useScrollProgress.ts
- `[x]` hooks/useLiveData.ts

## Phase 3: Reusable Components
- `[x]` components/common/GlassCard.tsx
- `[x]` components/common/SkeletonLoader.tsx
- `[x]` components/common/Ticker.tsx
- `[x]` components/common/PriceBadge.tsx
- `[x]` components/layout/Navbar.tsx
- `[x]` components/layout/CommandMenu.tsx

## Phase 4: Three.js 3D Scene
- `[x]` components/3d/Scene.tsx
- `[x]` components/3d/ParticleField.tsx
- `[x]` components/3d/CandlestickChart3D.tsx
- `[x]` components/3d/Globe.tsx
- `[x]` components/3d/HolographicCard.tsx

## Phase 5: Chart Components
- `[x]` components/charts/LightweightChart.tsx
- `[x]` components/charts/AllocationRing.tsx
- `[x]` components/charts/SectorBars.tsx

## Phase 6: Page Sections
- `[x]` components/sections/Hero.tsx
- `[x]` components/sections/Dashboard.tsx
- `[x]` components/sections/Analytics.tsx
- `[ ]` components/sections/Portfolio.tsx
- `[ ]` components/sections/News.tsx
- `[ ]` components/sections/Search.tsx
- `[ ]` components/sections/About.tsx
- `[ ]` components/sections/Footer.tsx

## Phase 7: Page Assembly & Polish
- `[ ]` app/page.tsx
- `[x]` Providers wrapper
- `[ ]` Verification (build + lint)
