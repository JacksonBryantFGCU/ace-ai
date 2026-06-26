# 11 — Server Actions

Which current operations become Server Actions, their signatures, and the rules they follow.

---

## 1. What qualifies as a Server Action

A Server Action is right when **a mutation or secret-bearing operation is triggered by the UI** and the result feeds back into React. In ACE.AI:

| Operation | Today | Server Action? | Why |
|---|---|---|---|
| Evaluate transcript + save | `POST /api/analysis/evaluate` | ✅ `evaluateInterview` | Mutation (writes interview), secret (OpenAI), UI-triggered at call end |
| Generate questions (sync) | `POST /api/analysis/questions` | ✅ or server util | Secret (OpenAI); usually called during server render, but a client "regenerate" button would use an Action |
| Update role | `PATCH /api/auth/me/role` | ✅ `updateRole` | Mutation tied to a form |
| Save setup draft | (router state today) | ✅ `saveSetupDraft` | Persists config, redirects |
| Sign in / up / out | client SDK | ⚠️ optional Actions | Can stay client SDK, or wrap as Actions for cookie handling |
| Code execution (Java/C++/Bash) | `POST /api/execute` | ❌ Route Handler | Machine endpoint, polled by client runtime, not a React mutation |
| Async enqueue | `POST /.../async` | ❌ Route Handler | Returns a job id for polling; machine-style |
| Job poll | `GET /api/jobs/:id` | ❌ Route Handler | Read endpoint polled by client |
| Vapi webhook | `POST /api/vapi/*` | ❌ Route Handler | External caller |

See [12](./12-api-migration.md) for the full endpoint table.

---

## 2. Action catalog

### `evaluateInterview(transcript, config)` — `actions/interview.ts`

```ts
"use server";
export async function evaluateInterview(
  transcript: TranscriptEntry[],
  config: VapiInterviewConfig,
): Promise<{ ok: true; id: string; result: VapiAnalysisResult } | { ok: false; error: string }> {
  const user = await requireUser();
  if (transcript.length < 2) return { ok: false, error: "Not enough conversation to evaluate" };
  try {
    const analysisTranscript = transcript.map(({ role, text }) => ({ role, text }));
    const result = await analyzeVapiTranscript(analysisTranscript, config); // server/ai, cached 1h
    const saved = await saveInterview(user.id, config, result, transcript, { /* metrics */ });
    revalidateTag(`interviews:${user.id}`);
    revalidateTag(`dashboard:${user.id}`);
    return { ok: true, id: saved.id, result };
  } catch (e) {
    console.error("evaluateInterview failed:", e);
    return { ok: false, error: "Failed to evaluate interview" };
  }
}
```

Replaces `evaluateVapiInterview()` + `POST /evaluate`. Called by both interview client islands at call end; on `ok`, the island `router.push('/interviews/' + id)` (or the action itself can `redirect`).

### `generateQuestions(role, difficulty, level, language)` — `actions/interview.ts`

Wraps `server/ai/questions`. Primarily called **server-side** in the technical interview page (not an action there — just an awaited util). Exposed as an Action only if the UI offers a "regenerate problems" button. Caching per [09](./09-caching.md).

### `updateRole(role)` — `actions/profile.ts`

```ts
"use server";
export async function updateRole(role: string) {
  const user = await requireUser();
  if (!VALID_ROLES.has(role)) return { ok: false, error: "Invalid role" };
  await adminDb.from("profiles").update({ role }).eq("id", user.id);
  revalidateTag(`profile:${user.id}`);
  return { ok: true };
}
```

Replaces `PATCH /api/auth/me/role`. Bound to a `<form action={updateRole}>` or called from a client select.

### `saveSetupDraft(config)` — `actions/interview.ts`

Persists the interview config (cookie or `interview_drafts` row), then `redirect('/interview/voice')` or `/technical-interview`. Replaces `location.state` config passing. See [07](./07-data-flow.md) §4.

### (optional) `signIn` / `signUp` / `signOut` — `actions/auth.ts`

Wrap Supabase server client to set/clear cookies. Alternative to client-SDK auth. `signUp` can also create the `profiles` row (or defer to a DB trigger). See [08](./08-authentication.md).

---

## 3. Rules every Action follows

1. **`"use server"`** at the top of the file (or inline).
2. **Authenticate first** — `await requireUser()`; never trust client-supplied user ids.
3. **Validate input at the boundary** — Actions are a public callable surface. Re-validate everything (mirrors the current `validate.ts` middleware: role allow-list, transcript shape, payload size). Consider `zod` schemas.
4. **Call `server/` logic, don't inline business rules** — keep Actions thin.
5. **Revalidate** affected tags/paths after a successful mutation.
6. **Return typed discriminated results** (`{ ok, ... }`) for expected failures; throw only for truly unexpected errors (→ error boundary).
7. **Never leak internals** — generic error strings out, real cause logged server-side.
8. **Keep secrets server-side** — OpenAI/service-role only inside Actions/`server/`.

---

## 4. Input validation parity

The current backend validates via `middleware/validate.ts` (`validateQuestionGeneration`, `validateTranscriptEvaluation`, `validateCodeExecution`) and a `VALID_ROLES` set. The rebuild reproduces this **inside each Action/Handler**:

| Current validator | Rebuild location |
|---|---|
| `validateTranscriptEvaluation` | top of `evaluateInterview` |
| `validateQuestionGeneration` | top of `generateQuestions` / questions handler |
| `validateCodeExecution` | top of `/api/execute` handler |
| `VALID_ROLES` | `updateRole` |

---

## 5. Rate limiting note

Express used `express-rate-limit` tiers (global/auth/ai/execute). Server Actions and Route Handlers don't get this for free. Reintroduce limiting via:
- Middleware-level limiting for `/api/*` and action endpoints (e.g., a Redis token bucket), or
- A small `rateLimit(userId, bucket)` guard called at the top of expensive Actions (`evaluateInterview`, `generateQuestions`) and `/api/execute`.

This is a **must-not-drop** security property — see [16](./16-rebuild-roadmap.md) risks.
