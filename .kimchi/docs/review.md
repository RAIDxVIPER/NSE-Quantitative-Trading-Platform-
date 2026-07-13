# NSE Analytics Frontend — Final Review

## Verdict

**NEEDS_FIXES**

The new sections and `page.tsx` wiring are largely correct and follow the implementation plan, but the build is blocked by pre-existing TypeScript errors in the 3D components. Additionally, the new `Portfolio.tsx` contains two runtime/visible bugs that must be fixed.

---

## Build Output

**FAIL**

`npm run build` fails during type checking with a React Three Fiber JSX namespace error:

```
./components/3d/CandlestickChart3D.tsx:59:5
Type error: Property 'group' does not exist on type 'JSX.IntrinsicElements'.
```

Running `npx tsc --noEmit` reveals the same class of error across all `components/3d/*` files (`CandlestickChart3D.tsx`, `Globe.tsx`, `HolographicCard.tsx`, `ParticleField.tsx`, `Scene.tsx`).

**Important:** None of the new section files (`Portfolio.tsx`, `News.tsx`, `Search.tsx`, `About.tsx`, `Footer.tsx`) or `app/page.tsx` produce TypeScript errors. The build failure is entirely pre-existing and unrelated to the new sections.

A CSS warning was also emitted during the build:

```
@import rules must precede all rules aside from @charset and @layer statements
```

This is also pre-existing.

---

## Lint Output

**PASS (with warnings)**

`npm run lint` exits successfully. The only warnings are pre-existing:

```
./lib/api.ts
6:8  Warning: 'UseQueryOptions' is defined but never used.  @typescript-eslint/no-unused-vars

./lib/store.ts
53:51  Warning: 'get' is defined but never used.  @typescript-eslint/no-unused-vars
```

No lint warnings or errors originate from the new sections or `page.tsx`.

---

## Issues (caused by the new implementation)

### 1. `components/sections/Portfolio.tsx` — Rupee symbol escape sequences render literally

**Lines:** 351, 357, 363, 373, 470

**Problem:** The component inserts `\u20B9` directly into JSX text nodes, e.g.:

```tsx
<td ...>
  \u20B9{formatPrice(holding.avgBuy)}
</td>
```

JSX text does not process `\uXXXX` escapes like JavaScript string literals do, so the browser will render the literal string `\u20B9` instead of the `₹` symbol.

**Suggested fix:** Replace `\u20B9` with the actual Unicode character `₹`, or wrap the escape in a JavaScript expression. For example:

```tsx
<td ...>
  ₹{formatPrice(holding.avgBuy)}
</td>
```

(Note: line 131 is fine because it uses `\u20B9` inside a template literal, where the escape is processed.)

---

### 2. `components/sections/Portfolio.tsx` — Portfolio mutates global chart type state

**Lines:** 58–63

**Problem:** The Portfolio section forces the global `selectedChartType` to `"area"` on mount:

```tsx
const setSelectedChartType = useAppStore((s) => s.setSelectedChartType);

useEffect(() => {
  setSelectedChartType("area");
}, [setSelectedChartType]);
```

`LightweightChart` reads `selectedChartType` from the same global store, and `Analytics.tsx` exposes UI controls for changing it. When the user scrolls to or mounts the Portfolio section, their Analytics chart type selection is silently overwritten to `"area"`. There is no cleanup to restore the previous value on unmount.

**Suggested fix:** Avoid mutating global UI state for a section-local concern. Either:

- Extend `LightweightChart` to accept an optional `type` prop (e.g. `type?: "candles" | "line" | "area" | "bars"`) that overrides the store value when provided, and pass `type="area"` from Portfolio; or
- If the store-driven approach must remain, capture the previous chart type in the effect and restore it on cleanup.

---

## Pre-existing Issues (not caused by the new work)

1. **React Three Fiber TypeScript errors block the build.**
   - Files: `components/3d/CandlestickChart3D.tsx`, `components/3d/Globe.tsx`, `components/3d/HolographicCard.tsx`, `components/3d/ParticleField.tsx`, `components/3d/Scene.tsx`
   - The installed `@react-three/fiber` JSX namespace is not recognised, causing errors such as `Property 'group' does not exist on type 'JSX.IntrinsicElements'`.
   - These components are part of the existing codebase and were not modified by this implementation.

2. **Lint warnings in shared libraries.**
   - `lib/api.ts:6` — unused `UseQueryOptions` import.
   - `lib/store.ts:53` — unused `get` parameter.

3. **CSS `@import` order warning.**
   - The global CSS file imports a Google Fonts `@import` after other rules, which violates CSS ordering requirements.

---

## Section-by-Section Verification

- **`app/page.tsx`:** All required sections are imported and rendered in the specified order: `Hero`, `Dashboard`, `Analytics`, `Portfolio`, `News`, `Search`, `About`, `Footer`. No duplicate imports. Client mount pattern is preserved.
- **`components/sections/Portfolio.tsx`:** Matches the spec structure (header, summary cards, holdings table, sector allocation ring, performance chart, skeleton/empty states, Framer Motion entrance). See issues 1 and 2 above.
- **`components/sections/News.tsx`:** Matches the spec (featured card, sentiment gauge, responsive grid, category icons, sentiment badges, relative timestamps, skeleton states, Framer Motion stagger).
- **`components/sections/Search.tsx`:** Matches the spec (typewriter placeholder, debounced query, grouped results, store update + navigation, popular searches empty state, glass card container).
- **`components/sections/About.tsx`:** Matches the spec (two-column layout, gradient heading, 2x2 feature cards, tech stack row, Framer Motion, no GSAP horizontal pinning).
- **`components/sections/Footer.tsx`:** Matches the spec (4-column layout, ambient glow top border, product/resources/legal links, social icons, back-to-top button).
