"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScenarioSession } from "@/hooks/use-scenario-session";
import { useInterviewMachine } from "@/hooks/use-interview-machine";
import { useVerification } from "@/hooks/use-verification";
import { useFinalVerification } from "@/hooks/use-final-verification";
import { useMlPreview } from "@/hooks/use-ml-preview";
import { useEvaluation } from "@/hooks/use-evaluation";
import { fetchCheckpoint } from "@/actions/scenario";
import { buildInterviewResult } from "@/lib/scenarios/interview-result";
import { deriveSignals, toSignalScenario } from "@/lib/scenarios/runtime-signal";
import { canAdvanceAfterVerification, resolveVerificationMode } from "@/lib/scenarios/verification-mode";
import type { RuntimeSignal } from "@/lib/scenarios/runtime-signal";
import type { ConversationEntry } from "@/lib/scenarios/conversation";
import type { InterviewContext, InterviewController } from "@/lib/scenarios/interview-controller";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { VerificationResult } from "@/lib/scenarios/verification";

/**
 * The concrete `InterviewController` for a loaded scenario — the SINGLE write path
 * into the runtime. It composes the runtime hooks (session + machine + verification
 * + evaluation), owns the cross-subsystem coordination that used to live inline in
 * `ScenarioWorkspace` (verify→record, checkpoint apply, complete→evaluate), and
 * publishes `RuntimeSignal`s derived purely from the machine's append-only log.
 *
 * Both the on-screen buttons and the (optional) voice client drive the interview
 * through the SAME `controller` object, so there is exactly one way to mutate state.
 * The runtime itself remains unaware any of this exists — the controller only calls
 * the existing pure hooks and derives signals from state; nothing here is voice- or
 * Vapi-specific.
 *
 * The hook also returns the reactive pieces the UI renders; the `controller` subset
 * is the stable, framework-free surface clients hold.
 */
