import type { Difficulty, ExperienceLevel, QuestionType } from "@/types/interview";
import type { ScenarioType } from "@/lib/scenarios/schema";

/**
 * Types for the scenario selection service.
 *
 * The selector is a PURE function over `ScenarioCandidate`s (a frontmatter-only
 * projection) — no filesystem, no config, no React. Adapters
 * (`adapters.ts`) map an authored `Scenario` → `ScenarioCandidate` and an interview
 * `VapiInterviewConfig` → `SelectionCriteria`, so the core stays reusable for other
 * callers (e.g. a future recommendation system that ranks scenarios).
 */

/** The frontmatter fields the selector needs — a lightweight projection. */
export interface ScenarioCandidate {
  slug: string;
  /** Interview types this scenario can serve. Scenario Runtime scenarios are
   *  coding interviews → `["technical"]` today (see `adapters.ts`). */
  interviewTypes: QuestionType[];
  jobRoles: string[];
  category: string;
  type: ScenarioType;
  difficulty: Difficulty;
  languages: string[];
  runtime?: string;
  framework?: string;
  experienceMin: ExperienceLevel;
  experienceMax: ExperienceLevel;
  /** Authoring lifecycle: "draft" | "review" | "verified". */
  status: string;
}

/**
 * What the caller is asking for. `interviewType` is a hard prerequisite; the rest
 * are matched when present and simply not constrained when absent (so today's setup
 * config, which carries no language/category, still selects sensibly).
 */
export interface SelectionCriteria {
  interviewType: QuestionType;
  jobRole?: string;
  difficulty?: Difficulty;
  /** Matched against the candidate's [experienceMin, experienceMax] range. */
  experience?: ExperienceLevel;
  language?: string;
  category?: string;
  scenarioType?: ScenarioType;
  runtime?: string;
  framework?: string;
}

/** The relaxable constraints, named for reporting + priority overrides. */
export type RelaxableConstraint =
  | "category"
  | "scenarioType"
  | "difficulty"
  | "jobRole"
  | "language"
  | "experience"
  | "runtime"
  | "framework";

export interface SelectionOptions {
  /** Recently completed scenario slugs to avoid repeating (soft; applied within the
   *  best-matching tier, with fallback when every best match is recent). */
  exclude?: string[];
  /** Restrict to these authoring statuses (e.g. `["verified", "review"]` in prod).
   *  Omitted → all statuses eligible. */
  eligibleStatuses?: string[];
  /** RNG seam for deterministic tests. Defaults to `Math.random`. */
  random?: () => number;
  /** Relaxation priority, LEAST important first (relaxed first). Defaults to
   *  `DEFAULT_RELAX_PRIORITY`. `experience` should stay last (most protected). */
  priority?: RelaxableConstraint[];
}

/** One scored candidate — the unit a recommendation system can rank on. */
export interface RankedScenario {
  candidate: ScenarioCandidate;
  /** Lexicographic mismatch penalty; 0 = exact match, lower = closer. */
  penalty: number;
  /** Constraints this candidate fails (empty = exact match). */
  relaxed: RelaxableConstraint[];
  /** In the caller's recently-completed `exclude` list. */
  recent: boolean;
}

export interface SelectionResult {
  candidate: ScenarioCandidate;
  penalty: number;
  relaxed: RelaxableConstraint[];
  /** True when every best-tier match was recently completed and a repeat was forced. */
  repeatedRecent: boolean;
}

export type ScenarioSelectionResult =
  | ({ status: "selected" } & SelectionResult)
  | {
      status: "empty";
      reason: "no-role-match" | "no-interview-type-match" | "no-status-match" | "no-candidates";
      message: string;
    };
