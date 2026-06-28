# Phase 6 — Analytics & Interview Review

> Status: **complete.** `typecheck` ✓ · `lint` ✓ (0 warnings) · `test` ✓ 45/45 ·
> `build` ✓ (no Recharts SSR error; `/dashboard` + `/analytics` compile as dynamic
> routes). Final nav IA: **Home → `/`**, Dashboard → `/dashboard`, Practice
> Interviews, Interviews, Analytics.

Delivers the analytics + review experience: a `/dashboard` overview, a `/analytics`
trends surface (Recharts score-trend island), and light filtering/grouping on the
interview history. Server-First throughout — pages are async Server Components that
await a cached aggregate; the only new client islands are interactive UI (the chart
and the history filter bar).

## Approved decisions
- **Charts = Recharts** (new dependency), isolated to a `"use client"` island so it
  never enters a Server Component / the shared server bundle.
- **`/dashboard`** is the stats overview; the navbar "Dashboard" tab repoints from
  `/` → `/dashboard` (`/` stays the marketing hero). `redirectIfAuthenticated`
  already lands users on `/dashboard`.
- **Light filtering** on history: `?type=&role=` URL params + Today/Week/Month/Older
  grouping. No free-text search, no pagination yet.
- Reuse Phase 2 components (`InterviewCard`, `InterviewsEmptyState`) rather than
  duplicating; reuse `lib/format` helpers.

## Architecture
- **Pure compute** lives in `lib/analytics.ts` (no `server-only`, no DB) so it is unit
  testable in the `node` Vitest env without importing Supabase. Ported from the
  legacy `analyticsService` compute functions.
- **IO + cache** lives in `server/analytics.ts`: `getAnalytics(userId)` fetches the
  user's rows and assembles the payload inside `unstable_cache`, tagged
  `dashboard:${userId}` (the tag already revalidated by `evaluateInterview`). This
  closes the half-wired cache loop (tags were emitted but nothing read the cache).

### Deviation — admin client inside the Data Cache
`unstable_cache` callbacks run outside request scope and **cannot read cookies**, so
the request-scoped (RLS) Supabase client can't run inside them. Following the existing
`saveInterview` pattern, `server/analytics.ts` reads via the **admin client** scoped by
`user_id` (the `userId` is resolved by `requireUser()` in the page, before the cached
boundary). RLS is replaced by an explicit `.eq("user_id", userId)` filter +
userId-scoped cache key/tag. `getInterviews` (the history list) is left on the
request-scoped RLS client and is **not** moved into the Data Cache — it stays dynamic.

### Deviation — pure logic in `lib/`, not `server/analytics.test.ts`
The plan named `server/analytics.test.ts`. Splitting pure compute into `lib/analytics.ts`
lets the tests (`lib/analytics.test.ts`) run without `server-only`/Supabase in the graph.
The `server/analytics.ts` wrapper is thin IO + caching and is covered by build/typecheck.

## Milestones
- [x] 6a — Server analytics aggregation + tests (`lib/analytics.ts` + 8 tests, `server/analytics.ts`, `types/analytics.ts`)
- [x] 6b — Recharts 3.9 added; isolated `"use client"` island (`score-trend-chart.tsx`); type-composes with React 19; render smoke via build.
- [x] 6c — `/dashboard`: stat cards + 30-day activity strip + recent interviews (reuses `InterviewCard`), streamed Suspense sections.
- [x] 6d — `/analytics`: stat cards + score-trend chart island + strengths/weaknesses themes, with empty/low-data fallbacks.
- [x] 6e — History filtering (`?type=&role=`) + Today/Week/Month/Older grouping; `HistoryFilterBar` client island; `getInterviews` gains optional filters.
- [x] 6f — Navbar Dashboard tab → `/dashboard`; cache loop closed via `dashboard:${userId}`; verification.

## Cache notes (6f)
- `evaluateInterview` already revalidates `dashboard:${userId}` + `interviews:${userId}`.
  `server/analytics.ts` now **reads** under `dashboard:${userId}`, so a new interview
  busts the dashboard/analytics aggregate — the previously half-wired loop is closed.
- `interviews:${userId}` is still revalidated but currently **read by nothing** (the
  history list stays on the dynamic RLS client, by design). It is left in place as a
  reserved tag — harmless, and avoids touching the Phase 3 evaluate action.

## Files
**New**
- `types/analytics.ts`, `lib/analytics.ts` (+ `lib/analytics.test.ts`, 8 tests), `server/analytics.ts`.
- `components/analytics/{stat-cards,recent-activity,strengths-weaknesses,score-trend-chart}.tsx`
  (`score-trend-chart` is the only Recharts/client island).
- `components/interviews/history-filter-bar.tsx` (client island).

**Modified**
- `app/(app)/dashboard/{page,loading}.tsx`, `app/(app)/analytics/{page,loading}.tsx`,
  `app/(app)/interviews/page.tsx`.
- `components/interviews/interview-list.tsx` (optional filters + recency grouping).
- `server/storage.ts` (`getInterviews` optional `InterviewFilters`; behaviour unchanged when omitted).
- `components/dashboard-navbar.tsx` (Dashboard tab → `/dashboard`; added **Home → `/`**
  entry with exact-match active rule, applied to both desktop + mobile nav).
- `package.json` (+ recharts 3.9.0).

## Out of scope (flagged for later)
- **Code replay** — code is never persisted (transcript-only); needs a schema + save-path change.
- **System/job metrics** (p95, failure rate, Redis telemetry) — Phase 7.
