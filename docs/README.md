# ACE.AI Project Docs

This is the compact GitHub-facing documentation for the current ACE.AI codebase. Older planning notes, screenshots, and copied legacy app code were consolidated into `docs/legacy-notes.md`.

## Product Flow

- Setup page collects role, question type, interviewer, difficulty, strictness, and experience level.
- Technical interviews continue to `/interview/scenario-picker`, where scenario search and filtering are role-aware.
- Behavioral interviews start the voice flow directly.
- Technical runtime pages should not be redesigned as part of scenario-library work.

## Scenario System

Scenarios are file-backed packages under `content/interview-scenarios/<category>/<slug>`.

Common package shape:

```txt
scenario.md
workspace/
tests/
solution/
preview/
```

The scenario loader reads `scenario.md` frontmatter and authored files. Public candidate discovery should only include public scenarios. Internal templates or deleted examples must not count toward role, category, or difficulty totals.

### Public Backend Library

Easy:

- `notes-rest-api`
- `task-tracker-api`
- `product-catalog-api`

Medium:

- `authentication-api`
- `order-management-api`
- `blog-comments-api`

Hard:

- `analytics-api`
- `banking-transfers-api`
- `url-shortener-api`

`golden-health-check` is intentionally not part of the public library.

### Public Frontend Library

Frontend React scenarios currently live in `content/interview-scenarios/frontend-react`.

The picker rules are:

- Frontend Engineer: frontend scenarios only
- Backend Engineer: backend scenarios only
- Full-Stack Engineer: frontend and backend scenarios, ranked by best match
- Playground: all public scenarios by default

## Verification

Run these before shipping scenario or runtime changes:

```bash
npm run typecheck
npm run lint
npm run test
npm run scenario:check
npm run build
```

For one scenario:

```bash
npm run scenario:validate -- <slug>
```

The scenario toolkit validates schema, taxonomy, files, tests, checkpoint solutions, and runtime compatibility.

## Runtime Architecture

Technical scenarios resolve an execution profile from scenario metadata. The platform routes verification through the registered engine:

- React/frontend scenarios use the browser/component preview and verification path.
- Backend Node scenarios use the Node engine.
- Express scenarios use the in-memory Express request driver.
- SQLite scenarios run with a fresh per-verification database loaded from authored schema/seed files.

Scenario authoring should stay within scenario packages unless there is a real platform bug. Do not modify execution engines, preview runtime, verification runtime, or scenario picker while adding ordinary scenarios.

## Backend Scenario Authoring Rules

- Use TypeScript, Node, Express, and SQLite conventions already present in backend scenarios.
- Keep candidate work inside `workspace/`.
- Keep authored tests deterministic and HTTP-level where possible.
- Keep checkpoint solutions in `solution/step-*`.
- Use integer cents for money.
- Use parameterized SQL for user-provided values.
- Whitelist SQL identifiers such as sort columns.
- Preserve previous step behavior in later steps.
- Do not expose database-only fields in API responses.

## Environment

Copy `.env.example` to `.env.local` for local development.

Public client values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`

Server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_DAY_PASS`
- `STRIPE_PRICE_WEEK_PASS`

Provider setup lives outside the app:

- Supabase owns auth providers, redirect URLs, profiles/interviews tables, RLS, and related triggers.
- Vapi owns the public web key and provider-level model/transcriber/voice credentials.
- Stripe owns products, prices, checkout sessions, and webhook signing.

## Public Assets

Keep:

- `public/ace-ai.png`
- `public/icon-512.png`
- `app/icon.png`

The old marketing screenshots and copied legacy screenshots were removed from the repo.
