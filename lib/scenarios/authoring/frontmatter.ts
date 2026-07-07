import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import {
  ESTIMATED_MINUTES_BOUNDS,
  EXPERIENCE_LEVELS,
  HARNESS_LANGUAGES,
  KNOWN_CATEGORIES,
  KNOWN_ROLES,
  SUPPORTED_LANGUAGES,
} from "@/lib/scenarios/authoring/taxonomy";

const AT = "scenario.md";
const list = (xs: readonly string[]) => xs.join(", ");
const expIndex = (level: string) => EXPERIENCE_LEVELS.indexOf(level as (typeof EXPERIENCE_LEVELS)[number]);

/**
 * Frontmatter + metadata validation: schema shape, slug/id consistency, and
 * taxonomy membership (category, job roles, languages), plus experience-range and
 * estimated-time sanity. Structural rules (weights sum to 100, `explain` ⇒ rubric,
 * …) are enforced by `scenarioSchema`; a schema failure is surfaced here as a
 * single actionable error and short-circuits the rest (nothing else can run).
 */
export function validateFrontmatter(bundle: AuthoredBundle): Diagnostic[] {
  const out: Diagnostic[] = [];
  const { scenario } = bundle;

  if (!scenario) {
    out.push(
      diag.error(
        "frontmatter/invalid",
        AT,
        `Frontmatter failed to parse or validate:\n${bundle.schemaError ?? "unknown error"}`,
        "Fix each issue listed above. Frontmatter must be a valid `---` YAML block matching the scenario schema (lib/scenarios/schema.ts).",
      ),
    );
    return out; // Everything downstream needs a valid scenario.
  }

  // slug / id / category consistency (the loader relies on the folder layout).
  if (scenario.id !== bundle.slug) {
    out.push(
      diag.error(
        "frontmatter/id-slug-mismatch",
        `${AT} → id`,
        `id "${scenario.id}" does not match the folder name "${bundle.slug}".`,
        `Rename the folder to "${scenario.id}" or set \`id: ${bundle.slug}\`. They MUST be identical.`,
      ),
    );
  }
  if (scenario.category !== bundle.category) {
    out.push(
      diag.error(
        "frontmatter/category-folder-mismatch",
        `${AT} → category`,
        `category "${scenario.category}" does not match the folder "${bundle.category}".`,
        `Set \`category: ${bundle.category}\` or move the scenario under a "${scenario.category}" category folder.`,
      ),
    );
  } else if (!KNOWN_CATEGORIES.includes(scenario.category)) {
    out.push(
      diag.warning(
        "frontmatter/unknown-category",
        `${AT} → category`,
        `category "${scenario.category}" is not a known category.`,
        `Add "${scenario.category}" to KNOWN_CATEGORIES (lib/scenarios/authoring/taxonomy.ts) if it's intentional. Known: ${list(KNOWN_CATEGORIES)}.`,
      ),
    );
  }

  // Job roles.
  for (const role of scenario.jobRoles) {
    if (!KNOWN_ROLES.includes(role)) {
      out.push(
        diag.error(
          "frontmatter/unknown-role",
          `${AT} → jobRoles`,
          `jobRole "${role}" is not a known role.`,
          `Use one of: ${list(KNOWN_ROLES)} (or add it to VALID_ROLES in lib/constants).`,
        ),
      );
    }
  }

  // Languages + harness compatibility.
  for (const lang of scenario.stack.languages) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      out.push(
        diag.error(
          "frontmatter/unsupported-language",
          `${AT} → stack.languages`,
          `language "${lang}" is not supported.`,
          `Use one of: ${list(SUPPORTED_LANGUAGES)} (or add it to SUPPORTED_LANGUAGES in taxonomy.ts).`,
        ),
      );
    }
  }
  const harnessLangs = HARNESS_LANGUAGES[scenario.stack.harness];
  const mismatched = scenario.stack.languages.filter((l) => !harnessLangs.includes(l));
  if (mismatched.length > 0) {
    out.push(
      diag.warning(
        "frontmatter/harness-language-mismatch",
        `${AT} → stack`,
        `harness "${scenario.stack.harness}" cannot execute language(s): ${list(mismatched)}.`,
        `Match the harness to the language(s). "${scenario.stack.harness}" supports: ${list(harnessLangs)}.`,
      ),
    );
  }

  // Experience range.
  if (expIndex(scenario.experienceMin) > expIndex(scenario.experienceMax)) {
    out.push(
      diag.error(
        "frontmatter/experience-range",
        `${AT} → experienceMin/experienceMax`,
        `experienceMin "${scenario.experienceMin}" is above experienceMax "${scenario.experienceMax}".`,
        `Order them low→high. Levels: ${list(EXPERIENCE_LEVELS)}.`,
      ),
    );
  }

  // Estimated time sanity (soft).
  const bounds = ESTIMATED_MINUTES_BOUNDS[scenario.difficulty];
  if (scenario.estimatedMinutes < bounds.min || scenario.estimatedMinutes > bounds.max) {
    out.push(
      diag.performance(
        "frontmatter/estimated-minutes-outlier",
        `${AT} → estimatedMinutes`,
        `estimatedMinutes ${scenario.estimatedMinutes} is unusual for a "${scenario.difficulty}" scenario (typical ${bounds.min}–${bounds.max}).`,
        `Confirm the estimate reflects the step count/complexity, or adjust difficulty.`,
      ),
    );
  }

  // Best-practice nudges.
  if (!scenario.tags || scenario.tags.length === 0) {
    out.push(
      diag.bestPractice(
        "frontmatter/no-tags",
        `${AT} → tags`,
        "No tags declared.",
        "Add discovery tags (e.g. `framework:react`, `pattern:search`) so the scenario is filterable.",
      ),
    );
  }
  if (scenario.status === "draft") {
    out.push(
      diag.suggestion(
        "frontmatter/draft-status",
        `${AT} → status`,
        'status is "draft".',
        "Promote to `review` (peer-reviewed) or `verified` (validated) before production serves it.",
      ),
    );
  }

  return out;
}
