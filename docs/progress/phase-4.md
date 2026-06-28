# Phase 4 — Behavioral Voice Interview (core loop)

> Status: **complete**. `typecheck`, `lint`, `test` (20), and `build` all green.
> Delivers the core loop: setup → speak → live transcript → evaluate → persisted replay.
> Ported faithfully from `reference/legacy/src` (Vapi hook, panel, mic visualizer,
> setup, keyboard shortcuts) onto the Server-First architecture.

External setup: [`docs/setup/vapi.md`](../setup/vapi.md).

> **Follow-up:** the full UI was subsequently restyled to the legacy ACE.AI
> design (branded navbar, hero home, glass cards, dark interview/replay, the
> Practice flow Home → Roles → Setup → Voice → Results, and Setup-page polish).
> See [`design-restoration.md`](./design-restoration.md).

---

## 1. What was implemented

- **Setup** (`/setup`) — server shell + `SetupForm` island (role, question type,
  difficulty, strictness, experience, interviewer + voice preview). Submit →
  `saveSetupDraft` Server Action → httpOnly cookie → redirect.
- **Voice interview** (`/interview/voice`) — server resolves the draft cookie and
  renders the `VoiceInterviewClient` island (Vapi lifecycle, timer, transcript,
  mute, keyboard shortcuts, mic visualizer).
- **Auto-evaluate + redirect** — on call end the island calls the P3
  `evaluateInterview` Server Action and `router.push('/interviews/[id]')`.

The only client code is the interactive Vapi island + setup form; persistence,
evaluation, auth, validation, and prompt-config all happen on the server.

---

## 2. Architecture (as built)

```
SetupForm (client) ──saveSetupDraft(config)──▶ Server Action
   requireUser → Zod validate (interviewConfigSchema) → cookies().set(httpOnly) → redirect
        │
        ▼
/interview/voice (Server Component): readDraft() (cookie) → redirect /setup if absent
        │ props: config
        ▼
VoiceInterviewClient (client island): getVapi().start(inline CreateAssistantDTO)
   WebRTC ↔ Vapi Cloud · live transcript/volume · timer + vapi.say warnings
        │ call end
        ▼
evaluateInterview(transcript, config, metrics)  [P3 Server Action]
   requireUser → rate-limit → Zod → analyzeVapiTranscript (OpenAI, cached 1h)
   → saveInterview (admin write) → revalidateTag(interviews/dashboard) → { id }
        │
        ▼
router.push('/interviews/[id]')  → P2 replay renders the persisted result
```

- **Server/client boundary:** route pages + draft read/write + actions = server;
  the Vapi panel + setup form = client islands. The `"use client"` boundary is
  pushed down to those two trees only.
- **Caching:** nothing new; the AI call's 1h Data Cache (P3) applies. Setup/voice
  are dynamic (cookie-bound). `evaluateInterview` revalidates the read tags.
- **Security:** `requireUser` on the action + the `(interview)` layout; the draft
  cookie is `httpOnly` + `sameSite=lax` + `secure` in prod, and is re-validated
  with Zod on read (tamper-safe); the Vapi key is public by design.

---

## 3. Architectural decisions

| # | Decision | Notes |
|---|---|---|
| D1 | **httpOnly cookie draft** for setup→interview handoff | `server/interview-draft.ts`; replaces `location.state`. Refresh-safe, server-resolved, no schema change. |
| D2 | **Inline `CreateAssistantDTO`** + shared prompt | Ported verbatim (OpenAI gpt-4.1, Deepgram nova-3, denoising); system prompt from `lib/prompts/behavioral.ts`. |
| D3 | **Auto-evaluate then redirect** to the persisted replay | On natural end or "End interview"; guarded so evaluation runs once. |
| D4 | **Vapi singleton is a lazy getter** (`getVapi()`) | Avoids constructing the browser SDK during SSR; only the island calls it. |
| D5 | **Full lifecycle ported into `hooks/use-vapi-interview.ts`** | Verbatim behavior; two changed call sites (Server Action + shared prompt/roster). |

### Intentional differences from legacy

