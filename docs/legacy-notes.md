# Legacy Notes

This file preserves the useful information from the old internal docs and reference folders after cleanup. The original detailed material was useful during migration and scenario authoring, but it was not appropriate to keep as GitHub-facing documentation.

## Removed Documentation

The old `docs/architecture` folder contained detailed design notes for the scenario runtime, preview runtime, execution engines, authoring toolkit, voice architecture, and migration plans. The current operational summary now lives in `docs/README.md`.

The old `docs/interview-scenarios` folder contained the frozen scenario schema, gold-standard authoring process, scenario library checklist, and an IDE-focused HTML mockup. The current source of truth is:

- Scenario packages in `content/interview-scenarios`
- Schema and validators in `lib/scenarios`
- Toolkit commands in `scripts/scenario-toolkit.ts`
- Public scenario list in `docs/README.md`

The old `docs/nextjs-rebuild-plan` folder was a migration plan from an earlier app shape. The app has already moved to the current Next.js codebase, so those implementation notes were removed.

The old `docs/progress` folder recorded phase-by-phase migration progress. Completed progress logs were removed because they are not useful for readers evaluating the current project.

The old `docs/marketing` folder contained Claude Code conversion notes, standalone marketing HTML, and screenshots. Those were removed because the current app source and public assets now carry the product implementation.

## Removed Reference App

The `reference/legacy` folder was a copied legacy app used during migration. It included old Vite/React components, Express routes, service files, prompts, tests, and screenshots.

That folder is no longer needed because the current Next.js implementation contains the maintained equivalents. The `.gitignore` still excludes `/reference` so future local-only reference drops do not get committed by accident.

Important concepts that survived the migration:

- Behavioral interview voice flow backed by Vapi
- Supabase auth and interview persistence
- OpenAI-based transcript evaluation
- Interview setup with role, question type, interviewer, difficulty, strictness, and experience inputs
- Technical interview scenarios replacing the old static technical problem bank
- Scenario validation through `npm run scenario:check`

Important concepts intentionally not carried forward:

- Static `technicalProblems` problem bank as the primary technical flow
- Old browser code-execution hooks and one-off technical editor components
- Copied migration screenshots
- Claude-specific handoff instructions
- Internal phase progress logs

## Golden Health Check

`golden-health-check` was a backend authoring/template scenario. It was removed from `content/interview-scenarios/backend-node` and should not be restored as a public candidate-facing scenario.

The public backend library now starts with real interview scenarios:

- Easy: `notes-rest-api`, `task-tracker-api`, `product-catalog-api`
- Medium: `authentication-api`, `order-management-api`, `blog-comments-api`
- Hard: `analytics-api`, `banking-transfers-api`, `url-shortener-api`

## Rebuild Decisions Worth Remembering

- Prefer server-side reads and Server Actions where practical.
- Keep Vapi isolated to the behavioral voice client/provider layer.
- Keep scenario engines generic and selected by metadata.
- Keep candidate scenario content file-backed and validated before it becomes public.
- Keep provider secrets server-only unless they are explicitly `NEXT_PUBLIC_*`.
- Keep setup and scenario picker as separate focused steps.

## If More Historical Detail Is Needed

Use Git history for the removed files. The cleanup intentionally keeps only the current project docs plus this summary so the repository is easier for people to read on GitHub.
