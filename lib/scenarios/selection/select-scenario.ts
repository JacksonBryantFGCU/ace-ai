import { EXPERIENCE_LEVELS } from "@/lib/scenarios/schema";
import type {
  RankedScenario,
  RelaxableConstraint,
  ScenarioCandidate,
  SelectionCriteria,
  SelectionOptions,
  SelectionResult,
  ScenarioSelectionResult,
} from "@/lib/scenarios/selection/types";
import { noScenarioMessage, roleMatchForScenario } from "@/lib/scenarios/selection/roles";

/**
 * Scenario selection service (pure).
 *
 * Given the interview criteria and a pool of candidates (frontmatter only), it
 * returns the closest valid scenario:
 *   1. Hard prerequisites filter the pool (interview type, role boundary, optional status).
 *   2. Each candidate gets a LEXICOGRAPHIC mismatch penalty over the relaxable
 *      constraints — a violation of a more-important constraint outweighs any
 *      combination of less-important ones. So the best tier is "all satisfied";
 *      failing that, only the least-important constraints are relaxed, and
 *      `experience` is protected (relaxed last, only when no alternative exists).
 *   3. Among the closest (min-penalty) tier, recently completed scenarios are
 *      avoided when possible, then ties break stably by slug.
 *
 * `rankScenarios` exposes the scored, ordered list for reuse (recommendations).
 */

/** LEAST important first (relaxed first). `jobRole` is last = most protected. */
export const DEFAULT_RELAX_PRIORITY: RelaxableConstraint[] = [
  "category",
  "scenarioType",
  "language",
  "framework",
  "runtime",
  "experience",
  "difficulty",
  "jobRole",
];

const norm = (value: string) => value.trim().toLowerCase();
const expIndex = (level: string) => EXPERIENCE_LEVELS.indexOf(level as (typeof EXPERIENCE_LEVELS)[number]);

/** Is a single relaxable constraint satisfied? Absent criteria never constrain. */
function satisfies(
  constraint: RelaxableConstraint,
  candidate: ScenarioCandidate,
  criteria: SelectionCriteria,
): boolean {
  switch (constraint) {
    case "category":
      return !criteria.category || norm(candidate.category) === norm(criteria.category);
    case "scenarioType":
      return !criteria.scenarioType || candidate.type === criteria.scenarioType;
    case "difficulty":
      return !criteria.difficulty || candidate.difficulty === criteria.difficulty;
    case "jobRole":
      return !criteria.jobRole || roleMatchForScenario(candidate, criteria.jobRole).exact;
    case "language":
      return !criteria.language || candidate.languages.some((l) => norm(l) === norm(criteria.language!));
    case "runtime":
      return !criteria.runtime || norm(candidate.runtime ?? "") === norm(criteria.runtime);
    case "framework":
      return !criteria.framework || norm(candidate.framework ?? "") === norm(criteria.framework);
    case "experience": {
      if (!criteria.experience) return true;
      const want = expIndex(criteria.experience);
      const min = expIndex(candidate.experienceMin);
      const max = expIndex(candidate.experienceMax);
      return want >= min && want <= max;
    }
  }
}

/** Candidate passes the non-negotiable gates (never relaxed). */
function meetsPrerequisites(
  candidate: ScenarioCandidate,
  criteria: SelectionCriteria,
  options: SelectionOptions,
): boolean {
  if (!candidate.interviewTypes.includes(criteria.interviewType)) return false;
  if (options.eligibleStatuses && !options.eligibleStatuses.includes(candidate.status)) return false;
  if (criteria.jobRole && !roleMatchForScenario(candidate, criteria.jobRole).allowed) return false;
  return true;
}

/**
 * Lexicographic weights: a violation of the constraint at priority index `i` costs
 * `2^i`, which is strictly greater than the sum of all lower weights — so a
 * higher-priority mismatch can never be outweighed by any number of lower ones.
 */
function weightsFor(priority: RelaxableConstraint[]): Map<RelaxableConstraint, number> {
  return new Map(priority.map((c, i) => [c, 2 ** i]));
}