| Area | Legacy | Rebuild | Why |
|---|---|---|---|
| Config scales | numeric 0–100 (sliders) | union labels (selects) | Approved in P3; the eval prompt consumes labels. |
| Experience levels | 4 (Intern/Entry/Junior/Senior) | 3 (junior/mid/senior) | Matches the P3 union + validation allow-list. |
| Post-eval nav | `navigate('/analytics', {state})` | `router.push('/interviews/[id]')` (persisted id) | Refresh-safe, shareable; on eval failure we stay on the page (legacy navigated with `null`). |
| Animation | `framer-motion` | Tailwind/CSS | No new dependency; functional states preserved, full visual polish deferred to Phase 8. |
| Chrome | dark `DashboardNavbar` in-panel | distraction-free `(interview)` layout (no navbar) | Established in P1; the island owns the screen. |
| Visual skin | dark glassmorphism gradients | neutral shadcn tokens | Architecture, not redesign — design refresh is Phase 8. |

---

## 4. Legacy parity checklist

### `useVapiInterview` hook — every capability

| Capability | Status |
|---|---|
| `status` state machine (idle/connecting/active/ended) | ✅ Ported |
| `isSpeaking` / `isListening` via `speech-start`/`speech-end` | ✅ Ported |
| `isMuted` + `toggleMute` (`vapi.setMuted`) | ✅ Ported |
| `volumeLevel` via `volume-level` | ✅ Ported |
| Final-transcript accumulation (`messages` + `messagesRef`) | ✅ Ported |
| `isAnalyzing` flag | ✅ Ported |
| `callEndedNaturally` flag | ✅ Ported |
| `errorMessage` + nested `getVapiErrorText` | ✅ Ported (verbatim) |
| `onError` returns connecting→idle for retry | ✅ Ported |
| `start()`: `AudioContext.resume()` gesture unlock | ✅ Ported |
| `start()`: interviewer resolution + inline `CreateAssistantDTO` | ✅ Ported (gpt-4.1, deepgram nova-3, denoising) |
| `stop()` | ✅ Ported |
| `evaluateTranscript()` (min-2 guard, `isAnalyzing`) | ✅ Ported — now calls `evaluateInterview` Server Action |
| `INTERVIEWERS` roster (cassidy/alex/jordan, voices, personalities) | ✅ Ported → `lib/constants.ts` |
| `resolveVoice` | ✅ Folded into the roster (voice object used directly) |
| `buildSystemPrompt` / `buildFirstMessage` (+ speech-style guide) | ✅ Ported → `lib/prompts/behavioral.ts` (union labels) |
| `getDifficultyLabel`/`getExperienceLabel`/`getStrictnessLabel` | 🔄 Changed — union `titleCase` (config is already label-typed) |

### Behavioral panel (`VapiInterviewPanel`)

| Capability | Status |
|---|---|
| Countdown timer by difficulty (20/25/30 min) | ✅ Ported |
| `vapi.say()` warnings at 2 min + auto-end goodbye at 0 | ✅ Ported |
| Timer color thresholds + progress bar + warning banner | ✅ Ported |
| Settings chips | ✅ Ported |
| Status bar + `MicVisualizer` | ✅ Ported (CSS rings) |
| Interviewer/You avatars + speaking/listening indicators | ✅ Ported |
| Live transcript (reverse-stacked) | ✅ Ported |
| Keyboard shortcuts (Ctrl+Enter, Esc, M, Ctrl+Shift+M) | ✅ Ported |
| `KeyboardShortcutsHelp` modal | ✅ Ported |
| Controls (idle/connecting/analyzing/active) | ✅ Ported |
| Auto-evaluate on natural end | ✅ Ported (single-run guard added) |
| In-panel dark navbar | 🔄 Changed — distraction-free layout |

### Setup (`SetupDashboard`)

| Capability | Status |
|---|---|
| Role select (8 roles) | ✅ Ported |
| Question-type toggle | ✅ Ported (technical routes to its P5 placeholder) |
| Difficulty / strictness / experience | 🔄 Changed — union selects (was 0–100 sliders) |
| Interviewer selection + avatars | ✅ Ported |
| Voice preview (gpt-4o-mini stay-silent) | ✅ Ported |
| Start → handoff | 🔄 Changed — `saveSetupDraft` cookie + server redirect (was `location.state`) |
| Language selection (technical) | ⏸ Deferred → P5 |
| Topic filter (technical) | ⏸ Deferred → P5 |

---

## 5. Verification

