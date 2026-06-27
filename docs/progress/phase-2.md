# Phase 2 — Server-Rendered Data Read Pages

> Status: **complete**. `typecheck`, `lint`, and `build` all green.
> Scope: `/interviews` (history list) and `/interviews/[id]` (replay) only.
> Builds on Phase 1 auth (route-group protection, request-scoped server client).

---

## 1. What was implemented

The first server-read slice: both interview pages now read owner-scoped rows from
Supabase **during render** and stream HTML — no client fetch, no `useEffect`, no
spinner-then-data.

- **History list** (`/interviews`) — server reads all of the user's interviews
  (newest first, `transcript` omitted) and renders cards linking to each replay; an
  empty state when there are none.
- **Replay** (`/interviews/[id]`) — server reads one owner-scoped interview
  (`.single()`); a missing or foreign id renders `not-found.tsx`. Shows the score
  summary (overall, breakdown, strengths/improvements/next steps) and the transcript,
  all as server markup.

No Server Actions, no Client Components, no new routes — a pure read slice.

---

## 2. Architecture decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Reads via the request-scoped server client under RLS** | No service-role/admin client introduced. Queries are *also* scoped with `.eq('user_id', …)` as defence-in-depth on top of RLS. |
| D2 | **No caching** | Reads stay dynamic (request memoization only). `unstable_cache`/tag invalidation arrive with their writer (`evaluateInterview`) in a later phase; caching now would mean staleness with no invalidator, and cookie-bound reads can't live inside `unstable_cache`. |
| D3 | **Per-request memoization via React `cache()`** | `getInterviewById` is called by both `generateMetadata` and the page; `cache()` dedupes them into one query per request. This is request memoization, **not** the Next data cache. |
| D4 | **List omits `transcript`; detail includes it** | Payload hygiene — the list never needs transcript bodies (docs/13 §4). |
| D5 | **`created_at → date` alias preserved** | `server/storage` maps each row's `created_at` onto a `date` field to honour the documented read-model convention. |
| D6 | **Replay uses one fetch + route-level `loading.tsx`, not per-section Suspense** | *Divergence from the approved plan.* The plan floated separate `<Suspense>` boundaries for score vs transcript, but the canonical detail read is a **single** `.single()` query (docs/13), so there is only one data source — independent streaming would be theatrical. The history list keeps a real Suspense boundary (its heading is static while the list query streams). Genuine multi-source streaming returns with the Phase 6 dashboard aggregates. |

### Server-First placement

| Page / component | Kind | Why |
|---|---|---|
| `interviews/page.tsx` | Server | Pure read; streams the list inside a Suspense boundary |
| `interviews/[id]/page.tsx` | Server | Pure read by id; `notFound()` on miss |
| `interview-list.tsx` | Server (async) | The awaited list section |
| `interview-card`, `score-summary`, `transcript-timeline`, `empty-state` | Server | Presentational; no browser API, no interactivity beyond `<Link>` |
| `server/storage.ts` | Server-only | DB access boundary (`import "server-only"`) |
| `lib/format.ts` | Shared (pure) | Secret-free formatting helpers |

---

## 3. Data flow

```
GET /interviews
 → proxy: refresh session cookie, gate route (Phase 1)
 → (app)/layout: requireUser()                         ── redirect /login if anon
 → interviews/page.tsx (RSC): user = await requireUser()
      heading renders immediately
      <Suspense fallback=skeleton>
        <InterviewList userId> → getInterviews(userId)
           → server-client (cookie session, RLS)
             .from('interviews').select(LIST_COLUMNS)
             .eq('user_id', userId).order('created_at', desc)
           → rows → toListItem (created_at→date) → <InterviewCard/>[]
 → streamed HTML (no client fetch)

GET /interviews/[id]
 → … requireUser()
 → getInterviewById(userId, id)  [cached per request]
      .select(DETAIL_COLUMNS).eq('id',id).eq('user_id',userId).single()
      PGRST116 (no rows) → null → notFound() → not-found.tsx
 → <ScoreSummary/> + <TranscriptTimeline/> as server markup
```

Reads are dynamic (cookie-dependent). Never cached: session/identity.

---

## 4. Schema assumptions (verified against the live database)

Verified read-only against the running Supabase project via the anon key + RLS
(PostgREST select probes; no service-role key used, no secrets printed):

- **`interviews`** exposes all selected columns: `id, user_id, role, question_type,
  config, result, transcript, created_at, started_at, completed_at, duration_ms,
  question_count, success, error`.
