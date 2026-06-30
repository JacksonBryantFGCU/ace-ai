# ACE.AI → Architecture C + Subscriptions

The accompanying ACE.AI Marketing Site.html is the source of truth for the visual marketing experience.

It is not production code.

Recreate the layouts using:

Next.js App Router
Existing Tailwind design tokens
Existing UI component library
Existing folder structure
Existing routing architecture
Server Components by default
Client Components only where interactivity requires them

Do not embed or adapt the HTML directly.

A handoff brief for Claude Code. Converts the app to an **auth-aware Hybrid** with a **free tier (1 interview, account required)** and a **$20/mo Pro tier**. Written against the real codebase: Next.js 16 (Proxy), Supabase SSR auth, **Supabase client only — no ORM**, route groups `(app)` / `(auth)` / `(interview)`.

---

## 0. The model (decisions, so Claude Code doesn't guess)

- **Architecture C.** Public marketing at `/` for anonymous visitors; authenticated users hitting `/` are sent straight to `/dashboard`. Marketing pages exist for acquisition; paying users never see them again after login.
- **No anonymous interviews.** An account is required *before* the free interview, so usage is tracked per user. This is already how the app works (everything is behind `requireUser()`), so the gate is on **interview count**, not on anonymous access.
- **Free tier:** 1 completed interview, lifetime, per account.
- **Pro tier:** $20/mo via Stripe → unlimited (or a high cap) interviews + room for advanced features later (gated by a single `plan` check).
- **The entitlement gate is server-side and lives in one place** — the action that starts an interview. Never trusted to the client.

---

## 1. Split the root into marketing vs. app  *(the core of Architecture C)*

Today `/` is the authenticated hero (`app/(app)/page.tsx`) gated by `(app)/layout.tsx`. That's the Home/Dashboard redundancy. Fix it:

1. **Create a `(marketing)` route group** with its own public layout (marketing navbar + footer, no `requireUser()`):
   - `app/(marketing)/page.tsx` — the landing page. Move the existing hero copy/markup out of `app/(app)/page.tsx` into here. Keep the visual style; just relocate it.
   - `app/(marketing)/features/page.tsx`
   - `app/(marketing)/pricing/page.tsx` — Free vs. Pro ($20/mo), CTA → `/signup`.
   - (optional, good for SEO) `app/(marketing)/roles/page.tsx` — public, indexable "X interview prep" pages. Distinct from the in-app role picker.
