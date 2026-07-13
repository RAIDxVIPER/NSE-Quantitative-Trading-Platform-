# NSE Analytics Frontend — Remaining Sections Implementation Plan

## Goal
Complete the partially built Next.js 15 frontend by implementing the missing page sections (Portfolio, News, Search, About, Footer), wire them into `app/page.tsx`, and verify the site builds and lints cleanly.

## Architecture
- Follow the existing component architecture: each section is a self-contained React component under `components/sections/`.
- Reuse existing primitives (`GlassCard`, `PriceBadge`, `SkeletonLoader`, `Ticker`, `LightweightChart`, `AllocationRing`, etc.) and hooks (`lib/api.ts`, `lib/store.ts`).
- Use Framer Motion for scroll-triggered entrance animations and GSAP only where horizontal pinning is required.
- Keep all new code TypeScript-strict and Tailwind v4 CSS-first.
- The backend is assumed unavailable; use the existing mock data layer.

## Tech Stack
- Next.js 15 + React 19 + TypeScript 5.7
- Tailwind CSS v4 (`@theme` in CSS)
- Framer Motion, GSAP
- Three.js / React Three Fiber (existing scene remains untouched)
- TanStack Query, Zustand
- lightweight-charts, lucide-react

---

## Chunk 1 — Portfolio Section

**Files:**
- Create: `nse-frontend/components/sections/Portfolio.tsx`

**Complexity:** `simple`

**Interface:**
```tsx
export function Portfolio(): JSX.Element
```

**Expected Behaviour:**
- Section id="portfolio" with py-24, max-w-[1440px], px-6.
- Header: "Your Portfolio" with label "Holdings" and gradient text.
- Use `usePortfolioHoldings()` and `usePortfolioPerformance("1M")`.
- Left column: holdings table with Symbol, Name, Qty, Avg Buy, LTP, Current Value, PnL, PnL %. Use mock `Holding` type from `lib/mock-data.ts`.
- Right column:
  - Allocation ring by sector (use `AllocationRing`).
  - Portfolio performance line chart (use `LightweightChart` with area series by mapping `value` to `close`).
- Summary cards at top: Total Value, Total PnL, Day PnL, Best Performer.
- Empty / loading state using `SkeletonTable` and `SkeletonCard`.
- Framer Motion stagger entrance.

**Acceptance Criteria:**
1. Renders without errors using mock data fallback.
2. Shows holdings table and sector allocation ring.
3. Performance chart displays as area chart.
4. No new dependencies.

---

## Chunk 2 — News Section

**Files:**
- Create: `nse-frontend/components/sections/News.tsx`

**Complexity:** `simple`

**Interface:**
```tsx
export function News(): JSX.Element
```

**Expected Behaviour:**
- Section id="news".
- Header: "Market News" with label "Intelligence".
- Use `useNewsFeed()` and `useSentiment()`.
- Top row:
  - Featured news card (large, uses first featured item or first item).
  - Sentiment gauge card showing score 0-100 with label and change.
- Below: masonry-style grid of remaining news cards (3 columns on desktop, 2 on tablet, 1 on mobile).
- Each card: headline, source, relative time, excerpt, category pill, sentiment badge.
- Category icons from lucide-react (Earnings, Economy, Sector, Global).
- Staggered entrance animation with Framer Motion.

**Acceptance Criteria:**
1. Renders all mock news items.
2. Sentiment gauge visually represents the score.
3. Cards are responsive.
4. No TypeScript errors.

---

## Chunk 3 — Search Section

**Files:**
- Create: `nse-frontend/components/sections/Search.tsx`

**Complexity:** `simple`

**Interface:**
```tsx
export function Search(): JSX.Element
```

**Expected Behaviour:**
- Section id="search".
- Centered large search input with typewriter placeholder effect.
- Use `useSearch(query)` with debounced local state.
- Show grouped results (Stocks, Indices, Sectors) when query exists.
- Clicking a result updates `selectedStock` in Zustand and scrolls to `#analytics`.
- Popular searches / trending tickers shown when query is empty.
- Clean glass card container.

**Acceptance Criteria:**
1. Search input accepts text and debounces correctly.
2. Results render from mock search fallback.
3. Clicking result updates store and navigates to analytics.
4. Empty state shows popular tickers.

---

## Chunk 4 — About Section

**Files:**
- Create: `nse-frontend/components/sections/About.tsx`

**Complexity:** `simple`

**Interface:**
```tsx
export function About(): JSX.Element
```

**Expected Behaviour:**
- Section id="about".
- Two-column layout on desktop:
  - Left: large heading "Built for the Modern Quant" with gradient text and short description.
  - Right: feature cards in a 2x2 grid (Data Driven, Real-Time, ML Powered, Secure).
- Below: tech stack row with logos/names (Next.js, React, TypeScript, Tailwind, Three.js, Python, FastAPI placeholder).
- Use `GlassCard` for feature cards.
- Framer Motion scroll-triggered animations.

**Note:** Skip GSAP horizontal scroll pinning to avoid complexity and potential ScrollTrigger issues. Use simple vertical layout.

**Acceptance Criteria:**
1. Feature cards render in a responsive grid.
2. Tech stack row is visible.
3. No horizontal scroll or layout breakage.

---

## Chunk 5 — Footer Section

**Files:**
- Create: `nse-frontend/components/sections/Footer.tsx`

**Complexity:** `simple`

**Interface:**
```tsx
export function Footer(): JSX.Element
```

**Expected Behaviour:**
- 4-column footer with ambient glow top border.
- Columns: Brand, Product (links to sections), Resources, Legal.
- Bottom bar: copyright, social icons (GitHub, Twitter, LinkedIn placeholder).
- Back-to-top button.
- Use existing color tokens.

**Acceptance Criteria:**
1. All columns render on desktop and stack on mobile.
2. Section anchor links work.
3. Back-to-top scrolls smoothly.

---

## Chunk 6 — Wire Sections into Page

**Files:**
- Modify: `nse-frontend/app/page.tsx`

**Complexity:** `simple`

**Expected Behaviour:**
- Import `Portfolio`, `News`, `Search`, `About`, `Footer`.
- Render them in order after `<Analytics />`:
  ```tsx
  <Hero />
  <Dashboard />
  <Analytics />
  <Portfolio />
  <News />
  <Search />
  <About />
  <Footer />
  ```
- Remove commented placeholder code.

**Acceptance Criteria:**
1. All sections appear in DOM order.
2. No duplicate imports.
3. Page still mounts client-side correctly.

---

## Chunk 7 — Verify Build & Lint

**Files:**
- All files in `nse-frontend/`

**Complexity:** `simple`

**Expected Behaviour:**
- Run `npm install` if `node_modules` is incomplete.
- Run `npm run lint` and fix all ESLint errors.
- Run `npm run build` and fix all TypeScript / Next.js build errors.
- Do not stop at the first error; collect and fix all issues.

**Acceptance Criteria:**
1. `npm run lint` exits 0.
2. `npm run build` completes successfully.
3. No runtime errors from the new sections.

---

## Dependencies
Use only libraries already listed in `package.json`. No new packages should be installed.

## Common Patterns to Follow
- Import path alias: `@/components/...`, `@/lib/...`, `@/hooks/...`.
- Color tokens: use CSS vars (`var(--text-primary)`, `var(--accent-primary)`, etc.) or Tailwind arbitrary values.
- Motion entrance: `{ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }`.
- Loading states: use skeleton variants from `components/common/SkeletonLoader.tsx`.
- Formatting: use helpers from `lib/utils.ts` (`formatPrice`, `formatPercent`, `formatCurrency`, `formatDate`).
