import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { InterviewResult } from "@/lib/scenarios/interview-result";
import type { StepKind } from "@/lib/scenarios/schema";

/**
 * Evaluation subsystem types. The engine runs a pipeline of `Scorer`s over an
 * `InterviewResult`; each scorer is independent and only reads the result, so new
 * scorers (AI, interviewer, communication, rubric, timing) plug in without any
 * change to the interview runtime or to existing scorers.
 */

export interface ScoreDimension {
  id: string;
  label: string;
  score: number;
  max: number;
  /**
   * Contribution to the overall score. `0` (default) = informational only — it
   * appears in the report but does not move the overall number. Scored dimensions
   * (correctness, and later rubric/AI/communication) use a positive weight.
   */
  weight?: number;
  detail?: string;
}

export interface ScorerOutput {
  dimensions: ScoreDimension[];
  strengths?: string[];
  improvements?: string[];
  nextSteps?: string[];
  notes?: string[];
  meta?: Record<string, unknown>;
}

/** A pluggable scoring stage. Sync or async (AI scorers will be async). */
export interface Scorer {
  readonly id: string;
  readonly label: string;
  score(result: InterviewResult): ScorerOutput | Promise<ScorerOutput>;
}

export interface ReportDimension extends ScoreDimension {
  /** Scorer id that produced this dimension. */
  source: string;
}

export interface StepEvaluation {
  stepId: string;
  kind: StepKind;
  weight: number;
  status: StepStatus;
  /** Weight credited for this step (0 unless auto-scored and passed). */
  earned: number;
  autoScored: boolean;
  note: string;
}

export interface EvaluationReport {
  scenarioSlug: string;
  /** 0–100, weighted over scored dimensions. */
  overallScore: number;
  dimensions: ReportDimension[];
  stepBreakdown: StepEvaluation[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  /** Aspects awaiting a scorer that doesn't exist yet (e.g. rubric/AI review). */
  pending: string[];
  /** Scorer ids that contributed. */
  scorers: string[];
  generatedAt: number;
}

export interface EvaluationEngine {
  evaluate(result: InterviewResult): Promise<EvaluationReport>;
}
