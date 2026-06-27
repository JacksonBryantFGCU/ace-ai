# Phase 1 · Milestone 2 — Full authentication flow

> Status: **complete** — shipped as part of stable tag `v0.1.0-auth-stable`.
> `typecheck`, `lint`, and `build` green.
> Builds on M1 (SSR clients, proxy session refresh, `getUser`/`getSession`/`requireUser`).
> External Supabase configuration required to run is documented in
> [`docs/setup/supabase.md`](../setup/supabase.md).

---

## 1. What was implemented

**Auth surface**
- Email/password **login**, **signup** (with email confirmation), **logout**.
- **Forgot password** + **reset password** (recovery via email link).
- **Google OAuth**.
- `?next=` redirect preservation through the entire flow, via a single `safeNext()`.

**Server actions** (`actions/auth.ts`, `"use server"`): `signIn`, `signUp`, `signOut`,
`requestPasswordReset`, `updatePassword`, `signInWithGoogle`. Each validates with Zod
before calling Supabase.

**Route handlers** (public): `app/auth/callback/route.ts` (OAuth `exchangeCodeForSession`)
and `app/auth/confirm/route.ts` (`verifyOtp` for signup confirmation **and** recovery).

**Validation**: `lib/validation/auth.ts` — Zod schemas (`signIn`, `signUp`, `forgotPassword`,
`resetPassword`) used by the actions (the security boundary, since actions are reachable
by direct POST).

**Authorization policy**: `lib/auth-redirects.ts` — pure `isProtectedPath`,
`isAnonOnlyAuthPath`, `resolveAuthRedirect`, and the single `safeNext()`.

**Protection**:
- `proxy.ts` now applies `resolveAuthRedirect` (anonymous→`/login?next=`, authed-on-auth-page→`/dashboard`)
  as a step **separate** from session refresh.
- `(app)/layout.tsx` and `(interview)/layout.tsx` call `requireUser()` (server-side enforcement).
- `server/auth.ts` gained `redirectIfAuthenticated()` for the auth pages.

**UI** (consistent with the Phase 0 visual system — shadcn neutral tokens, `Card`, `Button`):
auth pages are server shells (`Card` + heading) rendering small client form islands
(`components/auth/*`) that use `useActionState` + `useFormStatus`. Logout is a
server-rendered `<form action={signOut}>` in the navbar.

---

## 2. Why every auth page follows Server-First

Each auth page is a **Server Component shell** that:
- resolves auth state on the server (`redirectIfAuthenticated()` / `getUser()`), and
- renders static heading markup server-side, handing only the interactive `<form>` to a
  small client island.

Mutations run as **Server Actions** (server-only, cookie-setting), not client SDK calls.
There is no client session cache and no `useEffect` auth check. Identity is always
established and read on the server; the client ships only input state + pending UI.

| Page | Server shell does | Client island |
|---|---|---|
| `/login` | `redirectIfAuthenticated`, read `next`/`error` | `LoginForm` |
| `/signup` | `redirectIfAuthenticated`, read `next` | `SignupForm` |
| `/forgot-password` | `redirectIfAuthenticated` | `ForgotPasswordForm` |
| `/reset-password` | require a (recovery) session or redirect | `ResetPasswordForm` |
| `/verify-email` | `redirectIfAuthenticated`, read `email` | — (static) |

---

## 3. How the flow fits together

```
signup ──Server Action signUp──▶ Supabase (emailRedirectTo /auth/confirm?next=…)
   └─▶ redirect /verify-email                    │
                                                 ▼
email link ─▶ GET /auth/confirm (verifyOtp, sets cookies) ─▶ redirect next

login ──Server Action signIn──▶ Supabase signInWithPassword (sets cookies)
   └─▶ redirect safeNext(next)

google ──Server Action signInWithGoogle──▶ redirect to Google
   └─▶ GET /auth/callback (exchangeCodeForSession, sets cookies) ─▶ redirect next

forgot ──requestPasswordReset──▶ email link ─▶ /auth/confirm (type=recovery) ─▶ /reset-password
   └─▶ updatePassword (updateUser) ─▶ /dashboard

every request ─▶ proxy.ts: (1) refresh session, (2) resolveAuthRedirect
protected layouts ─▶ requireUser() (enforcement)
```

`?next=` is threaded: proxy emits `/login?next=<path>` → page forwards it as a hidden
field → action calls `safeNext(next)`. OAuth/confirm carry `next` in the callback URL.
**`safeNext()` is the only place** the open-redirect rule lives.

---

## 4. Architectural decisions / tradeoffs

