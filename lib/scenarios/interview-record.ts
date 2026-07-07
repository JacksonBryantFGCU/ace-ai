import type { EvaluationReport } from "@/lib/scenarios/evaluation/types";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { SnapshotFile } from "@/lib/scenarios/verification";
import type {
  CodeSubmission,
  ProgrammingLanguage,
  TranscriptEntry,
  VapiAnalysisResult,
} from "@/types/interview";

/**
 * Map a Scenario Runtime `EvaluationReport` (+ the raw conversation and final
 * workspace) into the persisted interview record shape used by Past Interviews,
 * the dashboard, and analytics — the same `VapiAnalysisResult` / transcript /
 * submissions the legacy voice interviews store. This is the single adapter
 * between the two evaluation models; everything downstream already reads this shape.
 */

/** Percentage (0–100) for a report dimension, or null when it has no positive max. */
function dimensionPct(report: EvaluationReport, id: string): number | null {
  const d = report.dimensions.find((dim) => dim.id === id);
  return d && d.max > 0 ? Math.round((d.score / d.max) * 100) : null;
}

/** Did every automated-testable step pass? (drives the submission "passed" flag). */
function automatedAllPassed(report: EvaluationReport): boolean {
  const auto = report.dimensions.find((d) => d.id === "automated-tests");
  return !!auto && auto.max > 0 && auto.score === auto.max;
}

export function reportToAnalysisResult(report: EvaluationReport): VapiAnalysisResult {
  const overall = report.overallScore;
  return {
    score: overall,
    communication: dimensionPct(report, "communication") ?? overall,
    technicalAccuracy: dimensionPct(report, "automated-tests") ?? overall,
    problemSolving: dimensionPct(report, "ai-review") ?? overall,
    strengths: report.strengths,
    improvements: report.improvements,
    nextSteps: report.nextSteps,
    questionBreakdown: report.stepBreakdown.map((s) => ({
      question: s.stepId,
      candidateAnswer: "",
      score: s.autoScored && s.weight > 0 ? Math.round((s.earned / s.weight) * 100) : 0,
      feedback: s.note,
    })),
  };
}

/** Conversation utterances → the persisted transcript shape (system turns dropped). */
export function conversationToTranscript(conversation: ConversationEntry[]): TranscriptEntry[] {
  return conversation
    .filter(
      (e): e is Extract<ConversationEntry, { kind: "utterance" }> => e.kind === "utterance" && e.final,
    )
    .map((e) => ({
      role: e.role === "candidate" ? ("user" as const) : ("assistant" as const),
      text: e.text,
      timestamp: e.at,
    }));
}

function languageFor(path: string): ProgrammingLanguage {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "py") return "python";
  if (ext === "java") return "java";
  if (ext === "cpp" || ext === "cc" || ext === "cxx") return "cpp";
  if (ext === "sh" || ext === "bash") return "bash";
  return "typescript";
}

/** The candidate's editable files as code submissions (readonly seed files skipped). */
export function workspaceToSubmissions(
  report: EvaluationReport,
  files: readonly SnapshotFile[],
  scenarioTitle: string,
): CodeSubmission[] {
  const passed = automatedAllPassed(report);
  return files
    .filter((f) => f.role !== "readonly")
    .map((f) => ({
      problemTitle: `${scenarioTitle} — ${f.path}`,
      language: languageFor(f.path),
      code: f.content,
      passed,
    }));
}
