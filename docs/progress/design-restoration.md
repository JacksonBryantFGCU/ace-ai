# Design Restoration — Legacy UI/UX Pass

Restores the look, feel, and UX of the legacy ACE.AI frontend on top of the
existing Next.js 16 Server-First architecture. **No routing, auth, server
actions, Vapi integration, data flow, or behavior changed** — this is a visual
pass only. Screenshots in `reference/legacy/screenshots/` were the primary
source of truth; the legacy source the secondary.

## Approved decisions
- **D1** — Removed the light/dark toggle; themes are now **fixed per surface**
  (light pastel for marketing/auth/app pages, dark slate for the live interview +
  replay experience).
- **D2** — Kept the union-label config model; setup sliders are **discrete
  stop-sliders** mapping to the unions (no numeric data model).
- **D3** — **CSS-first animations only** (no Framer Motion / animation libs).
- **D4** — Dashboard got the new design language **only**; no placeholder
  analytics shell (real metrics remain Phase 6).
- **D5** — Recreated the legacy **home/landing** page.

## Design-system foundations
- `app/globals.css` — added branded `@layer components` utilities: `.surface-light`
  / `.surface-dark` (page gradients), `.glass-card` (+ auto dark variant),
  `.text-brand` (blue→purple→pink gradient text).
- `components/ui/button.tsx` — added a `brand` variant (blue gradient primary).
- Removed `next-themes` usage: `providers/app-providers.tsx` is now a passthrough;
  deleted `providers/theme-provider.tsx` and `components/theme-toggle.tsx`.

## Pages updated
| Screen | Route | Change |
| --- | --- | --- |
| Login | `(auth)/login` | Glass auth card, pastel surface, glass inputs, brand button, Google OAuth, legacy copy ("Welcome back"). |
| Signup | `(auth)/signup` | Same treatment; "Create account" / "Start practicing interviews today". |
| Forgot / Reset password | `(auth)/forgot-password`, `(auth)/reset-password` | Re-skinned to the same glass auth surface (not screenshotted; kept consistent). |
| Home / hero | `(marketing)/` | Recreated: gradient headline ("Practice **Real** Interviews…"), CTAs, highlight checks, animated demo card. |
| Marketing chrome | `(marketing)/layout` | Brand logo + glass nav, pastel surface, removed theme toggle. |
| App shell | `(app)/layout` | Now renders `AppShell` (branded navbar + per-route surface theme). |
| Dashboard | `(app)/dashboard` | Branded typography only (no analytics shell — D4). |
| Roles | `(app)/roles` | Glass role cards with brand gradient icons, centered legacy heading. |
| Setup | `(app)/setup` | Two-panel glass layout, pill question-type toggle, stop-sliders, interviewer panel + persona card. |
| History | `(app)/interviews` | "Past Interviews" heading, glass rows with gradient icon, type badge, score pill, chevron. |
| Voice interview | `(interview)/interview/voice` | Dark surface + dark navbar, colored setting chips, brand Start button (class-only; Vapi logic untouched). |
| Replay | `(app)/interviews/[id]` | Dark two-column layout: top bar, chat-bubble transcript, collapsible question analysis, overall-summary card. |
| Analytics / Profile | `(app)/analytics`, `(app)/profile` | Heading typography aligned to the light surface (still Phase 2/6 stubs). |

## Components created
- `components/brand-logo.tsx` — spade + gradient "ACE.AI" wordmark.
- `components/app-shell.tsx` — client shell fixing the surface theme by route.
- `components/auth/auth-card.tsx` — glass auth card + shared `authInputClass`.
- `components/home/hero-demo-card.tsx` — static demo card (CSS animation).
- `components/setup/stop-slider.tsx` — discrete union-mapped slider (D2).
- `components/setup/interviewer-card.tsx` — persona/style/traits card (ported).
- `components/interview/setting-chip.tsx` — color-coded config pills (dark UI).
- `components/interviews/question-analysis.tsx` — collapsible per-question cards.
- `components/interviews/overall-summary.tsx` — dimensions + feedback lists.
- `lib/user-display.ts` — shared navbar display-name helper.

## Components modified
- `components/dashboard-navbar.tsx` — rebuilt as a branded client navbar (pill
  tabs, bell, avatar dropdown, mobile menu, light/dark variant).
- `components/auth/{login,signup,forgot-password,reset-password}-form.tsx`,
  `components/auth/google-auth-button.tsx` — glass styling + brand buttons.
