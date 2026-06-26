# 06 — Server vs Client Component Analysis

The core of the rebuild. For every page and major feature: Server, Client, or Hybrid — and **why**. The guiding rule: **Server Component by default; a Client island only for browser APIs or live interactivity.**

---

## Master decision matrix

| Page / feature | Classification | Server part | Client island(s) | Why |
|---|---|---|---|---|
| Landing / hero | **Server (static)** | Entire page | — | No interactivity; SEO; cacheable |
| Login / Signup | **Hybrid** | Page shell, redirect-if-authed | `<AuthForm>` | Form state + Supabase client call |
| Dashboard | **Hybrid** | Shell + metrics fetch | `<ScoreTrendChart>` | Recharts needs client; metrics fetched on server |
| Analytics | **Hybrid** | Aggregate fetch | `<ScoreTrendChart>`, expandable rows | Same as dashboard; chart is the only client need |
| Interviews list | **Server** | List query + render | — (links only) | Pure read; no interactivity |
| Replay `[id]` | **Hybrid** | Fetch by id + render transcript/scores | optional collapse toggles | Mostly static; minor toggles can be client |
| Setup | **Hybrid** | Static shell | `<SetupForm>` (sliders, submit) | Radix sliders + submit are interactive |
| Roles | **Hybrid** | Shell | role picker | Selection interaction |
| Profile | **Hybrid** | Read profile | role `<form>` → Action | Read on server, mutate via Action |
| Behavioral interview | **Hybrid** | Resolve config + interviewer | `<VoiceInterviewClient>` | WebRTC/mic/Web Audio/real-time |
| Technical interview | **Hybrid** | Resolve config + **load problems** | `<TechnicalInterviewClient>` (Monaco, voice, timer) | Editor/WASM/voice are client; problems fetched server-side |
| DashboardNavbar | **Server** (mostly) | Render links + user name | tiny client bit only if it has a dropdown/logout button | Nav is presentational; logout can be a small client action |
| MicVisualizer | **Client** | — | whole component | Reads live `volumeLevel` |
| Transcript timeline (replay) | **Server** | Render from fetched data | — | Static once interview is over |
| Charts (Recharts) | **Client** | — | whole component | Library renders to DOM/SVG client-side |

---

## Per-feature deep dives

### Behavioral interview — Hybrid (server shell + one client island)

**Server (`app/(interview)/interview/voice/page.tsx`):**
- `requireUser()`.
- Resolve `VapiInterviewConfig` from persisted setup draft or `searchParams` (not router state).
- Resolve interviewer metadata (name/voice/personality) — can stay a shared `lib/constants.ts`.
- Render `<VoiceInterviewClient config={config} />`.

**Client (`components/interview/voice-interview-client.tsx`):**
- Carries over `useVapiInterview` essentially unchanged: `vapi.start()`, event listeners, transcript, mute, volume, `AudioContext.resume()` in the click handler.
- On end: calls **Server Action** `evaluateInterview(transcript, config)` (replaces `POST /evaluate`), then `router.push('/interviews/' + id)`.

**Why hybrid:** WebRTC + mic + Web Audio gesture cannot run on the server. But config resolution, auth, and (optionally) prompt building are server work. The `"use client"` boundary is pushed down to just the panel.

> **System prompt building:** today `buildSystemPrompt`/`buildFirstMessage` run client-side because Vapi needs the prompt inline in `CreateAssistantDTO`. Options: (a) keep them in a **shared `lib/` module** importable by client (no secrets in them — they're pure string builders), or (b) build server-side and pass the finished prompt as a prop. (a) is simplest and dedupes with the backend's prompt logic. The prompt strings contain no secrets, so client inclusion is safe.

### Technical interview — Hybrid (the big win is server problem-loading)

**Server (`.../technical-interview/page.tsx`):**
- `requireUser()`, resolve config.
- **Load problems on the server**: if `selectedTopics.length > 0` → read local bank (`data/technical-problems.ts`); else `await generateQuestions(...)` via `server/ai` (cached). This removes the current client `useEffect` → `generateInterviewQuestions` roundtrip and hides generation logic.
- Render `<TechnicalInterviewClient problems={problems} config={config} />`.

**Client island:**
- Monaco editor, `use-code-execution`, voice (`use-vapi-technical-interview`), countdown timer, `vapi.say()` warnings, keyboard shortcuts, "next locked until passed" logic — all carry over.
- JS/TS/Python execute in-browser; Java/C++/Bash POST to `/api/execute` Route Handler.
- Evaluation → Server Action.

**Why hybrid:** Monaco + Pyodide + Vapi are all browser-only, so the interactive layout is a client island. But problem generation (an OpenAI call) belongs on the server — faster first paint, hidden prompts, cacheable.

### Analytics / Dashboard — Hybrid (eliminate the `useEffect` fetch)

**Current:** `AnalyticsDashboard` does `useEffect(() => getInterviewHistory().then(setHistory))` — a client waterfall that over-fetches transcripts just to chart scores.

**Rebuild:**
- **Server page** awaits `buildDashboard(userId)` (aggregate, cached 60s) — or a slim query selecting `created_at, result.score` for the chart.
- Passes serializable data to `<ScoreTrendChart data={...} />` (client, Recharts) and renders metric cards + recent rows as **server** markup.
- The "fresh result just now" case disappears: after evaluation we already persisted + redirect, so the dashboard simply reads current data.

**Why hybrid:** Only the chart needs the client. Everything else is server-rendered, streamable, and cacheable. See [10](./10-streaming-loading.md).

### History list / Replay — Server

Pure reads, owner-scoped, no interactivity beyond links. Current client fetches become direct server queries. Replay renders the transcript timeline as server markup; only optional collapse/expand toggles (if any) would be a tiny client component.

### Auth forms — Hybrid

Page shells are server (and redirect authenticated users away). The form itself is a Client Component using the browser Supabase client (or a Server Action) for `signInWithPassword` / `signUp` / OAuth. OAuth completion is handled by the `/auth/callback` Route Handler.

---

## "Where did the `useEffect` go?" — fetch elimination table

| Current client fetch | Becomes |
|---|---|
| `AnalyticsDashboard` → `getInterviewHistory()` | Server query in `analytics/page.tsx` |
| `InterviewsPage` → `getInterviews()` | Server query in `interviews/page.tsx` |
| `InterviewReplayPage` → `getInterview(id)` | Server query in `interviews/[id]/page.tsx` |
| `TechnicalInterviewLayout` → `generateInterviewQuestions()` | Server call in `technical-interview/page.tsx` |
| `auth.ts` session warming + `ProtectedRoute` session check | Middleware + server `requireUser()` |
| `getUser()` sync cache | Server `getUser()` per request; client gets user via props/context if needed |

Every one of these `useEffect`-based fetches **disappears** from the client. Remaining `useEffect`s are legitimately client-side: Vapi event subscription, countdown timers, keyboard listeners, Pyodide loading.

---

## Keep-as-client checklist (irreducibly client)

- `lib/vapi.ts` singleton + all Vapi event handling
- Monaco editor
- Pyodide / WASM code execution
- `AudioContext` unlock
- Live transcript accumulation, mute toggle, volume meter
- Countdown timers + `vapi.say()` warnings
- Keyboard shortcuts
- Recharts charts
- Radix sliders and other interactive form controls
