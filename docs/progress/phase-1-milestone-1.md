# Phase 1 · Milestone 1 — Auth foundations (SSR clients, session refresh, server auth utilities)

> Status: **complete**. Builds, lints, and typechecks green with no `.env` present.
> Scope intentionally excludes login/signup, OAuth, profile creation, protected-page
> wiring, and the admin (service-role) client — those are Milestone 2+.

This milestone also folded in the Phase 0 review fixes for environment configuration,
since the auth layer is the first real consumer of env and secrets.

---

## 1. What was implemented

### Environment configuration refactor (Phase 0 review fixes)
- **`config/env.public.ts`** — the single source of truth for `NEXT_PUBLIC_*` values
  (`siteUrl`, `supabaseUrl`, `supabaseAnonKey`) plus `getSupabasePublicConfig()`, which
  returns the Supabase URL + anon key and throws a clear error if either is missing.
- **`config/env.server.ts`** — begins with `import "server-only"`; exposes
  `requireServerEnv` / `optionalServerEnv`. No secrets live here yet (the service-role
  accessor lands in M2), but the server-only boundary now exists.
- **`config/env.ts` deleted** — replaced by the two split modules (it had no real importers).
- **`config/site.ts`** now reads `publicEnv.siteUrl` instead of `process.env` directly,
  removing the duplicate env read flagged in the Phase 0 review.

### Authentication Milestone 1
- **`lib/supabase/client.ts`** — browser anon client (`createBrowserClient`). For
  client-side auth UI in later milestones. Reads `getSupabasePublicConfig()`.
- **`server/db/server-client.ts`** — request-scoped, cookie-bound server client
  (`createServerClient`). `import "server-only"`; `async` because `cookies()` is async
  in Next 16. Respects RLS.
- **`server/auth.ts`** — three focused, single-responsibility helpers:
  - `getUser()` → revalidated user (safe for authorization), or `null`.
  - `getSession()` → raw cookie session **without** revalidation (cheap; token/presence only).
  - `requireUser()` → user or `redirect('/login')`.
- **`proxy.ts`** (project root) — Next 16 Proxy. Refreshes the Supabase session on every
  matched request and writes refreshed cookies onto the response. Refresh-only; no gating.
- **`.env.example`** committed (with `!.env.example` added to `.gitignore`);
  `@supabase/ssr` + `@supabase/supabase-js` installed.

---

## 2. Why this follows the Server-First architecture

- **The session lives in httpOnly cookies, resolved on the server.** There is no client
  session cache, no `localStorage`, and no `useEffect`-then-spinner auth check. `getUser()`
  runs during server render/Actions, so auth state is known *before* UI is produced.
- **Secrets and privileged surfaces stay server-side by construction.** `server/auth.ts`
  and `server/db/server-client.ts` are poisoned with `import "server-only"`; the future
  service-role key has a `server-only` home (`config/env.server.ts`). Only `NEXT_PUBLIC_*`
  values can reach the browser, and they flow through one module (`config/env.public.ts`).
- **The client boundary is minimal.** The only browser-facing piece is the anon client
  factory (`lib/supabase/client.ts`), used by client auth forms later. Everything that
  decides identity is server code.
- **Proxy does the cheap thing only.** Per the Next 16 Proxy guidance, it refreshes cookies
  and nothing else — no DB queries, no authorization. Ownership/authorization remains in
  Server Components and Actions via owner-scoped queries (M2+).

---

## 3. How the pieces interact

```
                 ┌────────────────────────── every matched request ──────────────────────────┐
Browser ──cookies──▶ proxy.ts
                     │  createServerClient(req/res cookies) → auth.getUser()
                     │  (refreshes token, writes refreshed cookies to the response)
                     └──▶ continues to the route with a fresh session cookie
                                  │
                                  ▼
                     Server Component / Server Action
                          │  server/auth.ts  getUser() / getSession() / requireUser()
                          │        └── server/db/server-client.ts (createClient, per request)
                          │                  └── await cookies()  +  getSupabasePublicConfig()
                          ▼
                     renders with user-scoped data (passed to client islands as props)

Client auth UI (later) ── lib/supabase/client.ts (anon) ──▶ Supabase Auth
```

