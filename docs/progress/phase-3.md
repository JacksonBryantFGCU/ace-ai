# Phase 3 — Server Business-Logic Port (evaluate → persist → profile)

> Status: **complete**. `typecheck`, `lint`, `test`, and `build` all green.
> Scope: the evaluate→persist loop + role mutation. Ported from the original
> Express backend (`reference/legacy/`). Question generation, code execution, and
> analytics are deferred (see §7).

---

## 1. What was implemented

The secret-bearing server layer and the first mutation surface — everything the
Phase 4 behavioral interview needs to score and persist a call. No UI this phase
(exit criterion: "callable and tested in isolation").

- **`server/db/admin.ts`** — service-role Supabase client (first privileged write).
- **`server/ai/`** — `client.ts` (OpenAI), `evaluate.ts` (`analyzeVapiTranscript`,
  cached 1h, JSON-mode, ported fallback), `prompts/evaluation.ts` (pure builders).
- **`server/cache.ts`** — `hashInput` (sha256 cache keys) + ported TTLs.
- **`server/rate-limit.ts`** — in-memory fixed-window limiter (`ai` = 10/min).
- **`server/storage.ts`** — added `saveInterview` (admin write, metrics columns,
  `sanitizeError`); Phase 2 reads untouched.
- **`actions/interview.ts`** — `evaluateInterview(transcript, config, metrics?)`.
- **`actions/profile.ts`** — `updateRole(role)`.
- **`lib/validation/interview.ts`** — Zod schemas (transcript, config, role).
- **Tests** — vitest unit tests for the deterministic logic (15 tests).

---

## 2. Contract reconciliation (legacy ⇄ Phase 2)

The Phase 2 types were derived from the rebuild docs and **diverged** from the
real backend contracts. Reconciled per decision:

| Contract | Decision | Change |
|---|---|---|
| `VapiAnalysisResult` | **Adopt legacy shape** | Now `score` + `communication`/`technicalAccuracy`/`problemSolving` + `questionBreakdown[]` (was `breakdown:Record` + `summary`). Updated `types/interview.ts` **and** the Phase 2 `score-summary.tsx` to render it. |
| `VapiInterviewConfig` | **Keep union labels** | Eval prompt consumes labels directly (no 0–100 sliders). Dropped `"hybrid"`; `experience` trimmed to `junior\|mid\|senior`. |
| Question generation / `CodingProblem` | **Defer to P5** | Not ported; reconciled when the technical interview consumes it. |
| Env naming | Next conventions | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (not legacy `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE`). |
| `OPENAI_MODEL` | Ported default | `gpt-4o-mini`. |

---

## 3. Request / data flow

```
client island (P4/P5) → evaluateInterview(transcript, config, metrics?)   [Server Action]
 → requireUser()                                  (never trust a client user id)
 → rateLimit(user.id, "ai")                       (10/min; in-memory)
 → drop system turns; zod-validate transcript (≥2, ≤200, assistant|user) + config
 → analyzeVapiTranscript(transcript, config)      [server/ai, unstable_cache 1h,
        key = sha256(transcript+config), tag "analysis"] → OpenAI JSON mode
        → VapiAnalysisResult (fallback on parse/API failure)
 → saveInterview(user.id, …)                      [server/storage, ADMIN client write,
        config/result/transcript + metrics; sanitizeError]
 → revalidateTag(`interviews:${id}`,"max"), revalidateTag(`dashboard:${id}`,"max")
 → { ok:true, id, result }  |  { ok:false, error }   (generic; cause logged server-side)

<form action={updateRole}> → updateRole(role)     [Server Action]
 → requireUser() → role ∈ VALID_ROLES → admin update profiles.role
 → revalidateTag(`profile:${id}`,"max") → { ok:true }
```

The cache wraps only the **pure** OpenAI computation, keyed on transcript+config
(not user) — identical transcripts return the same score, no cross-user leakage.
The write is never cached. The `revalidateTag` calls are forward-compatible: Phase
2 reads are still uncached (always fresh), so they're effectively no-ops until
read-caching lands in P6.

