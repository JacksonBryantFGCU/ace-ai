"use client";

import { useCallback, useState } from "react";
import { createEvaluationEngine } from "@/lib/scenarios/evaluation/engine";
import { defaultScorers } from "@/lib/scenarios/evaluation/scorers";
import { aiReviewScorer } from "@/lib/scenarios/evaluation/ai-scorer";
import type { EvaluationReport } from "@/lib/scenarios/evaluation/types";
import type { InterviewResult } from "@/lib/scenarios/interview-result";

/** Runtime engine: the deterministic scorers plus the async AI response grader. */
const runtimeEngine = createEvaluationEngine([...defaultScorers, aiReviewScorer]);

/**
 * React binding for the evaluation subsystem. Runs the (async) EvaluationEngine
 * over an `InterviewResult` and holds the resulting report in memory. No
 * persistence — the report lives only for this session.
 */
export function useEvaluation() {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const evaluate = useCallback(async (result: InterviewResult) => {
    setEvaluating(true);
    try {
      const outcome = await runtimeEngine.evaluate(result);
      setReport(outcome);
      return outcome;
    } finally {
      setEvaluating(false);
    }
  }, []);

  return { report, evaluating, evaluate };
}
