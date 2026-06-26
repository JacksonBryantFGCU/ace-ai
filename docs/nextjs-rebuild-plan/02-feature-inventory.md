# 02 — Feature Inventory

Every major feature, with: **Purpose · Current implementation · Dependencies · Suggested Next.js architecture · Migration complexity · Priority · Potential improvements.**

Complexity: **S** (small) · **M** (medium) · **L** (large) · **XL** (very large).
Priority: **P0** (core MVP) · **P1** (important) · **P2** (nice-to-have).

---

## F1 — Authentication (login / signup / OAuth / session)

- **Purpose:** Email+password and Google/GitHub OAuth; persisted sessions; gate protected routes.
- **Current:** `services/auth.ts` wraps Supabase client SDK (`signInWithPassword`, `signUp` + `profiles` upsert, `signInWithOAuth`, `signOut`). Synchronous `_cachedUser`. `ProtectedRoute` checks `getSession()` client-side. Backend `authMiddleware` verifies Bearer JWT.
- **Dependencies:** `@supabase/supabase-js`, Supabase Auth, OAuth providers.
- **Next.js:** `@supabase/ssr` with cookie-based sessions; **middleware** refreshes session + gates routes; **server** reads user in layouts; OAuth callback **Route Handler** (`/auth/callback`). Login/signup forms are Client Components calling Server Actions or the browser Supabase client. See [08](./08-authentication.md).
- **Complexity:** **M** · **Priority:** P0
- **Improvements:** Enforce auth before render (no spinner flash); single source of truth for the user via a server util; remove the synchronous cache hack.

---

## F2 — Setup / interview configuration

- **Purpose:** Choose role, difficulty, experience, strictness, interviewer, question type, language, topics; launch an interview.
- **Current:** `SetupDashboard` (client), navigates with `location.state`. Sliders via Radix.
- **Dependencies:** Radix slider, Framer Motion, router state.
- **Next.js:** Server Component shell + Client Component form island. On submit, a **Server Action** persists a "draft interview config" (or encodes config in the URL/searchParams) and redirects to the interview route. Avoids state-loss-on-refresh. See [05](./05-routing-plan.md), [17](./17-open-questions.md).
- **Complexity:** **M** · **Priority:** P0
- **Improvements:** Shareable/refresh-safe config; server validation of allowed values.

---

## F3 — Behavioral voice interview (Vapi)

- **Purpose:** Real-time spoken interview; AI asks STAR questions, listens, evaluates.
- **Current:** `VapiInterviewPanel` + `useVapiInterview`. Builds inline `CreateAssistantDTO` (system prompt + 11labs/vapi voice + Deepgram transcriber), `vapi.start()`, listens to call/speech/message/volume events, accumulates transcript, then `evaluateTranscript`.
- **Dependencies:** `@vapi-ai/web`, `AudioContext`, mic permission, Vapi public key, backend `/evaluate`.
- **Next.js:** **Client Component island** — unchanged in spirit. The route is a Server Component that loads config + interviewer metadata server-side and renders the client panel. Evaluation goes to a **Server Action** (`evaluateInterview`) instead of `POST /evaluate`. System-prompt building stays client-side (Vapi needs it inline) **or** moves to a server util passed as props. See [06](./06-server-vs-client.md), [11](./11-server-actions.md).
- **Complexity:** **L** (delicate state) · **Priority:** P0
- **Improvements:** Move prompt builders to shared server util to dedupe with backend; reduce `console.log`; surface errors better.

---

## F4 — Technical voice interview (Vapi + Monaco + runner)

- **Purpose:** Spoken interview plus 3 coding problems solved in-browser; gate "next" on passing tests; timed.
- **Current:** `TechnicalInterviewLayout` + `useVapiTechnicalInterview` + `TechnicalCodeEditor` (Monaco) + `useCodeExecution`. Loads problems either from local topic bank (`pickRandomProblems`) or AI (`generateInterviewQuestions`). Countdown + `vapi.say()` warnings. Keyboard shortcuts.
- **Dependencies:** Vapi, Monaco, Pyodide, backend `/questions` + `/execute`, local `technicalProblems.ts`.
- **Next.js:** Server Component route loads problems server-side when topics are empty (call OpenAI in a Server Action/`server/` util → no client AI roundtrip, no exposed logic) or reads the local bank. The interactive layout (editor, voice, timer) is a **Client Component island** receiving `problems` as props. Code execution for Java/C++/Bash → **Route Handler**; JS/TS/Python stay client.
- **Complexity:** **XL** · **Priority:** P0
- **Improvements:** Server-generate problems (faster first paint, hides prompt); lazy-load Monaco/Pyodide; stream the "preparing problems" state.