- **List projection** (`id, created_at, role, question_type, config, result`) and
  **`order=created_at.desc`** both succeed.
- **`.single()` on an empty set returns `PGRST116`** — the signal mapped to `notFound()`.
- **RLS** is active: anon reads return `[]` (not an error), so the cookie-session
  client returns each user's own rows.

**Assumption not verifiable via the anon Data API:** exact PG **types/nullability**
(jsonb vs text for `config`/`result`/`transcript`). These are taken as-applied from the
`docs/setup/supabase.md` DDL. `types/db.ts` types the jsonb columns to their domain
shapes (`VapiInterviewConfig`, `VapiAnalysisResult`, `TranscriptEntry[]`) and treats
optional columns as nullable.

---

## 5. Manual testing

**Prerequisite:** logged in (Phase 1) against the configured Supabase project. Then
`pnpm dev`.

Because interviews aren't written until a later phase, seed at least one row to see the
populated states. In the Supabase **SQL Editor** (replace the `user_id` with your auth
user's id from **Authentication → Users**):

```sql
insert into public.interviews (user_id, role, question_type, config, result, transcript, duration_ms, question_count, success)
values (
  '<your-auth-user-id>',
  'Frontend Engineer',
  'behavioral',
  '{"role":"Frontend Engineer","difficulty":"medium","experience":"mid","strictness":"balanced","questionType":"behavioral","interviewer":"default"}',
  '{"score":82,"breakdown":{"communication":85,"technical depth":78},"strengths":["Clear structure"],"improvements":["More metrics"],"nextSteps":["Practice STAR"],"summary":"Solid round overall."}',
  '[{"role":"assistant","text":"Tell me about a challenging project."},{"role":"user","text":"At my last role I led a migration…"}]',
  252000, 5, true
);
```

### Checklist

- [ ] **Empty state** — with no rows, `/interviews` shows "No interviews yet" + a
      "Start an interview" link (not an error).
- [ ] **List renders** — after seeding, `/interviews` lists the interview newest-first
      with role, type, date, and a colored score.
- [ ] **List → replay** — clicking a card navigates to `/interviews/[id]`.
- [ ] **Replay renders** — header (role · type · date · duration · question count),
      score summary (overall + breakdown + strengths/improvements/next steps), and the
      transcript with Interviewer/You labels.
- [ ] **Per-interview title** — the browser tab shows
      "<role> · <Type> — replay".
- [ ] **Not found** — visiting `/interviews/<random-uuid>` shows the friendly
      "Interview not found" page, **not** an error screen.
- [ ] **Owner scoping** — a valid id belonging to *another* user also renders
      not-found (RLS returns no row).
- [ ] **Auth gate** — logged out, `/interviews` and `/interviews/[id]` redirect to
      `/login?next=…` (Phase 1 behavior, still intact).
- [ ] **Loading skeleton** — navigating to either route briefly shows the matching
      skeleton (no layout shift).
- [ ] **No client fetch** — DevTools Network shows the data in the initial document
      (no XHR/fetch for interview data after load).

---

## 6. Verification

- `pnpm typecheck` — pass (exit 0)
- `pnpm lint` — pass (exit 0)
- `pnpm build` — pass (exit 0); `/interviews` and `/interviews/[id]` are dynamic (`ƒ`)

---

## 7. Deferred to later phases

- **Caching** (`unstable_cache` + `interviews:{userId}` / `interview:{id}` tags) — with
  its invalidators, in the server-logic / dashboard phases.
- **Service-role admin client** — until the first privileged write (interview save).
- **Dashboard & analytics** (`/dashboard`, `/analytics`) — Phase 6, with the analytics
  aggregate and the `ScoreTrendChart` client island.
- **Score charts / radar** in the replay — Phase 6 (Recharts island); Phase 2 renders
  the breakdown as text.
- **Pagination** of history — not needed for MVP volumes.
- **Generated Supabase types** — hand-written `types/db.ts` is the contract for now.

---

## 8. Files

**Created:** `server/storage.ts`, `lib/format.ts`,
`components/interviews/{interview-list,interview-card,score-summary,transcript-timeline,empty-state}.tsx`.

**Modified:** `app/(app)/interviews/page.tsx`, `app/(app)/interviews/[id]/page.tsx`,
`app/(app)/interviews/loading.tsx`, `app/(app)/interviews/[id]/loading.tsx`,
`types/db.ts`.

**Unchanged (verified correct):** `app/(app)/interviews/[id]/not-found.tsx`,
`app/(app)/error.tsx`, both layouts, `proxy.ts`.
