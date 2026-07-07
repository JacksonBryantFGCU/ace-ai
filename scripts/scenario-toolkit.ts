/**
 * Scenario Authoring Toolkit — CLI.
 *
 *   pnpm scenario:validate [slug]   full validation (incl. running the solution)
 *   pnpm scenario:lint     [slug]   fast static checks (no solution execution)
 *   pnpm scenario:check             full validation of ALL scenarios (CI gate)
 *   pnpm scenario:doctor   [slug]   full, advisory report of every issue (exit 0)
 *
 * `validate` / `lint` / `check` exit non-zero on any error, so they can gate a
 * commit/CI. `doctor` always exits 0 — it's the "tell me everything" report.
 */
import { validateScenarios } from "@/server/scenarios/authoring";
import { formatReports, hasErrors } from "@/lib/scenarios/authoring/report";

type Command = "validate" | "lint" | "check" | "doctor";

const COMMANDS: Record<Command, { runSolution: boolean; failOnError: boolean; all: boolean }> = {
  validate: { runSolution: true, failOnError: true, all: false },
  lint: { runSolution: false, failOnError: true, all: false },
  check: { runSolution: true, failOnError: true, all: true },
  doctor: { runSolution: true, failOnError: false, all: false },
};

async function main(): Promise<void> {
  const [, , rawCommand = "validate", slugArg] = process.argv;
  const cfg = COMMANDS[rawCommand as Command];
  if (!cfg) {
    console.error(`Unknown command "${rawCommand}". Use one of: ${Object.keys(COMMANDS).join(", ")}.`);
    process.exit(2);
  }

  const slug = cfg.all ? undefined : slugArg;
  try {
    const reports = await validateScenarios({ slug, runSolution: cfg.runSolution });
    console.log(formatReports(reports));
    if (cfg.failOnError && hasErrors(reports)) process.exit(1);
  } catch (e) {
    console.error(`✗ ${(e as Error).message}`);
    process.exit(2);
  }
}

void main();
