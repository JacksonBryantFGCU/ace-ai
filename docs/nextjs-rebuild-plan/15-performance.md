# 15 — Performance & Accessibility

Performance opportunities the rebuild unlocks (brief §16) plus accessibility recommendations (brief §17).

---

## Part A — Performance

### 1. Reduced client JavaScript (the biggest win)

The current SPA ships **everything** to the browser: Recharts, Framer Motion, Vapi SDK, Monaco, plus all page logic and data-fetching code. In the rebuild, only true client islands ship JS.

| Heavy dependency | Current | Rebuild |
|---|---|---|
| **Monaco** (`@monaco-editor/react`) | In SPA bundle | Lazy `dynamic(() => ..., { ssr: false })`, loaded **only** on `/technical-interview` |
| **Pyodide** (WASM) | Loaded via CDN on demand already | Keep on-demand; preload only on technical route |
| **Recharts** | In bundle | Client island, lazy-loaded on dashboard/analytics only |
| **Framer Motion** (`motion`) | Pervasive | Use sparingly; many animated wrappers can be CSS/Tailwind; import only in client islands |
| **Vapi SDK** | In bundle | Client island on interview routes only |
| Page data-fetch code | Shipped to client | **Gone** — runs on server |

Result: marketing, auth, history, replay, and dashboard pages ship dramatically less JS. Pages a user may never visit (technical interview) no longer tax everyone's bundle.

### 2. Server rendering

Non-interactive content (history rows, replay transcript, metric cards, marketing) renders to HTML on the server — faster TTFB/FCP, no hydration cost for static parts, works without JS for the readable content.

### 3. Code splitting & lazy loading

- Route-level splitting is automatic per App Router segment.
- `next/dynamic` with `ssr:false` for Monaco and Recharts islands.
- Pyodide stays lazy; trigger `preloadPyodide()` only when the technical interview mounts (current behavior is fine).

### 4. Parallel & non-waterfall data fetching

- Current dashboard waterfalls: render → effect → fetch. Rebuild fetches on the server **before** render.
- Where a page needs multiple datasets (dashboard: user metrics + system metrics + recent activity), fire them with `Promise.all` (the current `buildDashboard` already does this — preserve it).
- Independent sections get separate `<Suspense>` boundaries so a slow one doesn't block a fast one ([10](./10-streaming-loading.md)).

### 5. Streaming

Stream the dashboard/analytics shells instantly and fill data sections as they resolve. Stream the technical-interview "preparing problems" boundary on the server. See [10](./10-streaming-loading.md).

### 6. Caching

- AI question generation cached 24h, evaluation 1h, dashboard 60s — via `unstable_cache` + tags. Avoids re-paying OpenAI latency/cost. See [09](./09-caching.md).
- Static marketing fully cached.

### 7. Image & font optimization

- **Images:** `next/image` for the hero/logo (`assets/`) — responsive sizes, lazy by default, modern formats, no CLS. Replaces the current `figma/ImageWithFallback`.
- **Fonts:** `next/font` self-hosts and optimizes fonts, eliminating layout shift and external requests.

### 8. Partial hydration / islands

The whole architecture is islands-based: a Server Component tree with small `"use client"` leaves (chart, editor, voice panel, sliders). Most of each page is never hydrated.

### 9. Over-fetch elimination

- `AnalyticsDashboard` currently pulls full `/history` **including transcripts** just to chart scores. Rebuild selects only `created_at, result.score` (or uses the aggregate). Big payload reduction.
- List route keeps omitting `transcript`; detail route includes it (preserve the split).

### 10. Performance scorecard (expected direction)

| Metric | Current (SPA) | Rebuild (server-first) |
|---|---|---|
| Landing TTFB/FCP | Client render after JS | Static HTML, instant |
| Dashboard initial data | effect waterfall + spinner | server-read, streamed |
| JS shipped to a history-only user | Monaco+Recharts+Vapi+Motion | minimal |
| OpenAI re-cost on repeat inputs | cached (service) | cached (data cache) — parity |
| SEO/crawlability | none | full on public pages |

---

## Part B — Accessibility (brief §17)

The current code shows some good habits (`role="alert"` on errors, semantic buttons, focus-aware keyboard shortcuts). Carry these forward and extend:

| Area | Recommendation |
|---|---|
| **Semantic HTML** | Server Components make it easy to emit proper `<main>`, `<nav>`, `<section>`, `<ul>/<li>` for history lists, `<h1>`–`<h3>` hierarchy. Avoid div-soup. |
| **Landmarks** | One `<main>` per page; `<nav>` for `DashboardNavbar`; `<header>`/`<footer>` in marketing. |
| **Forms** | Setup sliders (Radix) already accessible; ensure `<label>` association, `aria-valuetext` for difficulty/strictness/experience showing the human label ("Medium", "Strict"). |
| **Live regions** | Transcript updates and timer warnings should use `aria-live="polite"`; interview status ("Connecting", "Analyzing") announced. Errors keep `role="alert"`. |
| **Keyboard** | Preserve the technical-interview shortcuts; ensure all interactive controls are reachable/operable by keyboard; visible focus rings. |
| **Color contrast** | The purple/blue-on-dark and glassmorphism cards need contrast checks (esp. `text-gray-500` on dark). Verify WCAG AA. |
| **Reduced motion** | Respect `prefers-reduced-motion` — gate Framer Motion animations. |
| **Voice-first inclusivity** | The interview is audio-driven; the live **transcript** is the accessibility path for deaf/hard-of-hearing users — keep it prominent and complete. Provide a text fallback/visible transcript at all times. |
| **Mic permission UX** | Clear, accessible messaging when mic permission is denied (the current error surface helps). |
| **Skeletons** | Mark `loading.tsx` skeletons `aria-hidden` and announce "Loading" via a live region so screen readers aren't spammed with placeholder structure. |
| **Images** | `next/image` with meaningful `alt`; decorative images `alt=""`. |

Accessibility is also a performance ally: semantic, server-rendered HTML is both faster and more navigable by assistive tech.