---

## F5 — Interview evaluation (OpenAI scoring)

- **Purpose:** Turn a transcript into scores + breakdown + strengths/improvements/next steps; persist.
- **Current:** `POST /api/analysis/evaluate` → `analyzeVapiTranscript` (OpenAI, JSON mode, cached 1h, fallback default) → `saveInterview` → returns `{ id, result }`. Async variant enqueues a job.
- **Dependencies:** OpenAI, `cacheService`, `storageService`, Supabase.
- **Next.js:** **Server Action** `evaluateInterview(transcript, config)` callable from the client interview island; returns `{ id, result }`; `revalidateTag('interviews')`. Keep the **async/job Route Handler** path for long evaluations. See [11](./11-server-actions.md), [12](./12-api-migration.md).
- **Complexity:** **M** · **Priority:** P0
- **Improvements:** Stream partial evaluation; consolidate caching with Next.js `unstable_cache`/`revalidateTag`.

---

## F6 — Coding-question generation (OpenAI)

- **Purpose:** Generate 3 role/difficulty/language-appropriate problems with test cases.
- **Current:** `POST /api/analysis/questions` → `generateInterviewQuestions` (ML path vs general path, JSON mode, validation, retry, fallback, cached 24h).
- **Dependencies:** OpenAI, cache, fallback banks.
- **Next.js:** Called **server-side** during the technical interview route load (Server Component awaiting a `server/ai` util) so problems are ready before the client island mounts. Cache with `unstable_cache` keyed on role/difficulty/level/language, long revalidate. See [09](./09-caching.md).
- **Complexity:** **M** · **Priority:** P0
- **Improvements:** Removes a client→server roundtrip and hides generation logic; 24h cache maps cleanly to Next.js caching.

---

## F7 — Code execution

- **Purpose:** Run user code against test cases.
- **Current:** `useCodeExecution`: JS/TS via `new Function` sandbox + regex type-strip; Python via Pyodide WASM (CDN); Java/C++/Bash via `POST /api/execute` → `codeExecutionService`.
- **Dependencies:** Pyodide CDN, backend exec service, Monaco.
- **Next.js:** Client-side runtimes **unchanged** (browser/WASM). Remote execution → **Route Handler** `POST /api/execute` (machine endpoint, rate-limited, auth-gated). See [12](./12-api-migration.md).
- **Complexity:** **M** · **Priority:** P0
- **Improvements:** Harden/sandbox remote execution (container/isolate); lazy-load Pyodide only on technical route.

---

## F8 — Interview history / list

- **Purpose:** List a user's past interviews.
- **Current:** `InterviewsPage` + `getInterviews()` (`useEffect`) → `GET /api/interviews` (no transcript).
- **Dependencies:** backend, Supabase.
- **Next.js:** **Server Component** reads Supabase directly (owner-scoped), no client fetch. `loading.tsx` skeleton; cache per-user with `revalidateTag('interviews')`. See [07](./07-data-flow.md), [09](./09-caching.md).
- **Complexity:** **S** · **Priority:** P1
- **Improvements:** No spinner; pagination; select only needed columns.

---

## F9 — Interview replay (single)

- **Purpose:** Replay a past interview with full transcript timeline + scores.
- **Current:** `InterviewReplayPage` handles both `/interviews/:id` (fetch by id) and `/replay` (from router state). `getInterview(id)` via `useEffect`.
- **Dependencies:** backend `GET /interviews/:id`, Supabase.
- **Next.js:** **Server Component** at `/interviews/[id]` reads by id (owner-scoped) on the server → `notFound()` if missing. The `/replay`-from-state case is replaced by linking to the real id (which `evaluate` already returns). See [05](./05-routing-plan.md).
- **Complexity:** **S** · **Priority:** P1
- **Improvements:** Drop the dual-mode component; deep-linkable/shareable; `generateMetadata` for title.

---

## F10 — Analytics dashboard