export function useInterviewController(loaded: LoadedScenario) {
  const { scenario } = loaded;
  const session = useScenarioSession(loaded.files, loaded.entry);
  const descriptors = useMemo(
    () => scenario.steps.map((step) => ({ id: step.id, hintCount: step.hints?.length ?? 0 })),
    [scenario.steps],
  );
  const machine = useInterviewMachine(descriptors);
  const verification = useVerification();
  const finalVerification = useFinalVerification();
  const mlPreview = useMlPreview();
  const evaluation = useEvaluation();

  const [verificationByStep, setVerificationByStep] = useState<Record<string, VerificationResult>>({});
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  const signalScenario = useMemo(() => toSignalScenario(loaded), [loaded]);
  const stepVerificationMode = useMemo(() => resolveVerificationMode(scenario, "step"), [scenario]);

  // ── Refs so the STABLE controller closures always read the latest values ─────
  const stateRef = useRef(machine.state);
  const sessionRef = useRef(session);
  const verByStepRef = useRef(verificationByStep);
  const conversationRef = useRef<ConversationEntry[]>([]);
  const subscribersRef = useRef(new Set<(signal: RuntimeSignal) => void>());
  const prevStateRef = useRef(machine.state);
  const startedAtRef = useRef<number | null>(null);
  const evaluatedRef = useRef(false);

  useEffect(() => {
    stateRef.current = machine.state;
    sessionRef.current = session;
  });

  const authoredStep = scenario.steps[machine.state.stepIndex];
  const currentStepId = authoredStep?.id;
  const currentStepIdRef = useRef(currentStepId);
  useEffect(() => {
    currentStepIdRef.current = currentStepId;
  });

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // Each step change starts a clean verification slate (preserves prior behavior).
  const { reset: resetVerification } = verification;
  const stepIndex = machine.state.stepIndex;
  useEffect(() => resetVerification(), [stepIndex, resetVerification]);

  const emit = useCallback((signal: RuntimeSignal) => {
    for (const listener of subscribersRef.current) listener(signal);
  }, []);

  const recordVerification = useCallback((stepId: string, result: VerificationResult) => {
    const next = { ...verByStepRef.current, [stepId]: result };
    verByStepRef.current = next;
    setVerificationByStep(next);
  }, []);

  // Signals are a PURE derivation of the append-only log: whenever it grows (from a
  // button OR a voice intent — the source is irrelevant), derive + publish.
  useEffect(() => {
    const prev = prevStateRef.current;
    if (machine.state.log.length === prev.log.length) return;
    const signals = deriveSignals(prev, machine.state, signalScenario, verByStepRef.current);
    prevStateRef.current = machine.state;
    for (const signal of signals) emit(signal);
  }, [machine.state, signalScenario, emit]);

  // On completion, build the structured result (incl. the conversation record) and
  // hand it to the decoupled evaluation subsystem. Guarded to run once.
  const { evaluate } = evaluation;
  useEffect(() => {
    if (!machine.complete || evaluatedRef.current) return;
    evaluatedRef.current = true;
    const result = buildInterviewResult({
      loaded,
      state: machine.state,
      files: session.session.files.map((f) => ({ path: f.path, content: f.content, role: f.role })),
      verificationByStep: verByStepRef.current,
      conversation: conversationRef.current,
      timings: { startedAt: startedAtRef.current, completedAt: Date.now() },
    });
    void evaluate(result);
  }, [machine.complete, machine.state, session.session.files, loaded, evaluate]);

  const { actions } = machine;
  const { verify } = verification;

  const buildContext = useCallback((): InterviewContext => {
    const state = stateRef.current;
    const def = scenario.steps[state.stepIndex];
    const progress = state.steps[state.stepIndex];
    return {
      scenario: {
        id: scenario.id,
        title: scenario.title,
        summary: scenario.summary,
        difficulty: scenario.difficulty,
      },
      step: def
        ? {
            index: state.stepIndex,
            total: scenario.steps.length,
            id: def.id,
            kind: def.kind,
            prompt: def.prompt,
            hintsAvailable: def.hints?.length ?? 0,
            hintsRevealed: progress?.revealedHints ?? 0,
            verification: def.verification,
            checkpointAvailable: (def.checkpoint?.files.length ?? 0) > 0,
          }
        : null,
      latestVerification: verByStepRef.current[def?.id ?? ""] ?? null,
      phase: state.phase,
    };
  }, [scenario]);

  // The stable controller. Deps are all stable (memoized actions/callbacks + refs),
  // so its identity never changes — clients can hold it across renders.
  const controller = useMemo<InterviewController>(
    () => ({
      revealHint: () => actions.revealHint(),
      setResponse: (text) => actions.setResponse(text),
      runVerification: async () => {
        const step = scenario.steps[stateRef.current.stepIndex];
        if (!step) return;
        const stepId = step.id;
        emit({ type: "VERIFICATION_STARTED", stepId });
        const verifyInput = {
          scenarioSlug: loaded.slug,
          step: {
            id: stepId,
            harness: step.verify.harness,
            functionName: step.verify.functionName,
            tests: step.verify.tests,
            timeoutMs: step.verify.timeoutMs,
          },
          files: sessionRef.current.session.files,
        };
        const result: VerificationResult = await verify(verifyInput);
        recordVerification(stepId, result);
        // Interview state changes ONLY through the result, and only if we're still
        // on the step it was for (a slow engine mustn't record onto a step left).
        const determinate = result.status === "passed" || result.status === "failed";
        if (determinate && currentStepIdRef.current === stepId) {
          actions.recordResult(result.passed);
        }
      },
      offerCheckpoint: () => {
        const step = scenario.steps[stateRef.current.stepIndex];
        if (step) actions.offerCheckpoint(step.id);
      },
      confirmCheckpoint: async () => {
        const step = scenario.steps[stateRef.current.stepIndex];
        if (!step) return;
        const priorStatus = stateRef.current.steps[stateRef.current.stepIndex]?.status ?? "in_progress";
        const files = await fetchCheckpoint(loaded.slug, step.id);
        sessionRef.current.applyCheckpoint(files);
        actions.applyCheckpoint(step.id, priorStatus);
      },
      declineCheckpoint: () => {
        const step = scenario.steps[stateRef.current.stepIndex];
        if (step) actions.declineCheckpoint(step.id);
      },
      next: () => {
        const step = stateRef.current.steps[stateRef.current.stepIndex];
        if (
          (stepVerificationMode === "scenario-step" || stepVerificationMode === "python-step") &&
          step &&
          !canAdvanceAfterVerification(step.status)
        ) {
          return;
        }
        actions.next();
      },
      prev: () => actions.prev(),
      goTo: (index) => {
        const currentIndex = stateRef.current.stepIndex;
        const step = stateRef.current.steps[currentIndex];
        if (
          index > currentIndex &&
          (stepVerificationMode === "scenario-step" || stepVerificationMode === "python-step") &&
          step &&
          !canAdvanceAfterVerification(step.status)
        ) {
          return;
        }
        actions.goTo(index);
      },
      complete: () => actions.complete(),
      subscribe: (listener) => {
        subscribersRef.current.add(listener);
        return () => subscribersRef.current.delete(listener);
      },
      getContext: buildContext,
    }),
    [actions, verify, emit, recordVerification, buildContext, loaded.slug, scenario.steps, stepVerificationMode],
  );

  /** Append to the conversation record (wired to the voice client's onConversation).
   * Kept in a ref (for `buildInterviewResult`, read without re-render) AND mirrored
   * into reactive state so the Conversation panel can render the live transcript. */
  const recordConversation = useCallback((entry: ConversationEntry) => {
    conversationRef.current = [...conversationRef.current, entry];
    setConversation(conversationRef.current);
  }, []);

  // Final validation (Phase 4): NOT part of the `InterviewController` contract
  // (no voice/replay client drives it today) — exposed directly, the same way
  // `verification`/`session` already are, for the final-step UI to call.
  const { run: runFinal } = finalVerification;
  const runFinalVerification = useCallback(async () => {
    await runFinal({
      scenarioSlug: loaded.slug,
      files: sessionRef.current.session.files.map((f) => ({ path: f.path, content: f.content, role: f.role })),
    });
  }, [runFinal, loaded.slug]);

  // ML Output Preview: NOT part of the `InterviewController` contract either —
  // it's a script run, not verification, so it must never call
  // `actions.recordResult`/touch step state. Same exposure pattern as
  // `finalVerification` above.
  const { run: runMlPreviewScript } = mlPreview;
  const runMlPreviewScriptForSession = useCallback(async () => {
    await runMlPreviewScript({
      scenarioSlug: loaded.slug,
      files: sessionRef.current.session.files.map((f) => ({ path: f.path, content: f.content, role: f.role })),
    });
  }, [runMlPreviewScript, loaded.slug]);

  return {
    controller,
    recordConversation,
    conversation,
    machine,
    session,
    verification,
    finalVerification: { ...finalVerification, run: runFinalVerification },
    mlPreview: { ...mlPreview, run: runMlPreviewScriptForSession },
    evaluation,
    verificationByStep,
  };
}

export type InterviewControllerApi = ReturnType<typeof useInterviewController>;
