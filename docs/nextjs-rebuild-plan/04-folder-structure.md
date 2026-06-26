# 04 — Folder Structure

A complete App Router layout for the rebuild, with the rationale for every top-level folder. Single Next.js app, **pnpm**.

---

## Top-level

```
ace-ai/
├── app/                      # App Router: routes, layouts, route handlers
├── components/               # Reusable presentational components (server + client)
├── server/                   # Server-only business logic (ported backend services)
├── actions/                  # Server Actions (mutations callable from the client)
├── lib/                      # Thin browser/runtime-agnostic clients & helpers
├── hooks/                    # Client-only React hooks
├── providers/                # Client context providers (theme, toasts, etc.)
├── types/                    # Shared TypeScript types (single source of truth)
├── data/                     # Static data (local coding-problem bank)
├── config/                   # App configuration, env parsing, constants
├── styles/                   # Tailwind globals
├── middleware.ts             # Session refresh + route gating
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

> A `services/` and `utils/` folder are intentionally **merged into `server/` and `lib/`**. In the SPA, "services" were API clients (now gone — replaced by direct server reads + Actions) and "utils" were small helpers (now split: server helpers live in `server/`, client/shared helpers in `lib/`). Keeping empty `services/`/`utils/` shells would invite the old client-fetch pattern back.

---

## `app/` — routes, layouts, handlers

```
app/
├── layout.tsx                       # Root layout: <html>, fonts, global providers
├── globals.css                      # Tailwind entry
├── page.tsx                         # (redirects to /dashboard or marketing — see routing)
│
├── (marketing)/                     # PUBLIC route group — static, SEO
│   ├── layout.tsx                   # Marketing chrome (public navbar/footer)
│   └── page.tsx                     # Landing / hero
│
├── (auth)/                          # PUBLIC route group — auth screens
│   ├── layout.tsx                   # Centered auth shell
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── auth/
│   └── callback/route.ts            # OAuth code-exchange Route Handler
│
├── (app)/                           # PROTECTED route group — requires session
│   ├── layout.tsx                   # Reads user (server), renders DashboardNavbar, gates
│   ├── dashboard/
│   │   ├── page.tsx                 # Server shell
│   │   ├── loading.tsx              # Skeleton
│   │   └── error.tsx
│   ├── analytics/
│   │   ├── page.tsx                 # Server aggregate → client chart island
│   │   └── loading.tsx
│   ├── interviews/
│   │   ├── page.tsx                 # History list (server)
│   │   ├── loading.tsx
│   │   └── [id]/
│   │       ├── page.tsx             # Replay (server, notFound on miss)
│   │       └── loading.tsx
│   ├── setup/
│   │   └── page.tsx                 # Server shell + client form island
│   ├── roles/
│   │   └── page.tsx                 # Role selection (optional/merge into setup)
│   └── profile/
│       └── page.tsx                 # Profile + role Server Action
│
├── (interview)/                     # PROTECTED, minimal-chrome layout for live calls
│   ├── layout.tsx                   # Full-height, no navbar distractions
│   ├── interview/
│   │   └── voice/page.tsx           # Behavioral: server shell → VoiceInterviewClient
│   └── technical-interview/
│       └── page.tsx                 # Technical: server loads problems → TechnicalClient
│
└── api/                             # Route Handlers (machine endpoints)
    ├── execute/route.ts             # Java/C++/Bash runner
    ├── jobs/[id]/route.ts           # Job polling
    ├── analysis/
    │   ├── evaluate-async/route.ts  # Enqueue evaluate job
    │   └── questions-async/route.ts # Enqueue questions job
    └── vapi/[...path]/route.ts      # Vapi webhooks (public, signature-verified)