/**
 * Score every eligible candidate and return them ordered closest-first (penalty
 * ascending, fresh before recent on ties). Ineligible candidates (failing a
 * prerequisite) are dropped. Pure + deterministic — no randomness here.
 */
export function rankScenarios(
  candidates: readonly ScenarioCandidate[],
  criteria: SelectionCriteria,
  options: SelectionOptions = {},
): RankedScenario[] {
  const priority = options.priority ?? DEFAULT_RELAX_PRIORITY;
  const weights = weightsFor(priority);
  const exclude = new Set(options.exclude ?? []);

  const ranked: RankedScenario[] = [];
  for (const candidate of candidates) {
    if (!meetsPrerequisites(candidate, criteria, options)) continue;
    const relaxed = priority.filter((c) => !satisfies(c, candidate, criteria));
    const penalty = relaxed.reduce((sum, c) => sum + (weights.get(c) ?? 0), 0);
    ranked.push({ candidate, penalty, relaxed, recent: exclude.has(candidate.slug) });
  }

  return ranked.sort(
    (a, b) =>
      a.penalty - b.penalty ||
      Number(a.recent) - Number(b.recent) ||
      a.candidate.slug.localeCompare(b.candidate.slug),
  );
}

/**
 * Select one scenario for the given criteria, or `null` when nothing meets the
 * hard prerequisites. See the module doc for the algorithm.
 */
export function selectScenario(
  candidates: readonly ScenarioCandidate[],
  criteria: SelectionCriteria,
  options: SelectionOptions = {},
): SelectionResult | null {
  const selected = selectScenarioResult(candidates, criteria, options);
  if (selected.status === "empty") return null;
  return {
    candidate: selected.candidate,
    penalty: selected.penalty,
    relaxed: selected.relaxed,
    repeatedRecent: selected.repeatedRecent,
  };
}

export function selectScenarioResult(
  candidates: readonly ScenarioCandidate[],
  criteria: SelectionCriteria,
  options: SelectionOptions = {},
): ScenarioSelectionResult {
  if (candidates.length === 0) {
    return { status: "empty", reason: "no-candidates", message: "No scenarios are available yet." };
  }

  const roleEligible = criteria.jobRole
    ? candidates.filter((candidate) => roleMatchForScenario(candidate, criteria.jobRole).allowed)
    : [...candidates];
  if (roleEligible.length === 0) {
    return { status: "empty", reason: "no-role-match", message: noScenarioMessage(criteria.jobRole) };
  }

  const typeEligible = roleEligible.filter((candidate) => candidate.interviewTypes.includes(criteria.interviewType));
  if (typeEligible.length === 0) {
    return {
      status: "empty",
      reason: "no-interview-type-match",
      message: "No scenarios are available for this interview type yet.",
    };
  }

  const statusEligible = options.eligibleStatuses
    ? typeEligible.filter((candidate) => options.eligibleStatuses!.includes(candidate.status))
    : typeEligible;
  if (statusEligible.length === 0) {
    return { status: "empty", reason: "no-status-match", message: noScenarioMessage(criteria.jobRole) };
  }

  const ranked = rankScenarios(statusEligible, criteria, options);
  if (ranked.length === 0) {
    return { status: "empty", reason: "no-role-match", message: noScenarioMessage(criteria.jobRole) };
  }

  // The closest tier = all candidates sharing the minimum penalty.
  const best = ranked[0]!.penalty;
  const tier = ranked.filter((r) => r.penalty === best);

  // Prefer non-recent; fall back to the whole tier if every best match is recent.
  const fresh = tier.filter((r) => !r.recent);
  const pool = fresh.length > 0 ? fresh : tier;

  const pick = options.random
    ? pool[Math.min(pool.length - 1, Math.floor(options.random() * pool.length))]!
    : pool[0]!;

  return {
    status: "selected",
    candidate: pick.candidate,
    penalty: pick.penalty,
    relaxed: pick.relaxed,
    repeatedRecent: fresh.length === 0 && tier.some((r) => r.recent),
  };
}