---

## 4. Architecture decisions

| # | Decision | Notes |
|---|---|---|
| D1 | **Service-role admin client introduced** | First privileged write. `server-only`; never imported client-side (verified by build). Bypasses RLS, so writes always scope by `user.id`. |
| D2 | **Cache only the pure AI call** (`unstable_cache`, 1h) | Keyed on input hash; writes + per-user reads stay dynamic. |
| D3 | **`revalidateTag(tag,"max")`** | Next 16 requires the 2nd arg; single-arg is deprecated. `"max"` = stale-while-revalidate. |
| D4 | **In-memory rate limiter** | Single-instance only; needs Redis when the deploy target (open Q A2) is decided. Must-not-drop security property. |
| D5 | **Typed discriminated results** | Actions return `{ ok, … }`; throw only on the unexpected → `error.tsx`. |
| D6 | **System transcript turns filtered** before validation/scoring | Matches the legacy assistant/candidate-only analysis. |
| D7 | **`reference/legacy/` excluded** from tsconfig/eslint | Porting reference only (imports `express`/`ioredis` etc. that aren't app deps). |

---

## 5. Verification

- `pnpm typecheck` — pass (0)
- `pnpm lint` — pass (0)
- `pnpm test` — **15 passed** (validation schemas, rate limiter, cache hashing, prompt builders)
- `pnpm build` — pass (0); secrets confined to the server (no client-bundle leak)

### Manual / integration (optional, requires live keys)
The OpenAI/admin paths can't be unit-tested without credentials. To exercise them
before the P4 UI exists, with `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`, call `evaluateInterview` from a temporary server context (or wait
for the P4 interview island, which calls it for real). A successful call returns
`{ ok:true, id }` and inserts one `interviews` row visible at `/interviews/[id]`.

---

## 6. Assumptions / prerequisites

- **`.env.local` must now include** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY`
  (optional `OPENAI_MODEL`). `.env.example` updated.
- `interviews` write columns already verified to exist (Phase 2 probe). The admin
  client bypasses RLS, so the insert policy is irrelevant to it.

---

## 7. Deferred to later phases

- **Question generation** (`generateInterviewQuestions`) + `CodingProblem`
  reconciliation → **P5** (with code execution).
- **Code execution** (`server/code-execution.ts` + `/api/execute`) → **P5**
  (Java/C++/Bash sandbox is a security decision made where it's consumed).
- **Analytics** (`buildDashboard`) → **P6**.
- **`saveSetupDraft`** + config-handoff (open Q B1) → **P4**.
- **Async jobs / worker / `/api/jobs` / metrics / Vapi webhooks** → **P7**.
- **Redis-backed rate limiting / cache** → when the deploy target is decided.

---

## 8. Files

**Created:** `server/db/admin.ts`, `server/ai/client.ts`, `server/ai/evaluate.ts`,
`server/ai/prompts/evaluation.ts`, `server/cache.ts`, `server/rate-limit.ts`,
`actions/interview.ts`, `actions/profile.ts`, `lib/validation/interview.ts`,
`vitest.config.ts`, `test/stubs/empty.ts`, and tests
(`lib/validation/interview.test.ts`, `server/rate-limit.test.ts`,
`server/cache.test.ts`, `server/ai/prompts/evaluation.test.ts`).

**Modified:** `server/storage.ts` (+`saveInterview`), `types/interview.ts`
(`VapiAnalysisResult`, `ExperienceLevel`), `components/interviews/score-summary.tsx`
(new result shape), `lib/constants.ts` (`VALID_ROLES`, experience levels),
`config/env.server.ts` (secret accessors), `.env.example`, `package.json`
(openai, vitest, `test` script), `tsconfig.json` + `eslint.config.mjs`
(exclude `reference/`).

**Note:** `reference/legacy/` (the uploaded backend) is intentionally **untracked**
and excluded from tooling — kept locally as porting reference.
