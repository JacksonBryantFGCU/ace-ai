# 17 — Open Questions

Decisions to resolve **before** building. Each challenges an assumption in the current app or the rebuild plan. Recommended answers are given, but these need a human decision.

---

## A. Architecture & deployment

### A1. One app or a monorepo?
Single Next.js app vs. a pnpm workspace (Next app + separate worker package + shared `types` package).
- **Recommendation:** Single app for MVP; extract a `worker` package only when async jobs are needed (Phase 7).
- **Why it matters:** affects folder layout, build, and deploy from day one.

### A2. Where does the app deploy?
Vercel vs. a long-running Node host (Render/Fly/VM/container).
- **Tension:** the **worker process** and any in-memory job/cache model assume a long-lived Node runtime. Vercel's serverless model needs an external queue (Redis/BullMQ) and a separately hosted worker.
- **Recommendation:** decide now. If Vercel → plan Redis + external worker (or skip async). If a container host → the current worker model ports more directly.

### A3. Keep the async job layer at all?
The sync Server Action path (`evaluateInterview`) likely completes within request limits.
- **Recommendation:** Ship MVP **without** jobs; add async only if evaluation/question latency causes timeouts. Treat F12 as P2.

---

## B. The config-handoff problem (highest-impact decision)

### B1. How does setup config reach the interview route?
Today: `location.state` (lost on refresh, server-invisible). Options in [07](./07-data-flow.md) §4:
- **A. Persisted draft** (Server Action writes cookie/`interview_drafts` row) — *recommended*.
- **B. URL searchParams** (shareable, stateless).
- **C. httpOnly cookie**.
- **Why it matters:** blocks Phase 4; changes the setup form, the interview route signatures, and whether interviews are deep-linkable.

### B2. Should an interview config be a first-class DB entity?
If we persist drafts, do we also keep a record of "configured but not completed" interviews?
- **Recommendation:** No for MVP — a transient draft (cookie) is enough; only completed interviews get an `interviews` row (current behavior).

---

## C. Scope: what to drop

### C1. Is the text-based interview (`/start`, `/next`, `useInterview`, legacy `Interview/` components) still used?
The plan assumes it's dead (superseded by Vapi).
- **Action:** Confirm. If any flow still hits it, it must be ported; otherwise delete.

### C2. What actually consumes the Vapi webhooks (`/api/vapi/*`)?
The current handler exists but its consumers are unclear.
- **Action:** Audit before porting. If unused, drop; if used (e.g., server-side call records), port as a signature-verified Route Handler.

### C3. Drop `/roles` as a separate route?
Role is one setup field.
- **Recommendation:** Merge into `/setup` unless onboarding wants a distinct role step.

### C4. Dev scaffolding (`VapiTest`, `DashboardDemo`, `figma/ImageWithFallback`, `authService.ts`) — confirm deletion.
- **Recommendation:** Do not port; confirm nothing references them.

---

## D. Auth & data

### D1. Profile creation: client write, Server Action, or DB trigger?
- **Recommendation:** **DB trigger** on `auth.users` insert — removes the privileged client-side `profiles` upsert entirely ([13](./13-database.md) §6).

### D2. Reads via admin client + manual scoping, or via RLS + server client?
- **Recommendation:** Admin client + explicit `.eq('user_id', ...)` for parity with current behavior; enable RLS as defense-in-depth. Confirm RLS policies exist.

### D3. Email confirmation flow?
Does signup require email verification before first interview?
- **Action:** Check the Supabase project setting; the rebuild must handle the "unconfirmed" state in the auth UI if enabled.

---

## E. Performance & caching

### E1. Is identical-input AI caching desirable for *evaluation*?
Caching `evaluate` by transcript+config (1h) means re-submitting the same transcript returns the same score. Usually fine (idempotency), but confirm no requirement to "re-roll" an evaluation.
- **Recommendation:** Keep the cache; add a force-refresh path only if product wants re-evaluation.

### E2. Multi-instance cache backend?
If deploying >1 instance, `unstable_cache`'s default store may not be shared.
- **Action:** Decide whether a Redis-backed Next cache handler is needed (mirrors current optional `REDIS_URL`).

---

## F. Conventions

### F1. Component file naming: kebab-case (Next idiom) or keep PascalCase?
Route files are fixed (`page.tsx` etc.); component files are a team choice.
- **Recommendation:** kebab-case for App Router consistency; either is acceptable ([04](./04-folder-structure.md)).

### F2. Validation library — adopt `zod`?
The current backend hand-rolls validators in `validate.ts`.
- **Recommendation:** Yes — `zod` schemas in Actions/Handlers are clearer and reusable. New dependency, but justified (input validation is a security boundary).

### F3. Keep Framer Motion, or reduce to CSS/Tailwind animations?
Motion is pervasive in the current UI and adds client JS.
- **Recommendation:** Keep for genuinely interactive transitions inside islands; replace simple hover/scale with Tailwind. Respect `prefers-reduced-motion`.

### F4. Prompt builders: shared `lib/` module (client-importable) or server-only?
The Vapi assistant needs the system prompt inline, client-side.
- **Recommendation:** Put the pure string builders in a **shared `lib/` module** (no secrets) so client islands and any server analysis reuse one implementation, ending the current FE/BE duplication.

---

## G. Product/UX (smaller)

- **G1.** After evaluation, redirect to `/interviews/[id]` (replay) or `/dashboard`? (Plan assumes replay; confirm.)
- **G2.** Should history/analytics paginate? (Plan assumes yes eventually; MVP can list all.)
- **G3.** Is a public landing page in scope for MVP, or is the app invite-only/internal? (Affects whether SEO work in Phase 8 matters.)

---

## Decision log template

| # | Question | Decision | Owner | Date |
|---|---|---|---|---|
| B1 | Config handoff | | | |
| A2 | Deploy target | | | |
| A3 | Keep async jobs? | | | |
| C1 | Text interview alive? | | | |
| C2 | Vapi webhook consumers? | | | |
| D1 | Profile creation method | | | |

Fill this in before Phase 0 exits.
