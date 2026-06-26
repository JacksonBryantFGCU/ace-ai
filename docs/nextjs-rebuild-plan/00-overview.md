# ACE.AI → Next.js 16 Rebuild — Plan Overview

> **Status:** Planning only. No code in the existing project has been or will be modified by this document set. This is the blueprint for a **greenfield rebuild** of ACE.AI on Next.js 16 (App Router), inspired by the existing Vite + Express implementation.

---

## What this document suite is

A senior-architect-level analysis of the current ACE.AI codebase and a complete, server-first rebuild plan targeting **Next.js 16**. It is written so that another senior engineer — or another AI — can build the new app from these documents **without re-reading the original source**.

Every recommendation is grounded in the actual current implementation (files were read, not assumed). Where the current code does something that should change, the document says so explicitly and explains why.

---

## The application in one paragraph

ACE.AI is a voice-driven engineering interview practice platform. A user logs in (Supabase Auth), picks a role/difficulty/interviewer, and runs a realistic mock interview spoken through their microphone via the **Vapi** WebRTC SDK. Two modes: **behavioral** (voice-only) and **technical** (voice + an in-browser Monaco code editor with a multi-language code runner). When the call ends, the transcript is sent to **OpenAI** for scoring; the result + transcript are persisted to **Supabase Postgres** and surfaced on an analytics dashboard with replay.

---

## Current vs. target stack

| Concern | Current | Target (Next.js 16 rebuild) |
|---|---|---|
| Frontend framework | React 19 + Vite 8 (SPA) | Next.js 16 App Router (RSC-first) |
| Routing | React Router v7, `createBrowserRouter`, client-only | App Router file-system routing, nested layouts |
| Backend | Separate Express 5 server (port 3001) | Co-located: Server Components, Server Actions, Route Handlers |
| Package manager | npm (two `package.json`s) | pnpm (single workspace or single app) |
| Language | TypeScript (FE 5.9, BE 6.x) | TypeScript 5.x |
| Styling | Tailwind CSS v4 | Tailwind CSS v4 (unchanged) |
| Auth | Supabase client SDK on FE, JWT verify on BE | Supabase SSR (`@supabase/ssr`) + middleware + server reads |
| DB access | Service-role client in Express | Server-only Supabase client in Server Components / Actions |
| AI | OpenAI SDK (backend only) | OpenAI SDK in Server Actions / Route Handlers (backend only) |
| Voice | `@vapi-ai/web` (browser) | Unchanged — stays a Client Component island |
| Code editor | `@monaco-editor/react` | Unchanged — Client Component island |
| Jobs/cache | In-memory → BullMQ/Redis | Preserved as Route Handlers + worker (see [11](./11-server-actions.md), [12](./12-api-migration.md)) |
| Data fetching | `useEffect` + `fetch` in components | Server Components + `async` data access; Actions for mutations |

---

## The single most important principle

**Do not port the SPA. Rethink it server-first.**

The current app fetches almost everything on the client inside `useEffect` (history, single interview, analytics dashboard). In the rebuild, **the default is a Server Component that reads data directly from Supabase on the server**. A Client Component is the exception, justified only by:

- A browser-only API (microphone, WebRTC, Web Audio, Monaco, Pyodide WASM), or
- Genuine client interactivity/state (live transcript, timers, sliders, mute toggles).

For **every** page and feature, the rebuild answers: *Can this render on the server? Does this truly need a Client Component? Should this be a Server Action? A Route Handler? Can it stream? Should it be cached?* See [06-server-vs-client.md](./06-server-vs-client.md).

---

## What stays the same (and why)

These are correct as-is and should be reused, not redesigned:

- **The OpenAI prompt builders and evaluation logic** (`aiService.ts`, `prompts/*`). Business logic; moves verbatim into `server/` modules.
- **The Vapi voice session model** — inline `CreateAssistantDTO` built client-side, system prompt + voice + transcriber. This *must* remain client-side (WebRTC + mic). Only the public key exposure changes nothing.
- **The Supabase schema** (`profiles`, `interviews`) and the `created_at → date` mapping convention.
- **Code execution model**: JS/TS in-browser, Python via Pyodide WASM in-browser, Java/C++/Bash via a server endpoint. Keep the split.
- **The role/difficulty/strictness/experience prompt-tuning system.**

---

## What changes structurally

1. **No standalone Express server.** Its routes become Server Actions (mutations tied to UI) or Route Handlers (machine/streaming/polling endpoints). See [12-api-migration.md](./12-api-migration.md).
2. **No client-side `useEffect` data fetching for initial page data.** History, replay, analytics, profile all become server reads. See [07-data-flow.md](./07-data-flow.md).
3. **Auth becomes server-aware** via `@supabase/ssr` + middleware so protected routes are enforced before render, not after a client spinner. See [08-authentication.md](./08-authentication.md).
4. **Config no longer flows only through `location.state`.** Router state is lost on refresh and invisible to the server. Replaced with a hybrid of server-persisted setup + URL/searchParams for the interview entry. See [05-routing-plan.md](./05-routing-plan.md) and [17-open-questions.md](./17-open-questions.md).

---

## How to read this suite

| # | File | Purpose |
|---|---|---|
| 00 | [overview](./00-overview.md) | This document |
| 01 | [current-project-analysis](./01-current-project-analysis.md) | Architecture, strengths, weaknesses, tech debt |
| 02 | [feature-inventory](./02-feature-inventory.md) | Every feature: purpose, impl, target, complexity, priority |
| 03 | [nextjs-architecture](./03-nextjs-architecture.md) | The target architecture and its principles |
| 04 | [folder-structure](./04-folder-structure.md) | Complete App Router folder layout + rationale |
| 05 | [routing-plan](./05-routing-plan.md) | Every route, layout, route group, public/private |
| 06 | [server-vs-client](./06-server-vs-client.md) | Per-page Server/Client/Hybrid decision matrix |
| 07 | [data-flow](./07-data-flow.md) | New data architecture end to end |
| 08 | [authentication](./08-authentication.md) | Server-side auth, middleware, protected layouts |
| 09 | [caching](./09-caching.md) | Full caching + revalidation strategy |
| 10 | [streaming-loading](./10-streaming-loading.md) | Suspense, streaming, `loading.tsx`, error boundaries |
| 11 | [server-actions](./11-server-actions.md) | What becomes a Server Action and how |
| 12 | [api-migration](./12-api-migration.md) | Endpoint-by-endpoint migration table |
| 13 | [database](./13-database.md) | Where DB access lives; schema; RLS |
| 14 | [seo-metadata](./14-seo-metadata.md) | Metadata, OG, sitemap, robots |
| 15 | [performance](./15-performance.md) | Performance opportunities |
| 16 | [rebuild-roadmap](./16-rebuild-roadmap.md) | Phased plan, ordering, dependencies, risk |
| 17 | [open-questions](./17-open-questions.md) | Decisions to make before building |

> Note: sections from the brief that don't warrant a standalone file (Layout Architecture §5, Loading UI §13, Error Handling §14, Accessibility §17, Risks §19) are folded into the most relevant document and cross-linked — Layout/Error/Loading live in [10-streaming-loading.md](./10-streaming-loading.md) and [05-routing-plan.md](./05-routing-plan.md); Accessibility and Risks are sections within [15-performance.md](./15-performance.md) and [16-rebuild-roadmap.md](./16-rebuild-roadmap.md) respectively.
