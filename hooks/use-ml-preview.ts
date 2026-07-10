"use client";

import { useCallback, useRef, useState } from "react";
import { runMlPreview } from "@/actions/scenario";
import type { MlScriptPreviewResult } from "@/lib/scenarios/machine-learning-preview";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * React binding for the ML "Output Preview" run — mirrors `useFinalVerification`'s
 * shape (latest result + `running` flag, run-id guarded against stale in-flight
 * results). Deliberately separate from `useVerification`/`useFinalVerification`:
 * a preview run is not verification and must never be confused with a
 * `VerificationResult` (different result type entirely, no `status`/`passed`).
 */
export function useMlPreview() {
  const [result, setResult] = useState<MlScriptPreviewResult | null>(null);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const run = useCallback(async (input: { scenarioSlug: string; files: SnapshotFile[] }): Promise<MlScriptPreviewResult> => {
    const runId = ++runIdRef.current;
    setRunning(true);
    setResult(null);
    const outcome = await runMlPreview(input);
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

export type MlPreviewApi = ReturnType<typeof useMlPreview>;
