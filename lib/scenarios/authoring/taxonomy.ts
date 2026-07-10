import { VALID_ROLES } from "@/lib/constants";
import { DIFFICULTIES, EXPERIENCE_LEVELS, HARNESSES } from "@/lib/scenarios/schema";

/**
 * Editable taxonomy for scenario authoring — the allow-lists the validator checks
 * `category`, `stack.languages`, and `jobRoles` against. Scenario-agnostic: adding
 * a new category/language/role is a one-line change here, and every future
 * scenario is validated against it automatically.
 */

/** Job roles a scenario may target (mirrors the app's role vocabulary). */
export const KNOWN_ROLES: readonly string[] = VALID_ROLES;

/** Languages a scenario workspace/harness may declare. */
export const SUPPORTED_LANGUAGES: readonly string[] = [
  "typescript",
  "javascript",
  "python",
  "java",
  "cpp",
  "bash",
  "sql",
  "css",
  "html",
];

/**
 * Known scenario categories. The `category` frontmatter must equal the scenario's
 * folder; an unknown category (not in this list) is a warning prompting the author
 * to register it here so selection/taxonomy stay coherent.
 */
export const KNOWN_CATEGORIES: readonly string[] = [
  "frontend-react",
  "frontend-vue",
  "frontend-vanilla",
  "backend-node",
  "backend-python",
  "backend-sql",
  "fullstack",
  "fullstack-react-node",
  "algorithms",
  "systems",
  "machine-learning-python",
];

/**
 * Which languages each verification harness can execute today. Used to flag a
 * scenario whose declared languages don't match its harness (e.g. a `component`
 * harness with `python`). `none` = discussion-only, so any language is fine.
 */
export const HARNESS_LANGUAGES: Record<(typeof HARNESSES)[number], readonly string[]> = {
  component: ["typescript", "javascript", "css", "html"],
  "node-vm": ["typescript", "javascript"],
  python: ["python"],
  sqlite: ["sql"],
  none: [...SUPPORTED_LANGUAGES],
};

/** Harnesses that actually execute candidate code (i.e. can auto-grade). */
export const EXECUTABLE_HARNESSES: readonly string[] = HARNESSES.filter((h) => h !== "none");

export { DIFFICULTIES, EXPERIENCE_LEVELS };

/** Rough per-difficulty sanity bounds for `estimatedMinutes` (performance/best-practice hints). */
export const ESTIMATED_MINUTES_BOUNDS: Record<(typeof DIFFICULTIES)[number], { min: number; max: number }> = {
  easy: { min: 10, max: 30 },
  medium: { min: 20, max: 45 },
  hard: { min: 30, max: 90 },
};
