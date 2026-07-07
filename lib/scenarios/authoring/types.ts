import type { Scenario } from "@/lib/scenarios/schema";

/**
 * Scenario Authoring Toolkit — shared types.
 *
 * The toolkit is a set of PURE validators over an in-memory `AuthoredBundle` (a
 * scenario's raw text + every file under its folder). No validator reads the
 * filesystem, so each is unit-testable with a hand-built bundle; the fs loading
 * lives in `server/scenarios/authoring.ts`. Everything is scenario-agnostic and
 * reusable for hundreds of scenarios.
 */

export type DiagnosticLevel = "error" | "warning" | "suggestion" | "performance" | "best-practice";

/** One finding. `location` + `message` + `fix` = "how to fix it exactly". */
export interface Diagnostic {
  level: DiagnosticLevel;
  /** Stable kebab slug, e.g. `frontmatter/unknown-role`. */
  code: string;
  /** Where — e.g. `scenario.md → steps[1].verify.tests`. */
  location: string;
  message: string;
  /** Concrete remediation. Required for errors (enforced by lint/tests). */
  fix?: string;
}

/** Everything a validator needs, already in memory (no fs). */
export interface AuthoredBundle {
  slug: string;
  /** Category folder the scenario lives in (`content/interview-scenarios/<category>/<slug>`). */
  category: string;
  /** Raw `scenario.md` text. */
  raw: string;
  /** YAML frontmatter parsed but NOT schema-validated (for schema error reporting). */
  frontmatter: unknown;
  /** Schema-valid scenario, or null when the frontmatter failed to parse/validate. */
  scenario: Scenario | null;
  /** Readable schema/parse error when `scenario` is null. */
  schemaError: string | null;
  /** `## Heading` → body text (candidate + authored sections). */
  sections: Record<string, string>;
  /**
   * Every file under the scenario folder EXCEPT `scenario.md`, keyed by its
   * scenario-relative POSIX path (e.g. `workspace/UserSearch.tsx`,
   * `tests/step-1.test.tsx`, `solution/step-1/UserSearch.tsx`).
   */
  files: Record<string, string>;
}

/** All findings for one scenario, plus a computed pass/fail. */
export interface ScenarioReport {
  slug: string;
  category: string;
  diagnostics: Diagnostic[];
  /** True when there are no `error` diagnostics. */
  ok: boolean;
}

// ── Diagnostic constructors (so callers never hand-build the object) ──────────

export const diag = {
  error: (code: string, location: string, message: string, fix: string): Diagnostic => ({
    level: "error",
    code,
    location,
    message,
    fix,
  }),
  warning: (code: string, location: string, message: string, fix?: string): Diagnostic => ({
    level: "warning",
    code,
    location,
    message,
    fix,
  }),
  suggestion: (code: string, location: string, message: string, fix?: string): Diagnostic => ({
    level: "suggestion",
    code,
    location,
    message,
    fix,
  }),
  performance: (code: string, location: string, message: string, fix?: string): Diagnostic => ({
    level: "performance",
    code,
    location,
    message,
    fix,
  }),
  bestPractice: (code: string, location: string, message: string, fix?: string): Diagnostic => ({
    level: "best-practice",
    code,
    location,
    message,
    fix,
  }),
};

/** A validator: pure bundle → diagnostics. Solution validation is async (runs tests). */
export type Validator = (bundle: AuthoredBundle) => Diagnostic[];
export type AsyncValidator = (bundle: AuthoredBundle) => Promise<Diagnostic[]>;