- `pnpm typecheck` — pass (0)
- `pnpm lint` — pass (0)
- `pnpm test` — **20 passed** (added behavioral prompt builder tests; reference/ excluded)
- `pnpm build` — pass (0); Vapi SDK stays in the client island, no secret leak

### Manual testing
Prereq: `NEXT_PUBLIC_VAPI_PUBLIC_KEY` set + Vapi providers configured
([`docs/setup/vapi.md`](../setup/vapi.md)) + `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY`.
Then `pnpm dev`, logged in:

1. `/setup` → pick role/difficulty/interviewer → **Preview voice** plays a sample.
2. **Start interview** → lands on `/interview/voice` with config resolved (refresh-safe).
3. Grant mic → greeting plays → speak a few turns → transcript fills; mute (M) works.
4. **End interview** (or let the timer reach 0) → "Analyzing…" → redirected to
   `/interviews/[id]` showing the real evaluation (score + dimensions + breakdown).
5. Edge: visit `/interview/voice` with no draft → redirected to `/setup`.
6. Edge: end with < 2 messages → no evaluation, no navigation.
7. Edge: deny mic / Vapi error → inline error, returns to idle for retry.

---

## 6. Known limitations / future work

- **Technical interview** (Monaco, code execution, language/topics) → **P5**.
- **Visual design** (gradients, motion, polish) → **P8**; current skin is neutral.
- **Rate limiting** is in-memory (single instance) — Redis when the deploy target is set.
- **Vapi webhook** (server events) → **P7** (audit first).
- Voice preview relies on the legacy "stay silent" prompt trick; acceptable, revisit if Vapi adds a native preview.

---

## 7. Production-readiness hardening (post-implementation audit)

A correctness/robustness pass over the Vapi island and setup form. Fixes applied:

| # | Issue | Fix |
|---|---|---|
| 1 | **Call not stopped on unmount** — navigating away mid-call left the mic + WebRTC connection running | Hook cleanup now calls `vapi.stop()` on unmount (no-op if no active call) |
| 2 | **Stale state on restart** — a second interview in the same mount reused the old timer/warnings | Reset timer + `startedAt`/`navigated`/warning refs in the Start handler |
| 3 | **Uncleared auto-end timeout** — the 0:00 goodbye→end `setTimeout` leaked on unmount | Tracked in a ref and cleared on unmount |
| 4 | **AudioContext accumulation** — `new AudioContext()` per start/preview (browsers cap concurrent contexts) | Single shared, reused context via `unlockAudio()` in `lib/vapi.ts` (hook + setup) |
| 5 | **Transcript re-renders** — `[...messages].reverse()` + index keys re-keyed every row per message | Map in original order with `flex-col-reverse` + stable keys |
| 6 | **Accessibility** | `aria-live="polite"` on the status text, `aria-label` on the icon-only mute button, `role="progressbar"` on the timer bar |
| 7 | **Stale draft cookie** — refreshing the interview route after finishing replayed the same config | `clearDraft()` after a successful evaluation consumes the draft |
| 8 | **Dead `messagesRef`** in the hook | Removed |

Deliberately left as-is (working / out of scope): `window.confirm` on Esc (legacy
parity), Vapi event-ordering edge cases, no `loading.tsx` on the instant cookie-read
routes, and the narrow setup-preview unmount race during the initial delay.

Re-verified after hardening: `typecheck` / `lint` / `test` (20) / `build` all green.

---

## 8. Files

**Created:** `lib/vapi.ts`, `lib/prompts/behavioral.ts`,
`hooks/use-vapi-interview.ts`, `hooks/use-keyboard-shortcuts.ts`,
`components/interview/{voice-interview-client,mic-visualizer,keyboard-shortcuts-help}.tsx`,
`components/setup/setup-form.tsx`, `server/interview-draft.ts`,
`lib/prompts/behavioral.test.ts`, `docs/setup/vapi.md`.

**Modified:** `app/(app)/setup/page.tsx`, `app/(interview)/interview/voice/page.tsx`,
`actions/interview.ts` (+`saveSetupDraft`), `lib/constants.ts` (interviewer roster),
`config/env.public.ts` + `.env.example` (Vapi key), `vitest.config.ts` (exclude
`reference/`), `package.json` (`@vapi-ai/web`).

**Unchanged:** `(interview)/layout.tsx`, `(interview)/error.tsx`, P3 actions/server
logic, P2 read pages.
