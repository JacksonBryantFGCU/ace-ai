"use client";

import type { CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  LifeBuoy,
  Lightbulb,
  Loader2,
  Play,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { ResponseEditor } from "@/components/scenario/ui/response-editor";
import { VerificationResultCard } from "@/components/scenario/verification-result";
import { shell } from "@/components/scenario/shell/tokens";
import { stepStatusLabel } from "@/components/scenario/ui/step-status";
import type { InterviewMachineApi } from "@/hooks/use-interview-machine";
import type { InterviewController } from "@/lib/scenarios/interview-controller";
import type { ScenarioStep } from "@/lib/scenarios/schema";
import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { VerificationResult } from "@/lib/scenarios/verification";

/** Verification wiring passed down from the shell (which owns coordination). */
export interface VerificationPanelProps {
  supported: boolean;
  mode: "single-file" | "scenario-step";
  running: boolean;
  result: VerificationResult | null;
  onRun: () => void;
  runLabel: string;
  runningLabel: string;
  nextLocked?: boolean;
  nextLockedReason?: string;
}

/** Checkpoint wiring passed down from the shell. */
export interface CheckpointPanelProps {
  available: boolean;
  applied: boolean;
  onUse: () => void;
}

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.13em]";

/** Solid/gradient fill for one progress segment based on its status. */
function segmentStyle(status: StepStatus, isCurrent: boolean): CSSProperties {
  if (status === "passed") return { background: "#10b981" };
  if (status === "failed") return { background: "#ef4444" };
  if (status === "checkpoint_applied") return { background: "#f59e0b" };
  if (isCurrent || status === "in_progress") return { background: "linear-gradient(90deg,#3b82f6,#6366f1)" };
  return { background: "rgba(255,255,255,.09)" };
}

/**
 * The Scenario panel tab: progress, the current step + prompt, progressive hints,
 * the checkpoint ("Stuck?") control, and a pinned footer with Run verification +
 * Prev/Next. Reads machine state but writes ONLY through the shared controller.
 */
