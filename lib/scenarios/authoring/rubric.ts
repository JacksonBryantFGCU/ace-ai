import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";
import type { RubricCriterion } from "@/lib/scenarios/schema";

const PLACEHOLDER = /\b(TODO|TBD|FIXME|xxx)\b/i;

/** Validate one rubric (the holistic scenario rubric, or a step rubric). */
function checkRubric(criteria: RubricCriterion[], at: string, out: Diagnostic[]): void {
  if (criteria.length === 0) return; // presence is enforced by schema/step validators.

  if (criteria.length < 2) {
    out.push(
      diag.suggestion(
        "rubric/single-criterion",
        at,
        "rubric has a single criterion — grading will be coarse.",
        "Split into 2–4 weighted dimensions (e.g. correctness, communication, trajectory).",
      ),
    );
  }

  // Weights must total 100 (defensive — schema enforces, surfaced clearly here).
  const total = criteria.reduce((n, c) => n + c.weight, 0);
  if (total !== 100) {
    out.push(
      diag.error(
        "rubric/weights-sum",
        at,
        `rubric weights sum to ${total}, not 100.`,
        "Adjust the `weight`s so they total exactly 100.",
      ),
    );
  }

  const seen = new Set<string>();
  for (const c of criteria) {
    const key = c.criterion.trim().toLowerCase();
    if (seen.has(key)) {
      out.push(
        diag.error(
          "rubric/duplicate-criterion",
          at,
          `duplicate rubric criterion "${c.criterion}".`,
          "Merge or rename duplicated criteria — each dimension should be scored once.",
        ),
      );
    }
    seen.add(key);

    if (c.detail.trim().length === 0) {
      out.push(
        diag.error(
          "rubric/empty-feedback",
          at,
          `criterion "${c.criterion}" has empty detail.`,
          "Describe what a strong answer looks like — the detail is the grading guidance.",
        ),
      );
    } else if (PLACEHOLDER.test(c.detail)) {
      out.push(
        diag.warning(
          "rubric/placeholder-feedback",
          at,
          `criterion "${c.criterion}" detail looks like a placeholder.`,
          "Replace the TODO/TBD with real grading guidance before shipping.",
        ),
      );
    }

    if (c.weight === 0) {
      out.push(
        diag.warning(
          "rubric/zero-weight",
          at,
          `criterion "${c.criterion}" has weight 0 and can't affect the score.`,
          "Give it a positive weight, or remove it.",
        ),
      );
    }
  }
}

/**
 * Rubric validation across the holistic scenario rubric and every step rubric:
 * missing dimensions, duplicate criteria, empty/placeholder feedback, invalid
 * weights, and weight totals.
 */
export function validateRubric(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario) return [];

  const out: Diagnostic[] = [];
  checkRubric(scenario.rubric, "scenario.md → rubric", out);
  scenario.steps.forEach((step, i) => {
    if (step.rubric) checkRubric(step.rubric, `scenario.md → steps[${i}] (${step.id}).rubric`, out);
  });
  return out;
}