| # | Decision | Notes / divergence |
|---|---|---|
| D1 | **Zod adopted now** for all auth inputs | The roadmap slated Zod for Phase 3; pulled forward per request because auth input is a security boundary. |
| D2 | **All flows via Server Actions**, not the browser client | The M1 `lib/supabase/client.ts` stays unused this milestone — kept for future client-reactive needs. Maximally server-first. |
| D3 | **Single `safeNext()`** consumed by proxy, actions, and route handlers | One open-redirect rule, no duplication. |
| D4 | **Two-layer protection** | Proxy = optimistic redirect; layouts = real `requireUser()` enforcement. Authorization policy (`lib/auth-redirects.ts`) is pure and separate from refresh mechanics. |
| D5 | **`/reset-password` is excluded from the anon-only redirect** | It needs a recovery session, so the "authed → dashboard" rule must not apply. |
| D6 | **Auth pages are now dynamic (`ƒ`)**, not static | Doc 06 imagined a static shell; server-side `redirectIfAuthenticated()` makes them dynamic. Intentional: a server gate with no auth flash beats a static page. |
| D7 | **Profile creation by DB trigger; RLS as authz** | Per direction. No admin client this milestone, so `config/env.server.ts` is unchanged and the service-role key stays unused. |
| D8 | **`?next=` added by the proxy, not the layouts** | `requireUser()` redirects to a plain `/login`; layouts don't reliably know the pathname. Proxy owns the `?next=`. |

---

## 5. Manual testing

**Prerequisite:** complete [`docs/setup/supabase.md`](../setup/supabase.md) and fill
`.env.local`. Then `pnpm dev`.

### Signup + email confirmation
1. Visit `/signup`, enter an email + password (≥8 chars), submit.
2. Expect redirect to `/verify-email` showing your email.
3. Open the confirmation email, click the link → expect to land authenticated on `/dashboard`.

### Login / logout
4. Visit `/login`, sign in with the confirmed account → `/dashboard`.
5. Confirm your email shows in the navbar; click **Log out** → `/login`.

### Protected routes + `?next=`
6. While logged out, visit `/dashboard` directly → redirected to `/login?next=%2Fdashboard`.
7. Log in → expect to land back on `/dashboard` (not the default).
8. While logged in, visit `/login` → redirected to `/dashboard`.

### Google OAuth
9. From `/login`, click **Continue with Google** → Google consent → back to `/dashboard`.

### Password reset
10. Visit `/forgot-password`, submit your email → success message.
11. Open the reset email, click the link → land on `/reset-password`.
12. Set a new password (twice, matching) → `/dashboard`.
13. Log out and log in with the **new** password.

### Validation
14. Submit login/signup with a bad email or short password → inline error, no navigation.
15. On reset, enter mismatched passwords → "Passwords do not match."

### Session persistence
16. After login, refresh the page and open a new tab on `/dashboard` → still authenticated
    (cookie session, no flash).

---

## 6. Verification checklist

- [ ] **Login** — valid creds reach `/dashboard`; invalid creds show an inline error.
- [ ] **Logout** — clears session; `/dashboard` then redirects to `/login`.
- [ ] **OAuth** — Google round-trip ends authenticated on `/dashboard`.
- [ ] **Signup** — unconfirmed account lands on `/verify-email`; confirmation link authenticates.
- [ ] **Password reset** — email link → `/reset-password` → new password works; old one fails.
- [ ] **Protected routes** — logged-out access to `(app)`/`(interview)` redirects to `/login?next=…`.
- [ ] **Redirect behavior** — `next` is honored after login and ignored when unsafe (defaults to `/dashboard`).
- [ ] **Anon-only pages** — logged-in users are bounced from `/login`,`/signup`,`/forgot-password`,`/verify-email` (but **not** `/reset-password`).
- [ ] **Session persistence** — survives refresh and new tabs; no auth flash.
- [ ] **Validation** — Zod errors surface inline; no server action proceeds on invalid input.

---

## 7. Files

**Created:** `actions/auth.ts`, `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`,
`app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`,
`app/(auth)/verify-email/page.tsx`, `lib/auth-redirects.ts`, `lib/validation/auth.ts`,
`components/auth/{login-form,signup-form,forgot-password-form,reset-password-form,submit-button,google-auth-button}.tsx`,
`components/ui/{input,label,card}.tsx`, `docs/setup/supabase.md`.

**Modified:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`,
`app/(app)/layout.tsx`, `app/(interview)/layout.tsx`, `components/dashboard-navbar.tsx`,
`proxy.ts`, `server/auth.ts`, `package.json` (zod + form primitives).

---

## 8. Open items for later

- `lib/supabase/client.ts` is unused this milestone; revisit if a client-reactive auth
  surface is needed (e.g. `onAuthStateChange`).
- Admin (service-role) client + `config/env.server.ts` secret accessor remain deferred to
  the first privileged DB write.
- `?next=` is not preserved by `requireUser()` itself (proxy owns it); revisit if deep
  links must survive a layout-level redirect without the proxy.
