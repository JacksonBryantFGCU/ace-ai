"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Square } from "lucide-react";
import { useInterviewController } from "@/hooks/use-interview-controller";
import { saveScenarioInterview } from "@/actions/interview";
import {
  conversationToTranscript,
  reportToAnalysisResult,
  workspaceToSubmissions,
} from "@/lib/scenarios/interview-record";
import type { VapiInterviewConfig } from "@/types/interview";
import { InterviewTopBar } from "@/components/scenario/shell/interview-top-bar";
import { InterviewerPresence } from "@/components/scenario/shell/interviewer-presence";
import { ActivityRail, type PanelTab } from "@/components/scenario/shell/activity-rail";
import { SidePanel } from "@/components/scenario/shell/side-panel";
import { ScenarioTab } from "@/components/scenario/shell/scenario-tab";
import { ExplorerTab } from "@/components/scenario/shell/explorer-tab";
import { ConversationTab } from "@/components/scenario/shell/conversation-tab";
import { EditorColumn } from "@/components/scenario/shell/editor-column";
import { PreviewPanel } from "@/components/scenario/preview-panel";
import { CheckpointDialog } from "@/components/scenario/checkpoint-dialog";
import { EvaluationReport } from "@/components/scenario/evaluation-report";
import { EvaluationSkeleton } from "@/components/scenario/ui/evaluation-skeleton";
import { Timer } from "@/components/ui/timer";
import { shell } from "@/components/scenario/shell/tokens";
import { getInterviewer } from "@/lib/constants";
import type { LoadedScenario } from "@/lib/scenarios/types";

const PANEL_TITLE: Record<PanelTab, string> = {
  explorer: "Explorer",
  scenario: "Scenario",
  conversation: "Conversation",
};

/**
 * The full candidate experience for ONE loaded scenario, rendered as a VS Code–
 * style shell: a top bar (identity + live interviewer + timer), an activity rail
 * that toggles a single left panel (Explorer / Scenario / Conversation), and the
 * dominant editor column. Reused by both the dev playground and the real
 * authenticated interview route.
 *
 * All runtime coordination lives in `useInterviewController`; this component owns
 * only presentation + shell UI state (active tab, panel open, checkpoint dialog).
 * Buttons and the (optional) voice presence drive the interview through the SAME
 * `controller`, so there is a single write path into the runtime.
 *
 * Voice is strictly additive: pass `voice={false}` and the top bar simply omits the
 * interviewer presence; the interview behaves exactly as it did before voice.
 */
