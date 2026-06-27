# Phase 1 — Authentication (summary)

> Status: **complete and stable**. Committed and tagged `v0.1.0-auth-stable`.
> `typecheck`, `lint`, and `build` all green.

Phase 1 brings the rebuilt ACE.AI from a static foundation (Phase 0) to a fully
functional, server-first authentication system on Supabase SSR. It was delivered in
two approval-gated milestones; the detailed write-ups live alongside this file:

- [`phase-1-milestone-1.md`](./phase-1-milestone-1.md) — SSR clients, proxy session
  refresh, and the `getUser`/`getSession`/`requireUser` server utilities (plus the
  environment-config refactor that preceded it).
- [`phase-1-milestone-2.md`](./phase-1-milestone-2.md) — the full auth flow: login,
  signup + email confirmation, logout, forgot/reset password, Google OAuth, route-group
  protection, and `?next=` preservation.

External Supabase configuration required to run the app is documented in
[`../setup/supabase.md`](../setup/supabase.md).

---

## What "stable authentication" means here

The auth layer is feature-complete for the app's needs and verified end-to-end at the
build level. This is the baseline every later phase builds on, so it is tagged as a
stable checkpoint.

**Capabilities**
- Email/password **login**, **signup** (email confirmation required), **logout**.
- **Forgot password** + **reset password** via recovery email.
- **Google OAuth**.
- `?next=` redirect preservation through every entry point, via one `safeNext()`.

**Architecture (server-first)**
- Identity is always established and read on the **server** — no client session cache,
  no `useEffect` auth checks.
- All mutations run as **Server Actions** (`actions/auth.ts`), validated with **Zod**
  (`lib/validation/auth.ts`) — the security boundary, since actions accept direct POSTs.
- **Two-layer protection**: `proxy.ts` does an optimistic redirect (separate from session
  refresh) and the `(app)`/`(interview)` layouts enforce with `requireUser()`.
- **RLS is the authorization model**; profile creation is delegated to a database trigger
  (`handle_new_user`), so the app performs no privileged writes and the service-role key
  stays unused this phase.

---

## Key components

| Area | Files |
|---|---|
| Env (split public/server) | `config/env.public.ts`, `config/env.server.ts` |
| Supabase clients | `lib/supabase/client.ts`, `server/db/server-client.ts` |
| Server auth utilities | `server/auth.ts` |
| Server actions | `actions/auth.ts` |
| Validation | `lib/validation/auth.ts` |
| Redirect / authz policy | `lib/auth-redirects.ts` (single `safeNext()`) |
| Route handlers | `app/auth/callback/route.ts`, `app/auth/confirm/route.ts` |
| Auth pages | `app/(auth)/{login,signup,forgot-password,reset-password,verify-email}` |
| Form islands | `components/auth/*` |
| Protection | `proxy.ts`, `app/(app)/layout.tsx`, `app/(interview)/layout.tsx` |

---

## Verification at tag time

- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm build` — green (auth pages dynamic, `ƒ Proxy (Middleware)`)
- Manual test script + verification checklist: see
  [`phase-1-milestone-2.md`](./phase-1-milestone-2.md) §5–6. Running the manual flow
  requires the Supabase project configured per [`../setup/supabase.md`](../setup/supabase.md).

---

## Next

**Phase 2 — server-rendered data read pages.** Planned and approval-gated as usual:
architecture + file list first, then implementation. The admin/service-role client
remains deferred until the first privileged DB write.
