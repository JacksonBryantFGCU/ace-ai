# Phase 7 — Marketing Site + Architecture C

> Converting ACE.AI to Architecture C: a public marketing site for anonymous
> visitors and the authenticated app for signed-in users. **This phase is
> marketing + routing only** — no subscriptions/Stripe/billing/entitlements
> (separate future phase).

## Implementation order (approved)
- **7A — Full marketing site, current routing untouched.** All reusable section
  components + data-driven content; landing + `/pricing` + `/faq` rendered at
  **temporary** public preview URLs (`/marketing`, `/marketing/pricing`,
  `/marketing/faq`, marked `noindex`) so the site can be reviewed before any
  routing/auth change. The components/content are final; only the temp route
  wrappers move in 7B.
- **7B — Architecture C routing.** Move marketing into a `(marketing)` group at
  `/`, `/pricing`, `/faq`; delete the in-app hero (`app/(app)/page.tsx`); revert
  the login→home change so authed users land on `/dashboard` and authed `/` →
  `/dashboard`; update `sitemap.ts`/`robots.ts`.
- **7C — App navbar.** Dashboard · New Interview · Interviews · **Progress**
  (label only; route stays `/analytics`) · Profile. Drop Home + Practice tabs.
- **7D — `/new` wizard.** Role → Setup → Interview as one route; convert `/roles`
  and `/setup` into **redirects** to `/new` (removed later in cleanup).
- **7E — Polish, accessibility, SEO, verification.**

## Architecture decisions
- **Server-First.** Every marketing section is its own Server Component; the page
  files only compose them. The only interactivity (mobile menu, FAQ accordion)
  uses native `<details>`/CSS — **no client components in the marketing site**.
- **Props-driven, content-separated.** Copy lives in `lib/marketing/content.ts`
  and `lib/marketing/faq.ts`; components accept props so content can change
  without touching markup.
- **Honest pricing.** Only Free (1 interview) and Pro ($20/mo, unlimited) with
  real features. No Enterprise/Teams/annual/invented functionality. CTAs →
  `/signup` (checkout is a later phase).
- **Reuse:** `HeroDemoCard`, `BrandLogo`, `Button`, `.glass-card`,
  `.surface-hero`, `ROLE_META`, `lib/format`.
- **Marketing header and app navbar never render together** (separate layouts).

## Milestones
- [x] 7A — Full marketing site at temporary `/marketing/*` preview routes (typecheck/lint/test/build ✓)
- [x] 7B — Architecture C routing + auth redirect revert (delivered together with 7C/7D below)
- [x] 7C — App navbar (Dashboard · New Interview · Interviews · Progress · Profile)
- [x] 7D — `/new` consolidated flow + `/roles`,`/setup` redirects
- [ ] 7E — Polish / a11y / SEO / verification

## 7B delivery notes (approved scope: routing + navbar + `/new` + dashboard UX)
Verified with build · typecheck · lint · 45 tests · anonymous runtime smoke test.

**Marketing → root.** Moved `app/marketing/*` into the `app/(marketing)/` group
serving `/`, `/pricing`, `/faq`, `/features`, `/how-it-works`, `/interview-types`
(indexable; `noindex` removed). Internal `/marketing/*` links repointed to root.
The temporary `/marketing` preview is gone (404).

**Architecture C auth.** Anonymous `/` → marketing landing; authenticated `/` →
`/dashboard` (redirect in `app/(marketing)/page.tsx`). Removed the in-app home
(`app/(app)/page.tsx`); `/dashboard` is the authenticated home. Default post-auth
landing is `/dashboard` — `safeNext` fallback changed `/` → `/dashboard`; all
`next=` deep-links preserved.

**`/new` consolidated flow.** Server-first, `?role=` driven: no role → role
picker, `?role=X` → config form (`SetupForm`). `/roles` and `/setup` are now
temporary redirect stubs into `/new` (`/setup` preserves `?role=`).

**Navbar.** Dashboard · New Interview (`/new`) · Interviews · Progress
(`/analytics`) · Profile; active-state logic updated for the `/new` flow.

**Dashboard onboarding (UX improvement).** First-run users (zero completed
interviews, gated on `metrics.totalInterviews`) see a prominent `OnboardingCard`
with a large "Start Your First Interview" → `/new` instead of the empty analytics
state. Once an interview exists, the normal analytics return plus a persistent
"New Interview" CTA in the dashboard header.

**Routing fix.** Anonymous deep links to protected routes now preserve the query
string through login: the proxy folds `request.nextUrl.search` into the captured
`next` (`resolveAuthRedirect(..., search)`), so e.g. `/setup?role=backend` →
`/login?next=%2Fsetup%3Frole%3Dbackend` → after login → `/new?role=backend`.

**SEO.** `sitemap.ts` lists the new public marketing routes; `robots.ts` disallows
`/new` and `/roles`; canonical metadata added per marketing page.

Not yet exercised live: authenticated redirects and the dashboard onboarding/
populated states (need a real Supabase session); logic- and build-verified.
