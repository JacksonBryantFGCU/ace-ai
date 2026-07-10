"use client";

import { useCallback, useRef, useState } from "react";
import { runFinalVerification } from "@/actions/scenario";
import type { SnapshotFile, VerificationResult } from "@/lib/scenarios/verification";

/**
 * React binding for FINAL scenario validation (Phase 4 UI over the Phase 3
 * `python-final` verifier) — mirrors `useVerification`'s shape (latest result +
 * `running` flag, run-id guarded against stale in-flight results) but calls the
 * dedicated `runFinalVerification` action instead of the per-step service, since
 * final validation has no `step` to route on.
 */
export function useFinalVerification() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const run = useCallback(async (input: { scenarioSlug: string; files: SnapshotFile[] }): Promise<VerificationResult> => {
    const runId = ++runIdRef.current;
    setRunning(true);
    setResult(null);
    const outcome = await runFinalVerification(input);
    if (runId === runIdRef.current) {
      setResult(outcome);
      setRunning(false);
    }
    return outcome;
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setResult(null);
    setRunning(false);
  }, []);

  return { result, running, run, reset };
}

export type FinalVerificationApi = ReturnType<typeof useFinalVerification>;