2. **Delete the in-app Home.** Remove `app/(app)/page.tsx`. The dashboard becomes the only authenticated hub.
3. **Make `/` auth-aware** in `lib/auth-redirects.ts` (the single source of redirect policy, applied by `proxy.ts`):
   - `/` must stay **public** (it is — `PROTECTED_PREFIXES` doesn't include it). 
   - Add a rule in `resolveAuthRedirect`: if `pathname === "/" && isAuthed` → return `/dashboard`.
   - **Change `safeNext`'s default fallback from `/` to `/dashboard`.** This is the single most important change — it makes the post-login landing the dashboard, not the marketing home.
   - Update `redirectIfAuthenticated(to = "/")` in `server/auth.ts` → default `to = "/dashboard"` so login/signup bounce authed users into the app, not marketing.
4. **SEO:** add the marketing routes to `app/sitemap.ts`; confirm `app/robots.ts` allows them and disallows `(app)`/`(interview)`.

**Acceptance:** anon visits `/` → marketing. Logged-in user visits `/` → dashboard. Login with no `next` → dashboard. No more `/` hero behind auth.

---

## 2. Subscription data model  *(Supabase, no ORM)*

Add to the **`profiles`** table (DDL for the Supabase SQL editor — match the style in `docs/setup/supabase.md`):

```sql
alter table profiles
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists plan                     text  not null default 'free',   -- 'free' | 'pro'
  add column if not exists subscription_status      text  not null default 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
  add column if not exists current_period_end       timestamptz;
```

- **Usage count = number of the user's `interviews` rows.** No new counter needed — the free gate is `count(interviews where user_id = me) < 1`. (Add a `free_interview_used boolean` only if you prefer an explicit flag.)
- Update the hand-written **`types/db.ts`** to include the new `profiles` columns.
- RLS: a user may read their own subscription fields; only the **service-role** client (webhook) may write them.

---

## 3. Stripe integration

- Install `stripe`. Add env accessors:
  - `config/env.server.ts`: `getStripeSecretKey()` → `STRIPE_SECRET_KEY`, `getStripeWebhookSecret()` → `STRIPE_WEBHOOK_SECRET`, plus `STRIPE_PRICE_PRO_MONTHLY` (the $20/mo Price ID).
  - `config/env.public.ts`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- **`actions/billing.ts`** (server actions, all start with `await requireUser()`):
  - `createCheckoutSession()` — find-or-create the Stripe customer (store `stripe_customer_id` on the profile via the admin client), create a subscription Checkout Session for `STRIPE_PRICE_PRO_MONTHLY`, return the URL. Success/cancel URLs → `/dashboard?checkout=success` / `/pricing`.
  - `createBillingPortalSession()` — Stripe Billing Portal URL for managing/canceling.
- **`app/api/stripe/webhook/route.ts`** (Route Handler):
  - Verify the signature with `STRIPE_WEBHOOK_SECRET`.
  - Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
  - Write `plan` / `subscription_status` / `current_period_end` / `stripe_subscription_id` to `profiles` using the **service-role admin client** (`server/db/admin.ts`) — it bypasses RLS. Match the user by `stripe_customer_id`.
  - This route must read the **raw request body** (don't let a parser touch it before signature verification).
- **`server/billing.ts`**: `getSubscription(userId)` → `{ plan, status, currentPeriodEnd }`, reading the profile.

---

## 4. The entitlement gate  *(free vs. paid — the heart of it)*

- **`server/entitlements.ts`**: `canStartInterview(userId)` →
  - `plan === 'pro' && status === 'active'` → allowed (unlimited or a high cap).
  - else (free) → allowed only if `count(interviews for user) < 1`.
  - returns `{ allowed: boolean, reason: 'ok' | 'free_used' | 'past_due' }`.
- **Enforce it in `actions/interview.ts` → `saveSetupDraft()`** — this is the single server choke point that commits the config and redirects into the interview. Right after `await requireUser()`, call `canStartInterview(user.id)`; if not allowed, return `{ ok: false, error: 'upgrade' }` (or redirect to `/pricing`) instead of saving the draft. **Do not** gate only in the UI.
- **UI reflection:** on the New-interview / setup screen, show "1 free interview" when on free with 0 used; once used, replace the Start button with an **Upgrade to Pro** CTA → `createCheckoutSession()`. Optionally surface remaining-free state on the dashboard.

**Acceptance:** a free user can finish exactly one interview; the second attempt is blocked server-side and routed to upgrade. A Pro user is unaffected. Toggling `plan`/`status` in the DB changes behavior immediately.

---

## 5. Navigation & IA cleanup  *(the rest of Architecture C)*

- **Marketing navbar (anon):** Features · Pricing · Log in · **Sign up**.
- **App navbar** (`components/dashboard-navbar.tsx`): drop the **Home** tab. Keep **Dashboard · Interviews · Progress** (rename Analytics → Progress) + a persistent **+ New interview** + avatar menu containing **Billing** and **Profile/Settings**.
- **Merge Roles → Setup into one "New interview" flow.** Today it's a forced two-hop (`/roles` → `/setup?role=`). Make role selection **step 1 of the setup screen** (one route, e.g. `/new`), so starting an interview is one destination, not two. Keep public `(marketing)/roles` separate as SEO.
- **Add `/settings/billing`** → button to `createBillingPortalSession()`; show current plan + renewal date.
- Keep the standalone Analytics page only as the "Progress" tab; put a small stats summary on the dashboard so they aren't two homes for the same numbers.

---

## 6. Account-first free interview

Already the natural model (everything's behind auth). Just ensure the funnel reads cleanly:

- Landing / pricing CTA = **"Start free"** → `/signup` (not an anonymous interview).
- After signup (+ email confirmation if enabled — see `docs/.../17-open-questions.md`) → land on `/dashboard` with **"Start your free interview"** as the primary action.
- The free counter is tied to the user id, so it survives logout and can't be reset by clearing the browser.

---

## Env vars to add

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Stripe dashboard checklist (you, manually)

1. Create a **Product "ACE.AI Pro"** with a **$20/mo recurring Price**; copy the Price ID → `STRIPE_PRICE_PRO_MONTHLY`.
2. Add a webhook endpoint → `https://<your-domain>/api/stripe/webhook`; subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
3. Enable the **Billing Portal** in Stripe settings.
4. Test locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Test checklist

- [ ] Anon `/` → marketing; authed `/` → dashboard; login (no `next`) → dashboard.
- [ ] New signup → dashboard → can complete **one** free interview.
- [ ] Second free interview is blocked **server-side** (not just hidden) → upgrade CTA.
- [ ] Checkout → webhook flips `plan='pro'`, `status='active'` → interviews unblocked.
- [ ] Cancel via portal → webhook flips status → free gate returns.
- [ ] `past_due` (failed payment) blocks new interviews.
- [ ] No "Home" tab anywhere in the authed app; marketing pages in sitemap, app pages disallowed in robots.

---

## Paste-ready kickoff prompt for Claude Code

> We're converting ACE.AI to an **auth-aware Hybrid (Architecture C)** with a **free tier (1 interview, account required) and a $20/mo Pro tier via Stripe**. Stack: Next.js 16 Proxy, Supabase SSR auth, **Supabase client only (no ORM)**, route groups `(app)`/`(auth)`/`(interview)`. Redirect policy is centralized in `lib/auth-redirects.ts` and applied by `proxy.ts`; auth helpers are in `server/auth.ts`; the privileged client is `server/db/admin.ts`.
>
> Work in this order and stop after each phase for review:
> 1. **Architecture C routing.** Create a public `(marketing)` route group (landing/features/pricing); move the hero out of `app/(app)/page.tsx` and delete that file. Make `/` auth-aware (anon→marketing, authed→`/dashboard`) by editing `lib/auth-redirects.ts`: add a `/`→`/dashboard` rule for authed users and change `safeNext`'s fallback to `/dashboard`; update `redirectIfAuthenticated` default to `/dashboard`. Update sitemap/robots.
> 2. **Data model.** Add `plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end` to `profiles` (give me the SQL); update `types/db.ts`. Free usage = count of the user's `interviews` rows.
> 3. **Stripe.** Add env accessors, `actions/billing.ts` (checkout + portal), and `app/api/stripe/webhook/route.ts` writing subscription state via the service-role admin client.
> 4. **Entitlement gate.** Add `server/entitlements.ts#canStartInterview` and enforce it at the top of `saveSetupDraft` in `actions/interview.ts`; reflect remaining-free state and an upgrade CTA in the setup UI.
> 5. **IA cleanup.** Remove the Home tab in `components/dashboard-navbar.tsx`; merge `/roles`+`/setup` into one "New interview" flow; add `/settings/billing`.
>
> Don't change the visual design system, and don't touch the Vapi/OpenAI interview logic beyond adding the gate. Confirm the plan before writing code.
