"use client";

import { useCallback, useRef, useState } from "react";
import { verificationService } from "@/lib/scenarios/verification-engines";
import type { VerificationResult, VerificationService, VerifyInput } from "@/lib/scenarios/verification";

/**
 * React binding for the verification service. Holds the latest result + a
 * `running` flag. Every `verify()` is independent: the previous result is cleared
 * at the start, and a run-id guard drops any stale in-flight result if a newer
 * run (or a step change) supersedes it. The UI stays decoupled from the harness.
 */
export function useVerification(service: VerificationService = verificationService) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const verify = useCallback(
    async (input: VerifyInput): Promise<VerificationResult> => {
      const runId = ++runIdRef.current;
      setRunning(true);
      setResult(null);
      const outcome = await service.verify(input);
      if (runId === runIdRef.current) {
        setResult(outcome);
        setRunning(false);
      }
      return outcome;
    },
    [service],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1; // invalidate any in-flight run
    setResult(null);
    setRunning(false);
  }, []);

  return { result, running, verify, reset };
}

export type VerificationApi = ReturnType<typeof useVerification>;
