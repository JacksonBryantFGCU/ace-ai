# ACE.AI

ACE.AI is a Next.js interview practice app with behavioral voice interviews and technical scenario interviews. Technical interviews run against authored scenario packages in `content/interview-scenarios`.

## Stack

- Next.js 16, React 19, TypeScript
- Supabase for auth and interview persistence
- Vapi for behavioral voice interviews
- OpenAI for transcript evaluation
- Scenario verification runtime for React and Node/Express/SQLite exercises

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required local services and keys are listed in `.env.example`. The app can build without real provider keys, but Supabase, Vapi, OpenAI, and Stripe-backed flows need their corresponding environment values.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run scenario:check
npm run build
```

Use `npm run scenario:validate -- <slug>` to validate one scenario package.

## Documentation

- [Project docs](docs/README.md) - current architecture, scenario library, setup, and validation notes.
- [Legacy notes](docs/legacy-notes.md) - condensed archive of old rebuild/reference material that was removed from the repository.

## Scenario Library

Public technical scenarios live under `content/interview-scenarios`.

- Frontend scenarios: `content/interview-scenarios/frontend-react`
- Backend scenarios: `content/interview-scenarios/backend-node`

`golden-health-check` was removed from the public backend library and should not appear in candidate-facing discovery.
