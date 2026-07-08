import type { Scenario } from "@/lib/scenarios/schema";
import type { QuestionType, VapiInterviewConfig } from "@/types/interview";
import type { ScenarioCandidate, SelectionCriteria } from "@/lib/scenarios/selection/types";
import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";

/**
 * Adapters between the app's domain types and the pure selector. Kept apart from
 * `select-scenario.ts` so the core selector never imports the scenario schema or
 * the interview config — it stays reusable for any caller.
 */

/**
 * Which interview types a scenario can serve. Frontmatter has no explicit
 * `interviewType` field; Scenario Runtime scenarios are coding interviews, so they
 * serve the `technical` type. Kept as a function (not an inline constant) so it
 * stays scenario-agnostic — when behavioral/system-design scenarios exist, widen
 * this to read from the passed `scenario` (harness/kind) with no selector change.
 */
export function deriveInterviewTypes(scenario: Scenario): QuestionType[] {
  void scenario; // reserved: derivation becomes frontmatter-driven when types grow
  return ["technical"];
}

/** Project an authored `Scenario` down to the selector's frontmatter-only view. */
export function scenarioToCandidate(scenario: Scenario, slug: string): ScenarioCandidate {
  return {
    slug,
    interviewTypes: deriveInterviewTypes(scenario),
    jobRoles: [...scenario.jobRoles],
    category: scenario.category,
    type: scenarioTypeOf(scenario),
    difficulty: scenario.difficulty,
    languages: [...scenario.stack.languages],
    runtime: scenario.runtime,
    framework: scenario.framework,
    experienceMin: scenario.experienceMin,
    experienceMax: scenario.experienceMax,
    status: scenario.status,
  };
}

/**
 * Build selection criteria from the interview setup config. The config carries
 * role, difficulty, experience, and question type today; `language` and `category`
 * aren't captured at setup yet, so they're left unconstrained (the selector treats
 * absent criteria as "no constraint"). Adding them to setup later activates those
 * dimensions with no selector change.
 */
export function criteriaFromConfig(config: VapiInterviewConfig): SelectionCriteria {
  return {
    interviewType: config.questionType,
    jobRole: config.role,
    difficulty: config.difficulty,
    experience: config.experience,
    scenarioType: config.role === "fullstack" ? "fullstack" : undefined,
  };
}