- `components/setup/setup-form.tsx` — restructured to the two-panel layout
  (preview / Vapi / draft logic unchanged).
- `components/interviews/{interview-card,empty-state,transcript-timeline}.tsx` —
  re-skinned (glass rows / dark chat bubbles).
- `components/interview/voice-interview-client.tsx` — class-only dark re-skin +
  colored chips + brand button.
- `lib/constants.ts` — added `ROLE_META`, `ROLE_LABELS`, `asRole` (role display).
- Layouts: `(app)`, `(auth)`, `(marketing)`, `(interview)` — surfaces + chrome.

## Components removed
- `components/interviews/score-summary.tsx` — split into `question-analysis` +
  `overall-summary`.
- `components/theme-toggle.tsx`, `providers/theme-provider.tsx` — toggle removed.

## Intentional differences from the legacy UI
1. **No GitHub OAuth button.** Legacy showed Google + GitHub; the new auth
   backend only implements Google, so GitHub is omitted rather than shown as a
   dead control (auth is locked / out of scope).
2. **No "Name" field on signup.** The locked Phase-1 `signUp` action accepts only
   email/password; a non-persisted field would mislead. Omitted + documented.
3. **Experience slider has 3 stops** (Junior/Mid/Senior), not the legacy's 4
   (Intern/Entry/Junior/Senior) — the data model is a 3-value union (D2).
   Strictness labels are mapped to legacy wording (Relaxed/Standard/Strict).
4. **Logo is recreated, not the raster asset.** The legacy `finallogoace.png` was
   not provided; `BrandLogo` approximates it with a spade glyph + gradient wordmark.
5. **Hero demo card is static** with CSS-only motion (blinking caret, pulsing
   waveform) instead of the legacy JS typing animation (D3).
6. **Home CTAs route to signup/login** (logged-out marketing visitor) rather than
   the legacy `/roles` (which assumed an authenticated session).
7. **Transcript "Q badges" and "View analysis" cross-links** from the legacy
   replay were not reproduced (they require turn→question mapping); the transcript
   is a clean chat timeline instead.

## Technical compromises from the new architecture
- **Surface theming is per-route, not global.** `AppShell` (client) reads
  `usePathname()` to switch the app group between light and the dark replay
  surface; the `(interview)` layout is statically dark. Page content stays
  server-rendered and is passed through as children.
- **Navbar is a client island** (needs active-tab + dropdown/menu state); it was
  previously a server component. Logout is still a server-action form.
- **Setup sliders are discrete** (architecture uses union labels, not 0–100).
- **Question-analysis collapsing uses native `<details>`** to stay server-first
  (no client JS for expand/collapse).
- The legacy interview/replay screens showed the navbar; the Phase-4
  "distraction-free" interview layout now renders the dark navbar to match the
  screenshots.

## Verification checklist
- [x] `pnpm typecheck` — passes (0 errors)
- [x] `pnpm lint` — passes (0 warnings)
- [x] `pnpm test` — 20/20 passing
- [x] `pnpm build` — succeeds; `/` static, all routes compile
- [x] No routing/auth/server-action/Vapi/data-flow changes
- [x] No `next-themes` / theme-toggle references remain
- [x] Light surfaces: auth, home, dashboard, roles, setup, history
- [x] Dark surfaces: voice interview, replay
- [x] Phase 5 (technical interview) and Phase 6 (analytics) left as stubs
- [ ] Manual visual QA against screenshots (pending your review)

## Addendum — legacy nav model, exact assets & flow

Follow-up pass to restore the legacy navigation model and exact visual assets
(no marketing site).

**Home is now the authenticated entry point.**
- Moved the hero to `app/(app)/page.tsx` (inside the authed app shell); **deleted
  the `(marketing)` route group**. `/` is gated by the existing `requireUser()`
  in the app layout — no auth-policy/`proxy` change.
- Restored the legacy nav model: the **Dashboard** tab and the logo link to `/`
  (the hero), Practice Interviews → `/roles`, Interviews → `/interviews`,
  Analytics → `/analytics`.
- The `(app)` shell now selects the surface by route: `/` → hero gradient,
  `/interviews/<id>` → dark, everything else → pastel light.

**Exact legacy assets/gradients ported (task 5).**
- `.surface-dark` corrected to the legacy `from-gray-900 via-gray-800 to-gray-900`
  (was approximated with slate).