export function ScenarioTab({
  steps,
  machine,
  controller,
  verification,
  checkpoint,
}: {
  steps: ScenarioStep[];
  machine: InterviewMachineApi;
  controller: InterviewController;
  verification: VerificationPanelProps;
  checkpoint: CheckpointPanelProps;
}) {
  const { state, current, lastStep, complete } = machine;
  const index = state.stepIndex;
  const total = state.steps.length;
  const authored = steps[index];
  const hints = authored?.hints ?? [];
  const revealed = current?.revealedHints ?? 0;
  const canReveal = revealed < hints.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto p-4">
        {/* Progress */}
        <div>
          <div className="mb-[9px] flex items-center justify-between">
            <span className={SECTION_LABEL} style={{ color: shell.textFaint }}>
              Progress
            </span>
            <span className="text-xs" style={{ color: shell.textMuted }}>
              Step {index + 1} <span style={{ color: shell.textFainter }}>of {total}</span>
            </span>
          </div>
          <ol className="flex gap-1.5" aria-label="Interview progress">
            {state.steps.map((step, i) => (
              <li key={step.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => controller.goTo(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${stepStatusLabel(step.status)}`}
                  className="h-[5px] w-full rounded-full transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                  style={segmentStyle(step.status, i === index)}
                />
              </li>
            ))}
          </ol>
        </div>

        {authored ? (
          <div key={index} className="step-enter flex flex-col gap-[18px]">
            {/* Step + prompt */}
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-white capitalize">{authored.kind}</h2>
                {current ? (
                  <span
                    className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold"
                    style={{ background: shell.infoBg, color: shell.infoText }}
                  >
                    {stepStatusLabel(current.status)}
                  </span>
                ) : null}
              </div>
              <div
                className="markdown-body rounded-xl px-[15px] py-3.5 text-[13.5px] leading-[1.6]"
                style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", color: shell.text }}
              >
                <Markdown headingBaseLevel={3}>{authored.prompt}</Markdown>
              </div>
            </div>

            {/* Rubric-only steps are reviewed outside the single-file verifier. */}
            {!verification.supported ? (
              <div>
                <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                  Your response
                </span>
                <p className="mb-2 text-xs" style={{ color: shell.textFainter }}>
                  This step is reviewed against the rubric.
                </p>
                {current ? (
                  <ResponseEditor
                    key={current.id}
                    initialValue={current.response}
                    onSave={controller.setResponse}
                  />
                ) : null}
              </div>
            ) : null}

            {/* Hints */}
            {hints.length > 0 ? (
              <div>
                <div className="mb-[9px] flex items-center justify-between">
                  <span className={SECTION_LABEL} style={{ color: shell.textFaint }}>
                    Hints
                  </span>
                  <span className="text-xs" style={{ color: shell.textFainter }}>
                    {revealed} of {hints.length} revealed
                  </span>
                </div>
                {revealed > 0 ? (
                  <ul>
                    {hints.slice(0, revealed).map((hint, i) => (
                      <li
                        key={i}
                        className="mb-2 flex gap-2 rounded-[10px] px-[11px] py-[9px] text-[12.5px] leading-[1.5]"
                        style={{ background: shell.hintBg, border: `1px solid ${shell.hintBorder}`, color: shell.hintText }}
                      >
                        <Lightbulb className="mt-[1px] size-3.5 flex-none" style={{ color: shell.hintIcon }} />
                        <span>
                          <strong style={{ color: shell.hintStrong }}>Hint {i + 1}.</strong> {hint}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  onClick={controller.revealHint}
                  disabled={!canReveal}
                  className="flex w-full items-center justify-center gap-2 rounded-[9px] p-[9px] text-[13px] font-medium transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: shell.hintButtonBg, border: `1px solid ${shell.hintButtonBorder}`, color: shell.hintIcon }}
                >
                  <Lightbulb className="size-[15px]" />
                  {canReveal ? "Reveal a hint" : "No more hints"}
                </button>
              </div>
            ) : null}

            {/* Stuck? / checkpoint */}
            {checkpoint.available ? (
              <div>
                <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                  Stuck?
                </span>
                {checkpoint.applied ? (
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: "#fcd34d" }}>
                    <LifeBuoy className="size-3.5" /> Checkpoint applied — workspace restored.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={checkpoint.onUse}
                    className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-dashed p-[9px] text-[13px] font-medium transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    style={{ borderColor: "rgba(255,255,255,.14)", color: "#a8b0bd" }}
                  >
                    <Crosshair className="size-[15px]" />
                    Use a checkpoint
                  </button>
                )}
              </div>
            ) : null}

            {/* Verification result */}
            {verification.result ? (
              <div>
                <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
                  Result
                </span>
                {verification.mode === "scenario-step" ? (
                  <p className="mb-2 text-xs" style={{ color: shell.textFainter }}>
                    {verification.result.status === "passed"
                      ? "Step checks passed."
                      : verification.result.status === "failed" || verification.result.status === "errored"
                        ? "Step checks failed."
                        : verification.result.message}
                  </p>
                ) : null}
                <VerificationResultCard result={verification.result} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Pinned footer */}
      <div
        className="flex flex-none flex-col gap-[11px] p-4"
        style={{ background: shell.panelFooterBg, borderTop: `1px solid ${shell.border}` }}
      >
        {verification.supported ? (
          <button
            type="button"
            onClick={verification.onRun}
            disabled={verification.running}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] p-[11px] text-sm font-semibold text-white transition-[filter] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: shell.runGradient, boxShadow: shell.runShadow }}
          >
            {verification.running ? (
              <Loader2 className="size-[15px] animate-spin" />
            ) : (
              <Play className="size-[15px] fill-current" />
            )}
            {verification.running ? verification.runningLabel : verification.runLabel}
          </button>
        ) : null}

        {verification.nextLocked ? (
          <p className="text-xs" style={{ color: shell.textFainter }}>
            {verification.nextLockedReason}
          </p>
        ) : null}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={controller.prev}
            disabled={index === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] p-[9px] text-[13px] font-medium transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ border: "1px solid rgba(255,255,255,.12)", color: shell.textFaint }}
          >
            <ChevronLeft className="size-[15px]" /> Prev
          </button>
          <button
            type="button"
            onClick={controller.next}
            disabled={complete || verification.nextLocked}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] p-[9px] text-[13px] font-semibold text-white transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: shell.nextBg }}
          >
            {lastStep ? "Finish" : "Next"} <ChevronRight className="size-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
