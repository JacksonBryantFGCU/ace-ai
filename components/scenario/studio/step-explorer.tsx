"use client";

import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CodeViewer } from "@/components/scenario/studio/code-viewer";
import { cn } from "@/lib/utils";
import type { Scenario, ScenarioStep } from "@/lib/scenarios/schema";

const KIND_TONE = {
  implement: "success",
  debug: "danger",
  refactor: "warning",
  explain: "info",
} as const;

/** Files authored under `solution/<stepId>/` — the reference solution for a step. */
function solutionFiles(files: Record<string, string>, stepId: string): string[] {
  return Object.keys(files)
    .filter((p) => p.startsWith(`solution/${stepId}/`))
    .sort();
}

/**
 * Step Explorer — browse every authored step and its full grading contract:
 * prompt, hints, checkpoint, rubric, expected outcome (tests), and the authored
 * reference solution. Read-only; authored content is immutable (frozen §4).
 */
export function StepExplorer({
  scenario,
  files,
  selectedIndex,
  onSelectIndex,
}: {
  scenario: Scenario;
  files: Record<string, string>;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  const step = scenario.steps[selectedIndex] ?? scenario.steps[0]!;
  const testFiles = step.verify.tests ?? [];
  const solFiles = solutionFiles(files, step.id);
  const relatedFiles = [...testFiles, ...solFiles];
  const [openFile, setOpenFile] = useState<string | null>(null);
  const activeFile = openFile && relatedFiles.includes(openFile) ? openFile : (relatedFiles[0] ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      {/* Step list */}
      <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-x-visible">
        {scenario.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectIndex(i)}
            aria-current={i === selectedIndex}
            className={cn(
              "flex shrink-0 flex-col gap-0.5 rounded-md border px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
              i === selectedIndex ? "border-blue-400/60 bg-blue-500/10" : "border-white/10 hover:bg-white/5",
            )}
          >
            <span className="text-xs text-gray-500">
              Step {i + 1} · {s.weight}%
            </span>
            <span className="text-sm font-medium text-gray-100">{s.id}</span>
            <StatusBadge tone={KIND_TONE[s.kind]}>{s.kind}</StatusBadge>
          </button>
        ))}
      </nav>

      {/* Step detail */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <StepMeta step={step} />

        <Section title="Prompt">
          <Markdown headingBaseLevel={4}>{step.prompt}</Markdown>
        </Section>

        {step.hints?.length ? (
          <Section title={`Hints (${step.hints.length})`}>
            <ol className="ml-4 list-decimal space-y-1 text-sm text-gray-300">
              {step.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          </Section>
        ) : null}

        {step.checkpoint ? (
          <Section title="Checkpoint">
            <p className="mb-1 text-xs text-gray-500">Restores these files on request:</p>
            <ul className="flex flex-wrap gap-1">
              {step.checkpoint.files.map((f) => (
                <li key={f}>
                  <Badge className="font-mono">{f}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {step.rubric?.length ? (
          <Section title="Rubric">
            <ul className="space-y-1.5">
              {step.rubric.map((c, i) => (
                <li key={i} className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-200">{c.criterion}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{c.weight}%</span>
                  </div>
                  <p className="text-xs text-gray-500">{c.detail}</p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {relatedFiles.length ? (
          <Section title="Expected outcome & solution">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {relatedFiles.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOpenFile(f)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
                    f === activeFile
                      ? "border-blue-400/60 bg-blue-500/10 text-blue-200"
                      : "border-white/15 text-gray-400 hover:bg-white/5",
                  )}
                >
                  {f.startsWith("tests/") ? "🧪 " : "✓ "}
                  {f}
                </button>
              ))}
            </div>
            <div className="flex h-72 flex-col overflow-hidden rounded-md border border-white/10 bg-black/30">
              <CodeViewer path={activeFile} content={activeFile ? files[activeFile] ?? "" : null} />
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function StepMeta({ step }: { step: ScenarioStep }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={KIND_TONE[step.kind]}>{step.kind}</StatusBadge>
      <Badge>verification: {step.verification}</Badge>
      <Badge>harness: {step.verify.harness}</Badge>
      {step.verify.functionName ? <Badge className="font-mono">fn: {step.verify.functionName}</Badge> : null}
      <Badge>weight: {step.weight}%</Badge>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">{title}</h3>
      {children}
    </section>
  );
}