export function ScenarioWorkspace({
  loaded,
  onRestart,
  voice = true,
  autoStartVoice = false,
  limitMinutes,
  saveConfig,
}: {
  loaded: LoadedScenario;
  onRestart?: () => void;
  /** Show the optional voice presence in the top bar. */
  voice?: boolean;
  /** Auto-start the voice call on mount (so it begins with the timer, no click). */
  autoStartVoice?: boolean;
  /** Strict time cap in minutes. When set, the timer counts down and auto-ends
   *  the interview at zero (no cap → informational count-up, e.g. the playground). */
  limitMinutes?: number;
  /** When set (real interview), the completed result is persisted so it appears in
   *  Past Interviews, the dashboard, and analytics. Omitted in the dev playground. */
  saveConfig?: VapiInterviewConfig;
}) {
  const { scenario } = loaded;
  const { controller, recordConversation, conversation, machine, session, verification, evaluation } =
    useInterviewController(loaded);

  const stepIndex = machine.state.stepIndex;
  const authoredStep = scenario.steps[stepIndex];
  const interviewerName = getInterviewer(undefined).name;

  const [activeTab, setActiveTab] = useState<PanelTab>("scenario");
  const [panelOpen, setPanelOpen] = useState(true);
  // The interview is complete (Finish or time-up) but the candidate has not yet
  // hit the hard "End interview" gate. Until they do, results stay hidden and the
  // voice interviewer keeps running; ending unmounts the presence (stopping the
  // call) and reveals the analytics.
  const [ended, setEnded] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const savedRef = useRef(false);

  // Persist the finished interview ONCE, when it has ended and the graded report is
  // ready — so it shows up in Past Interviews, the dashboard, and analytics. Only
  // the real interview passes `saveConfig`; the playground never persists.
  useEffect(() => {
    if (!saveConfig || !ended || savedRef.current) return;
    const report = evaluation.report;
    if (!report) return; // wait for grading to finish
    savedRef.current = true;
    const completedAt = Date.now();
    void saveScenarioInterview({
      config: saveConfig,
      result: reportToAnalysisResult(report),
      transcript: conversationToTranscript(conversation),
      submissions: workspaceToSubmissions(report, session.session.files, scenario.title),
      metrics: {
        startedAt,
        completedAt,
        durationMs: completedAt - startedAt,
        questionCount: report.stepBreakdown.length,
      },
    });
  }, [saveConfig, ended, evaluation.report, conversation, session, scenario.title, startedAt]);

  // Checkpoint dialog is presentation state (the runtime effects go through the
  // controller).
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [checkpointApplying, setCheckpointApplying] = useState(false);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);

  const onRun = useCallback(() => void controller.runVerification(), [controller]);

  const selectTab = useCallback((tab: PanelTab) => {
    setActiveTab((current) => {
      if (current === tab) {
        setPanelOpen((open) => !open);
        return current;
      }
      setPanelOpen(true);
      return tab;
    });
  }, []);

  const openCheckpoint = useCallback(() => {
    controller.offerCheckpoint();
    setCheckpointError(null);
    setCheckpointOpen(true);
  }, [controller]);

  const cancelCheckpoint = useCallback(() => {
    controller.declineCheckpoint();
    setCheckpointOpen(false);
  }, [controller]);

  const confirmCheckpoint = useCallback(async () => {
    setCheckpointApplying(true);
    setCheckpointError(null);
    try {
      await controller.confirmCheckpoint();
      setCheckpointOpen(false);
    } catch (e) {
      setCheckpointError(e instanceof Error ? e.message : "Failed to apply checkpoint.");
    } finally {
      setCheckpointApplying(false);
    }
  }, [controller]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: shell.appBg, color: shell.text }}
    >
      <InterviewTopBar
        title={scenario.title}
        category={scenario.category}
        difficulty={scenario.difficulty}
        timer={
          limitMinutes != null ? (
            <Timer limitMinutes={limitMinutes} onExpire={controller.complete} />
          ) : (
            <Timer estimatedMinutes={scenario.estimatedMinutes} />
          )
        }
        presence={
          voice && !ended ? (
            <InterviewerPresence
              controller={controller}
              onConversation={recordConversation}
              interviewerName={interviewerName}
              autoStart={autoStartVoice}
            />
          ) : undefined
        }
        onRestart={onRestart}
      />

      {machine.complete && ended ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {evaluation.report ? (
            <EvaluationReport report={evaluation.report} />
          ) : (
            <EvaluationSkeleton />
          )}
        </div>
      ) : machine.complete ? (
        <EndGate onEnd={() => setEnded(true)} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <ActivityRail activeTab={activeTab} panelOpen={panelOpen} onSelect={selectTab} />

          {panelOpen ? (
            <SidePanel title={PANEL_TITLE[activeTab]} onCollapse={() => setPanelOpen(false)}>
              {activeTab === "scenario" ? (
                <ScenarioTab
                  steps={scenario.steps}
                  machine={machine}
                  controller={controller}
                  verification={{
                    supported: (authoredStep?.verify.harness ?? "none") !== "none",
                    running: verification.running,
                    result: verification.result,
                    onRun,
                  }}
                  checkpoint={{
                    available: (authoredStep?.checkpoint?.files.length ?? 0) > 0,
                    applied: machine.current?.status === "checkpoint_applied",
                    onUse: openCheckpoint,
                  }}
                />
              ) : activeTab === "explorer" ? (
                <ExplorerTab api={session} />
              ) : (
                <ConversationTab conversation={conversation} interviewerName={interviewerName} />
              )}
            </SidePanel>
          ) : null}

          <EditorColumn api={session} />

          <PreviewPanel loaded={loaded} files={session.session.files} />
        </div>
      )}

      <CheckpointDialog
        open={checkpointOpen}
        stepLabel={`Step ${stepIndex + 1}`}
        applying={checkpointApplying}
        error={checkpointError}
        onCancel={cancelCheckpoint}
        onConfirm={() => void confirmCheckpoint()}
      />
    </div>
  );
}

/**
 * The hard end-of-interview gate. Shown once the interview completes and BEFORE
 * the analytics: it's a deliberate stop so the candidate ends the (still-running)
 * voice interview themselves. Confirming reveals the results and — because the
 * parent stops rendering the interviewer presence — tears down the voice call, so
 * the interviewer isn't still talking over the report.
 */
function EndGate({ onEnd }: { onEnd: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div
        className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-8 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">You&apos;ve reached the end</h2>
          <p className="text-sm text-gray-400">
            End the interview to stop your interviewer and see your results. This can&apos;t be
            undone.
          </p>
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          <Square className="size-4 fill-current" />
          End interview &amp; view results
        </button>
      </div>
    </div>
  );
}
