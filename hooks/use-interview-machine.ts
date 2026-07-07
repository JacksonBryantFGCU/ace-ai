"use client";

import { useMemo, useReducer } from "react";
import {
  canRevealHint,
  currentStep,
  initInterview,
  interviewReducer,
  isComplete,
  isLastStep,
  passedCount,
  type StepDescriptor,
  type StepStatus,
} from "@/lib/scenarios/interview-machine";

/**
 * React binding for the pure interview state machine. The machine IS the
 * reducer; this hook just wires it to `useReducer` and exposes stable action
 * dispatchers + a few derived selectors. All progression logic stays in
 * `lib/scenarios/interview-machine.ts`.
 */
export function useInterviewMachine(steps: StepDescriptor[]) {
  const [state, dispatch] = useReducer(interviewReducer, steps, initInterview);

  const actions = useMemo(
    () => ({
      // candidate / system
      revealHint: () => dispatch({ type: "reveal-hint" as const }),
      recordResult: (passed: boolean) => dispatch({ type: "record-result" as const, passed }),
      setResponse: (text: string) => dispatch({ type: "set-response" as const, text }),
      offerCheckpoint: (stepId: string) => dispatch({ type: "offer-checkpoint" as const, stepId }),
      declineCheckpoint: (stepId: string) => dispatch({ type: "decline-checkpoint" as const, stepId }),
      applyCheckpoint: (stepId: string, priorStatus: StepStatus) =>
        dispatch({ type: "apply-checkpoint" as const, stepId, priorStatus }),
      goTo: (index: number) => dispatch({ type: "go-to" as const, index }),
      next: () => dispatch({ type: "next" as const }),
      prev: () => dispatch({ type: "prev" as const }),
      complete: () => dispatch({ type: "complete" as const }),
      // interviewer controls (stable; wired as needed later)
      pause: () => dispatch({ type: "pause" as const }),
      resume: () => dispatch({ type: "resume" as const }),
      restartStep: () => dispatch({ type: "restart-step" as const }),
      overrideResult: (passed: boolean) => dispatch({ type: "override-result" as const, passed }),
    }),
    [],
  );

  const derived = useMemo(
    () => ({
      current: currentStep(state),
      passed: passedCount(state),
      complete: isComplete(state),
      lastStep: isLastStep(state),
      canHint: canRevealHint(state),
    }),
    [state],
  );

  return { state, ...derived, actions };
}

export type InterviewMachineApi = ReturnType<typeof useInterviewMachine>;
