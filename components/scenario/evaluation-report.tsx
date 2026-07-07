"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, CircleDashed, Clock, LifeBuoy, Lightbulb, XCircle } from "lucide-react";
import type { StepStatus } from "@/lib/scenarios/interview-machine";
import type { EvaluationReport as Report, StepEvaluation } from "@/lib/scenarios/evaluation/types";

/**
 * Renders an EvaluationReport. Reads only the typed report — it knows nothing
 * about scorers or the runtime, so new scorers/dimensions render automatically.
 */
export function EvaluationReport({ report }: { report: Report }) {
  const scored = report.dimensions.filter((d) => (d.weight ?? 0) > 0);
  const informational = report.dimensions.filter((d) => (d.weight ?? 0) === 0);

  // Move keyboard focus to the report heading when it appears, so completion isn't
  // a silent context switch for keyboard/screen-reader users.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 py-2">
        {/* Overall */}
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-black/20 p-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-blue-500/40 text-2xl font-bold text-white">
            {report.overallScore}
          </div>
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white outline-none">
              Interview complete
            </h2>
            <p className="text-sm text-gray-400">
              Overall {report.overallScore}/100 · scored by {report.scorers.join(", ")}
            </p>
          </div>
        </div>

        {/* Scored dimensions */}
        {scored.length > 0 ? (
          <Section title="Scored dimensions">
            <ul className="space-y-2">
              {scored.map((d) => (
                <li key={`${d.source}:${d.id}`} className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-200">
                    <span>{d.label}</span>
                    <span className="text-gray-400">
                      {d.score}/{d.max}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${d.max > 0 ? Math.round((d.score / d.max) * 100) : 0}%` }}
                    />
                  </div>
                  {d.detail ? <p className="text-xs text-gray-500">{d.detail}</p> : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* Step breakdown */}
        <Section title="Step breakdown">
          <ul className="divide-y divide-white/5">
            {report.stepBreakdown.map((s) => (
              <StepRow key={s.stepId} step={s} />
            ))}
          </ul>
        </Section>

        {/* Qualitative */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ListCard title="Strengths" items={report.strengths} tone="green" />
          <ListCard title="Improvements" items={report.improvements} tone="amber" />
        </div>
        <ListCard title="Next steps" items={report.nextSteps} tone="blue" />

        {/* Informational + pending */}
        {informational.length > 0 ? (
          <Section title="Process signals">
            <ul className="flex flex-wrap gap-2">
              {informational.map((d) => (
                <li
                  key={`${d.source}:${d.id}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                >
                  <ProcessIcon id={d.id} />
                  {d.label}: {d.detail ?? `${d.score}/${d.max}`}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {report.pending.length > 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Pending review
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              {report.pending.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <CircleDashed className="mt-0.5 size-3.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: StepEvaluation }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <StatusIcon status={step.status} autoScored={step.autoScored} />
      <span className="font-medium text-gray-100">{step.stepId}</span>
      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-gray-400">
        {step.kind}
      </span>
      <span className="ml-auto text-gray-400">
        {step.autoScored ? `${step.earned}/${step.weight}` : "—"}
      </span>
      <span className="hidden w-56 shrink-0 text-right text-xs text-gray-500 sm:block">{step.note}</span>
    </li>
  );
}

function StatusIcon({ status, autoScored }: { status: StepStatus; autoScored: boolean }) {
  if (!autoScored) return <CircleDashed className="size-4 shrink-0 text-gray-500" />;
  if (status === "passed") return <CheckCircle2 className="size-4 shrink-0 text-green-400" />;
  if (status === "checkpoint_applied") return <LifeBuoy className="size-4 shrink-0 text-amber-400" />;
  return <XCircle className="size-4 shrink-0 text-red-400" />;
}

function ProcessIcon({ id }: { id: string }) {
  if (id === "hints") return <Lightbulb className="size-3.5 text-amber-300" />;
  if (id === "checkpoints") return <LifeBuoy className="size-3.5 text-amber-300" />;
  if (id === "timing") return <Clock className="size-3.5 text-gray-400" />;
  return <CircleDashed className="size-3.5 text-gray-400" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "blue";
}) {
  const dot =
    tone === "green" ? "bg-green-400" : tone === "amber" ? "bg-amber-400" : "bg-blue-400";
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h3 className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-gray-200">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">None noted.</p>
      )}
    </div>
  );
}
