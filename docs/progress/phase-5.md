# Phase 5 — Technical Interviews

> Status: **complete, pending review** (not committed). `typecheck`, `lint`,
> `test` (37), and `build` all green.

Delivers the technical interview: a Vapi voice discussion **plus** a Monaco code
editor with browser-side test execution and gated progression. Server-First —
the route loads problems on the server; one client island owns the editor/voice.

## Approved decisions
- **Execution = Option A:** JavaScript/TypeScript/Python run **entirely in the
  browser**; Java/C++/Bash deferred until a real sandbox exists. `/api/execute`
  is a guarded stub (auth + validation + rate limit).
- **`CodingProblem` canonical** in `types/interview.ts`; `TestCase` standardized
  on **`expected`** (no `expectedOutput`); `examples`/`constraints` optional.
- **Monaco** via `@monaco-editor/react` + `monaco-editor` (new deps).
- **Generalize**, don't duplicate: behavioral + technical share the lifecycle
  hook, timer, transcript handling, and the speech-style prompt block.

## Architecture / flow
`/setup` (technical → language + topics) → `saveSetupDraft` (httpOnly cookie) →
`/technical-interview` **(Server Component)** resolves the draft and loads 3
problems (`server/problems.resolveProblems`: local bank when topics chosen, else
AI-generated, cached) → `<TechnicalInterviewClient>` (the only client island) →
end → `evaluateInterview` Server Action (reused, Phase 3) → `/interviews/[id]`.

## Generalization (shared infrastructure)
- `hooks/use-vapi-interview.ts` — now generic: `start(assistant)` takes a
  prebuilt assistant config; the caller builds it via `lib/interview/assistant`
  + the relevant prompt module. Behavioral and technical share one hook.
- `hooks/use-interview-timer.ts` — shared countdown + one-shot warning/time-up
  callbacks; used by both islands.
- `lib/prompts/shared.ts` — `SPEECH_STYLE_GUIDE` shared by both system prompts.
- `lib/interview/assistant.ts` — shared inline Vapi assistant builder.

## Files

**New**
- Route: `app/(interview)/technical-interview/page.tsx` (rewrite), `…/loading.tsx`,
  `app/api/execute/route.ts` (guarded stub).
- Island + components: `components/interview/technical-interview-client.tsx`,
  `code-editor.tsx`, `code-panel.tsx`, `test-results.tsx`,
  `technical-toolbar.tsx`, `technical-prompt-card.tsx`, `technical-chat-panel.tsx`.
- Hooks: `hooks/use-code-execution.ts`, `hooks/use-interview-timer.ts`.
- Execution lib: `lib/code-exec/{types,strip-typescript,deep-equal,run-js,
  pyodide,execute}.ts` (+ tests for strip + deep-equal).
- Problems/AI: `lib/data/technical-problems.ts` (+ test), `server/problems.ts`,
  `server/ai/generate-problems.ts`, `lib/validation/problem.ts`.
- Prompts/shared: `lib/prompts/technical.ts` (+ test), `lib/prompts/shared.ts`,
  `lib/interview/assistant.ts`, `lib/languages.ts`.

**Modified**
- `types/interview.ts` (CodingProblem/TestCase canonical + examples/constraints).
- `lib/constants.ts` (`TOPIC_CATEGORIES`, `TOPIC_LABELS`).
- `lib/prompts/behavioral.ts` (use shared speech-style block).
- `hooks/use-vapi-interview.ts`, `components/interview/voice-interview-client.tsx`
  (generalized `start(assistant)`).
- `components/setup/setup-form.tsx` (language + focus-topics for technical).

## Code execution
- **Browser:** JS via `new Function`; TS stripped → JS; both run in a **Blob Web
  Worker with a 5s timeout** (hardening over the legacy main-thread runner — an
  infinite loop times out instead of freezing the tab). Python via **Pyodide**
  (CDN, lazy singleton, preloaded when chosen; main-thread, no hard timeout yet).
- **Deferred:** Java/C++/Bash return an "unsupported" result; `/api/execute`
  rejects them (501). The legacy `child_process` host execution is **not**
  reintroduced (RCE risk, not serverless-viable).
- Equality: structural `deepEqual` with 1e-6 float tolerance (ported).

## Security
- `/api/execute`: `requireUser` + rate-limit + Zod body validation + size caps;
  always rejects (no untrusted host execution).
- Browser execution runs the user's own code in their own session; the worker +
  timeout contains runaway loops. Pyodide from CDN (note CSP if tightened).
- AI-generated problems validated with Zod; fall back to the local bank on
  malformed output.

## Server vs Client
- **Server:** technical route (draft + problem loading + auth), `server/problems`,
  `server/ai/generate-problems`, `/api/execute`, evaluation/persistence (reused).
- **Client island:** `TechnicalInterviewClient` + children — Monaco, Pyodide,
  Vapi, timer, shortcuts, editor state. Monaco mounts via `dynamic(ssr:false)`.

## Legacy parity checklist
- [x] Voice discussion interviewer reading problem prompts (technical system prompt)
- [x] Monaco editor, per-problem starter code, editor state preserved per problem
- [x] Run tests; pass/fail/actual/expected/error panel
- [x] "Next locked until all tests pass" gated progression
- [x] Timer (20/25/30 min) + `vapi.say()` warnings at 2:00 and auto-end at 0:00
- [x] Keyboard shortcuts (Ctrl+Enter run, Esc end, M / Ctrl+Shift+M mute)
- [x] Topic-filtered local bank vs AI generation; fallback set
- [x] Evaluate transcript → persisted result (reused Phase 3 action)
- [x] JS/TS/Python execution
- [~] Experience mapped to the 4-level union (intern/entry/junior/senior); config
      uses union labels, not the legacy 0–100 scales
- [ ] Java/C++/Bash execution — **deferred** (Option A; needs a real sandbox)
- [~] Problem bank is a curated subset (9 problems across topics/difficulties);
      expandable. AI generation is the primary path when no topics are chosen.

## Verification
- `pnpm typecheck` ✓ · `pnpm lint` ✓ (0 warnings) · `pnpm test` ✓ 37/37 ·
  `pnpm build` ✓ (`/technical-interview` + `/api/execute` compile; no Monaco SSR error).
- Manual E2E pending review: setup (technical) → problems load → write/run
  JS/TS/Python → gating → timer → end → evaluate → replay.