```

**Why route groups?** `(marketing)`, `(auth)`, `(app)`, `(interview)` segment the app by **layout + auth posture** without adding URL segments. Public groups are statically renderable and crawlable; `(app)` and `(interview)` share auth gating but differ in chrome (full dashboard nav vs. distraction-free interview). See [05](./05-routing-plan.md).

---

## `server/` — server-only business logic

Ported, near-verbatim, from `backend/src/services/*`. Marked server-only.

```
server/
├── db/
│   ├── admin.ts          # Service-role Supabase client (bypasses RLS) — server only
│   └── server-client.ts  # Request-scoped SSR client (user context, cookies)
├── auth.ts               # getUser(), requireUser() — server session helpers
├── ai/
│   ├── evaluate.ts       # analyzeVapiTranscript (from aiService)
│   ├── questions.ts      # generateInterviewQuestions
│   └── prompts/          # behavioral, technical, evaluation, followup, ml, rolePrompt
├── storage.ts            # saveInterview, getInterviews, getInterviewById (storageService)
├── analytics.ts          # buildDashboard, computeUserMetrics (analyticsService)
├── code-execution.ts     # executeJava/Cpp/Bash (codeExecutionService)
├── jobs/
│   ├── jobService.ts
│   ├── jobServiceBullmq.ts
│   └── worker.ts         # run as a separate process (pnpm worker)
├── cache.ts              # thin wrapper over Next.js unstable_cache + tags
└── metrics.ts            # systemMetrics (only if jobs/worker retained)
```

Top of secret-bearing files: `import "server-only";` to fail the build if imported into a client bundle.

**Why a folder, not co-located?** Business logic is shared by RSCs, Server Actions, Route Handlers, *and* the worker. A central `server/` keeps one implementation and one place to enforce the secret boundary.

---

## `actions/` — Server Actions

```
actions/
├── interview.ts   # evaluateInterview, generateQuestions (sync), saveSetupDraft
├── profile.ts     # updateRole
└── auth.ts        # (optional) signIn/signUp/signOut wrappers if not using client SDK
```

Each file starts with `"use server";`. Actions are thin: validate input, call `server/`, `revalidateTag`/`revalidatePath`, return typed result. See [11](./11-server-actions.md).

**Why separate from `server/`?** Server Actions are a public, callable surface (they generate endpoints). Keeping them distinct from internal `server/` logic clarifies the trust boundary and where input validation must happen.

---

## `components/` — reusable UI

```
components/
├── ui/                   # shadcn/radix primitives (Button, Card, Slider...)
├── dashboard-navbar.tsx  # Shared nav (server-renderable; client only if it needs interactivity)
├── charts/
│   └── score-trend.tsx   # "use client" Recharts island
├── interview/
│   ├── voice-interview-client.tsx       # "use client" — Vapi behavioral panel
│   ├── technical-interview-client.tsx   # "use client" — Monaco + voice + timer
│   ├── mic-visualizer.tsx               # "use client"
│   └── transcript-timeline.tsx          # server-renderable for replay
└── setup/
    └── setup-form.tsx    # "use client" — sliders + submit → Server Action
```

**Why split `interview/` and `charts/` out?** These are the client islands. Grouping them signals "this ships JS"; everything else stays server by default.

---

## `lib/` — thin clients & shared helpers

```
lib/
├── supabase/
│   └── client.ts     # browser Supabase client (anon key) — for client auth flows
├── vapi.ts           # Vapi singleton (browser) — behavior preserved from current lib/vapi.ts
├── utils.ts          # cn(), formatting, label helpers (difficulty/experience/strictness)
└── constants.ts      # interviewer roster, role topics (shared, no secrets)
```

**Why both `lib/supabase` and `server/db`?** Two legitimate clients: the **browser anon client** (`lib/`) for client-side auth UI, and the **server clients** (`server/db`) for privileged reads/writes. Never mix them.

---

## `hooks/`, `providers/`, `types/`, `data/`, `config/`, `styles/`

```
hooks/                 # client-only
├── use-vapi-interview.ts
├── use-vapi-technical-interview.ts
├── use-code-execution.ts
└── use-keyboard-shortcuts.ts

providers/             # client context
└── app-providers.tsx  # toasts/theme; wrap in root layout

types/                 # single source of truth
├── interview.ts       # VapiInterviewConfig, VapiAnalysisResult, TranscriptEntry, CodingProblem
└── db.ts              # Supabase row types

data/
└── technical-problems.ts   # local topic-filtered bank (unchanged)

config/
├── env.ts             # parse + validate env (server vs NEXT_PUBLIC) at startup
└── site.ts            # app name, URLs, metadata defaults

styles/
└── (tailwind theme tokens if extracted)
```

- **`hooks/`** — all hooks are client-only here (the SPA's `useVapi*`, `useCodeExecution`, `useKeyboardShortcuts` carry over almost verbatim into client islands).
- **`providers/`** — minimal; the app currently has no global store and the rebuild keeps it that way (server data + local state). Reserve for cross-cutting client concerns (toasts/theme) only.
- **`types/`** — kills the FE/BE type duplication.
- **`config/env.ts`** — replaces the current `backend/src/config.ts` `validateEnv()`; fails fast on missing secrets, and separates `NEXT_PUBLIC_*` from server-only.

---

## File naming

Next.js conventions differ from the current PascalCase component files:

| Thing | Current | Rebuild |
|---|---|---|
| Route files | n/a | lowercase reserved: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` |
| Component files | `VapiInterviewPanel.tsx` | `kebab-case.tsx` (`voice-interview-client.tsx`) — recommended for App Router consistency |
| Exports | named only | named only (unchanged) |
| Hooks | `useX.ts` | `use-x.ts` |

> If the team prefers to keep PascalCase component filenames, that's acceptable — but route segment files (`page`, `layout`, etc.) are fixed by the framework. This is an [open question](./17-open-questions.md).