- Added `.surface-hero` = `from-purple-50 via-blue-50 to-blue-100` (legacy
  `HeroPage` gradient).
- `BrandLogo` now renders the real `public/ace-ai.png` with the legacy
  `w-20 scale-150 origin-left` treatment (replaces the recreated wordmark).
- Hero + demo card markup/classes ported verbatim from `HeroPage.tsx`.

**Role selection decoupled from Setup (task 3).**
- `SetupForm` no longer has a role `<select>`; it takes a fixed `role` and shows
  it read-only with a "Change" link back to `/roles`.
- `/setup` with no/invalid `?role=` now `redirect("/roles")`, enforcing the flow.

**Restored flow:** Home (`/`) → Roles (`/roles`) → Setup (`/setup?role=`) →
Voice Interview (`/interview/voice`) → Results (`/interviews/[id]`) →
Analytics (`/analytics`). All routing/handoff already existed; unchanged.

**Note:** post-login still lands on `/dashboard` (the existing `safeNext`
default — left untouched to preserve auth behavior). Home is reached via the
Dashboard tab / logo. The `/dashboard` stats page (legacy `DashboardDemo`)
remains a Phase-6 stub, not in the nav (matching the legacy model).

### Re-verification
- [x] `pnpm typecheck` · `pnpm lint` · `pnpm test` (20/20) · `pnpm build` — all pass
- [x] `(marketing)` group removed; `/` resolves to the authed hero
- [x] No auth/Supabase/Vapi/server-action/business-logic changes

## Setup page polish

Focused UX pass on the Setup page (presentation + control behavior only).

**Sliders — restored full functionality.** The custom `StopSlider` only
responded to label clicks (no drag, no track-click, no keyboard). Reimplemented
its internals on the **Base UI `Slider`** primitive (already a dependency — same
one powering Button/Input), driven by option index ⇄ union value. Now supports
dragging, track-clicking, and keyboard, with `aria-valuetext` announcing the
human label. The component's public API is unchanged.

**Removed the selected-state highlight.** Slider labels are now plain markers
(`text-gray-600`, no `font-semibold text-blue-600` active state); the thumb
position conveys the value, matching the legacy design.

**Restored the in-form Role dropdown.** Role is selectable again via a `<select>`
at the top of the form (stateful, updates immediately, **no navigation**). The
native arrow was replaced with a custom chevron (`appearance-none` + positioned
`ChevronDown`) for spacing. The dedicated `/roles` page remains the primary entry
point; the dropdown only changes the role mid-configuration.

**Removed the intro paragraph** beneath "Configure Your Interview" (title kept,
spacing tightened).

**Voice preview card.** Fixed the persona header so the style label + trait chips
sit on a single row without overlap/clipping: shows **3** traits, smaller text
(`text-[9px]`/`text-[10px]`), tighter tracking. Card design preserved.

### Experience level — model extension (Option C)
Replaced the experience options with **Intern / Entry / Junior / Senior**. Rather
than mapping 4 labels onto the old 3-value union (which would force "Junior" to
mean "mid"), the model was extended so every label maps 1:1 and honestly:

- `ExperienceLevel` = `"intern" | "entry" | "junior" | "senior"` (`types/interview.ts`)
- Zod enum (`lib/validation/interview.ts`), `EXPERIENCE_LEVELS` (`lib/constants.ts`)
- `experienceInstructions` prompt wording (`lib/prompts/behavioral.ts`) — dropped
  `mid`, added `intern` + `entry`

**Backwards compatibility:** `experience` is stored as a plain string inside the
`config` JSON, so existing rows with `"mid"` still read/render fine (title-cased
to "Mid") — the union change is compile-time only, **no DB migration**. Default
experience shifted from `mid` → `junior`.

### Files (setup polish)
- `app/(app)/setup/page.tsx`, `components/setup/setup-form.tsx`,
  `components/setup/stop-slider.tsx`, `components/setup/interviewer-card.tsx`
- `types/interview.ts`, `lib/validation/interview.ts`, `lib/constants.ts`,
  `lib/prompts/behavioral.ts`, `lib/validation/interview.test.ts`

### Re-verification
- [x] `pnpm typecheck` · `pnpm lint` · `pnpm test` (20/20) · `pnpm build` — all pass
- [x] No routing/auth/Supabase/Vapi/cookie/business-logic changes beyond the
      approved experience-enum extension