- **Purpose:** Score trend chart, aggregate metrics, recent results, replay links.
- **Current:** `AnalyticsDashboard` fetches full `/history` client-side (over-fetch); also receives fresh `{ result, config, interviewId }` via router state. Separate backend `/analytics/dashboard` aggregate exists (cached 60s) but the page uses `/history`.
- **Dependencies:** Recharts, backend, Supabase, `analyticsService`.
- **Next.js:** **Server Component** shell awaits the aggregate (`buildDashboard` as a `server/` util, cached 60s), passes data to a **Client chart island** (Recharts). Stream the chart under Suspense. The "fresh result" path becomes: evaluate → redirect to `/interviews/[id]` or `/dashboard` (data already persisted). See [10](./10-streaming-loading.md).
- **Complexity:** **L** · **Priority:** P1
- **Improvements:** Stop over-fetching transcripts; server aggregation; streamed chart; remove router-state dependency.

---

## F11 — Profile / role management

- **Purpose:** Read profile; set engineering role.
- **Current:** `GET/PATCH /api/auth/me` + `/me/role`. Lightly used by frontend.
- **Dependencies:** Supabase `profiles`.
- **Next.js:** **Server Component** reads profile; **Server Action** `updateRole(role)` validates against allow-list and `revalidatePath`/`revalidateTag`. See [11](./11-server-actions.md).
- **Complexity:** **S** · **Priority:** P2

---

## F12 — Background jobs / async evaluation & questions

- **Purpose:** Offload long OpenAI calls; poll for results.
- **Current:** `/evaluate/async` + `/questions/async` enqueue jobs; `worker.ts` processes (in-memory loop or BullMQ); `GET /api/jobs/:id` polls. Redis optional.
- **Dependencies:** BullMQ/ioredis (optional), `jobService`, `systemMetrics`.
- **Next.js:** Keep as **Route Handlers** + a **standalone worker process** (Next.js Server Actions are not a job runner). Enqueue from a Server Action or Route Handler; poll via `GET /api/jobs/[id]` Route Handler. See [12](./12-api-migration.md).
- **Complexity:** **L** · **Priority:** P2 (sync path works for MVP)
- **Improvements:** Consider serverless-friendly queue if deploying to Vercel; or run worker as a separate service.

---

## F13 — Caching & system metrics

- **Purpose:** Cache AI/dashboard results; track processed/failed/percentiles.
- **Current:** `cacheService` (in-memory/Redis get-or-compute with in-flight dedup), `systemMetrics`.
- **Next.js:** Replace app-data caching with Next.js Data Cache (`unstable_cache` + tags). Keep `systemMetrics` if the worker/jobs survive; otherwise drop. See [09](./09-caching.md).
- **Complexity:** **M** · **Priority:** P2

---

## F14 — Vapi webhooks

- **Purpose:** Receive Vapi server events.
- **Current:** Public `POST /api/vapi/*`.
- **Next.js:** **Route Handler** `app/api/vapi/[...]/route.ts`, public, signature-verified. See [12](./12-api-migration.md).
- **Complexity:** **S** · **Priority:** P2 (verify what actually uses it)

---

## F15 — Marketing / hero / landing

- **Purpose:** Entry page describing the product.
- **Current:** `HeroPage` (behind `ProtectedRoute` today — questionable), `DashboardDemo`.
- **Next.js:** **Static Server Component** in a `(marketing)` route group, fully cacheable, with full metadata/OG. Should be **public**. See [14](./14-seo-metadata.md).
- **Complexity:** **S** · **Priority:** P1
- **Improvements:** Make public + SEO-optimized; biggest server-render win.

---

## Features explicitly NOT to port (dead/legacy)

| Item | Reason |
|---|---|
| `backend/src/db.ts` | Deprecated stub. |
| `pg` dependency / Pool | Forbidden by project rules; unused real path. |
| `bcryptjs`, `jsonwebtoken` | Supabase handles auth; no custom hashing/signing. |
| Text interview `/start`, `/next` + `useInterview`, `InterviewScreen`, `ChatPanel`, `CodeEditor` (legacy `Interview/`) | Superseded by Vapi voice flow. Confirm before dropping ([17](./17-open-questions.md)). |
| `services/authService.ts` | Superseded by `auth.ts`. |
| `VapiTest.tsx`, `DashboardDemo`, `figma/ImageWithFallback` | Dev scaffolding. |

---

## Priority rollup

- **P0 (MVP):** F1 auth, F2 setup, F3 behavioral, F4 technical, F5 evaluate, F6 questions, F7 execution.
- **P1:** F8 history, F9 replay, F10 analytics, F15 marketing.
- **P2:** F11 profile, F12 jobs, F13 cache/metrics, F14 webhooks.