Flow of responsibility:
1. **`proxy.ts`** keeps the cookie session fresh so that, by the time a route renders, the
   server can trust it. It writes cookies onto the *response* (the one place mid-request
   cookie writes are valid).
2. **`server/db/server-client.ts`** is the per-request bridge to Supabase, bound to the
   request's cookies. Its `setAll` is wrapped in try/catch because a Server Component cannot
   write cookies during render — that write is the proxy's job, so the no-op is correct.
3. **`server/auth.ts`** is the only thing the rest of the app calls. It depends on the
   server client and exposes a tiny, composable surface (no classes, no shared state).

---

## 4. Architectural decisions — including divergences from the rebuild docs

| # | Decision | Divergence from docs | Rationale |
|---|---|---|---|
| D1 | **`proxy.ts` + `proxy()`**, not `middleware.ts` | Doc 08 §3 shows `middleware.ts` | Next.js 16 renamed Middleware to **Proxy** (`node_modules/next/dist/docs/.../16-proxy.md`). Same functionality, new convention. AGENTS.md mandates following the installed version. |
| D2 | **Env split** into `env.public.ts` / `env.server.ts` | Doc 04 lists a single `config/env.ts` | Phase 0 review found a weak secret boundary and a duplicate env read. `import "server-only"` is a build-time guarantee; one public module removes drift. |
| D3 | **`getSession()` added** beside `getUser()`/`requireUser()` | Docs list only `getUser`/`requireUser` | Requested for this milestone. Kept single-responsibility: `getSession()` is the cheap, non-revalidating read; `getUser()` is the trusted one. |
| D4 | **Proxy is refresh-only**; route gating deferred | Doc 08 §3 puts a coarse redirect gate in middleware | The gate guards protected pages, which are M2. Shipping the gate with the pages it protects keeps them testable as a unit and keeps M1 within its stated scope. |
| D5 | **Admin (service-role) client deferred to M2** | Doc 08 §2 / Doc 13 list it among the clients | Not an "SSR client" and not needed for refresh or `getUser`. Building it now would mean an unused service-role client. It lands with the first privileged write. |
| D6 | **Lazy env validation** at client construction | Doc 04 implies startup `validateEnv()` | Lets `next build`/CI pass with no `.env` (static pages never construct a client) while still failing fast with a clear message at first real use. Startup validation can be revisited when secrets are required. |
| D7 | **`server-only` on server modules** | Not explicit in doc 08 | Doc 04 recommends it for secret-bearing files; applied to `server/auth.ts` and `server/db/server-client.ts` as defense in depth. |

No tradeoff here is irreversible; each is a sequencing or boundary choice that the later
milestones consume directly.

---

## 5. Questions to answer before Authentication Milestone 2

1. **Profile creation strategy** (doc 17 D1 / doc 13 §6): DB trigger on `auth.users` insert
   (recommended — no client/server write) vs a `signUp` Server Action via the admin client?
   This decides whether M2 even needs the admin client for signup.
2. **RLS policies** (doc 13 §5): confirm `select/insert/update` policies exist where
   `auth.uid() = user_id` / `auth.uid() = id`. The server client reads under RLS, so reads
   silently return empty if policies are missing.
3. **Reads: admin + manual scoping vs RLS + server client** (doc 17 D2): the docs recommend
   admin client + explicit `.eq('user_id', …)` for parity. Confirm so M2 picks one path.
4. **Email confirmation** (doc 17 D3): is signup gated on email verification? If so, the auth
   UI must handle the "unconfirmed" state.
5. **Gating placement & redirect targets**: confirm M2 should add (a) the coarse redirect in
   `proxy.ts` (anonymous → `/login`, authed-on-auth-page → `/dashboard`) **and** (b)
   `requireUser()` in the `(app)` / `(interview)` layouts (defense in depth, per doc 05 §3).
6. **Login route contract**: `requireUser()` currently redirects to `/login`. Confirm that
   path and whether a `?next=` return-URL should be preserved through the redirect.

---

## 6. Verification

- `pnpm typecheck` — clean.
- `pnpm lint` — clean.
- `pnpm build` — green with **no** `.env`; build output lists `ƒ Proxy (Middleware)`,
  confirming `proxy.ts` is recognized.
- Runtime note: exercising an actual session requires real Supabase keys in `.env.local`
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
