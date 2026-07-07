"use client";

import { Download, Play, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatScenarioReport } from "@/lib/scenarios/authoring/report";
import { locateDiagnostic } from "@/components/scenario/studio/locate";
import type { DiagnosticTarget } from "@/components/scenario/studio/locate";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Diagnostic, DiagnosticLevel, ScenarioReport } from "@/lib/scenarios/authoring/types";

const ORDER: DiagnosticLevel[] = ["error", "warning", "suggestion", "performance", "best-practice"];
const HEADING: Record<DiagnosticLevel, string> = {
  error: "Errors",
  warning: "Warnings",
  suggestion: "Suggestions",
  performance: "Performance notes",
  "best-practice": "Missing best practices",
};
const LEVEL_STYLE: Record<DiagnosticLevel, string> = {
  error: "border-red-500/30 bg-red-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  suggestion: "border-blue-500/30 bg-blue-500/5",
  performance: "border-purple-500/30 bg-purple-500/5",
  "best-practice": "border-white/15 bg-white/[0.02]",
};
const LEVEL_TEXT: Record<DiagnosticLevel, string> = {
  error: "text-red-300",
  warning: "text-amber-300",
  suggestion: "text-blue-300",
  performance: "text-purple-300",
  "best-practice": "text-gray-300",
};

function downloadReport(report: ScenarioReport) {
  const text = formatScenarioReport(report);
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.slug}-validation.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validation Panel — renders a `ScenarioReport` grouped by level (errors →
 * warnings → suggestions → perf → best-practices). Each diagnostic is a button
 * that navigates to the affected step/file. Includes actions to re-run static
 * validation, run the solution against tests, and export the report.
 */
export function ValidationPanel({
  report,
  running,
  runningSolution,
  onRunStatic,
  onRunSolution,
  onNavigate,
}: {
  report: ScenarioReport | null;
  running: boolean;
  runningSolution: boolean;
  onRunStatic: () => void;
  onRunSolution: () => void;
  onNavigate: (target: DiagnosticTarget) => void;
}) {
  const byLevel = new Map<DiagnosticLevel, Diagnostic[]>();
  for (const d of report?.diagnostics ?? []) {
    byLevel.set(d.level, [...(byLevel.get(d.level) ?? []), d]);
  }
  const errorCount = byLevel.get("error")?.length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRunStatic}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          <RefreshCw className={cn("size-3.5", running && "animate-spin")} /> Re-validate
        </button>
        <button
          type="button"
          onClick={onRunSolution}
          disabled={runningSolution}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          <Play className={cn("size-3.5", runningSolution && "animate-pulse")} />
          {runningSolution ? "Running solution…" : "Run solution vs tests"}
        </button>
        {report ? (
          <button
            type="button"
            onClick={() => downloadReport(report)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
          >
            <Download className="size-3.5" /> Export report
          </button>
        ) : null}
        {report ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              report.ok ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300",
            )}
          >
            {report.ok ? <CheckCircle2 className="size-3.5" /> : null}
            {report.ok ? "Production-ready" : `${errorCount} error${errorCount === 1 ? "" : "s"}`}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!report ? (
          <EmptyState icon={RefreshCw} title="Not validated yet" description="Run validation to see errors, warnings, and suggestions." />
        ) : report.diagnostics.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No issues found" description="This scenario passes every static and solution check." />
        ) : (
          <div className="flex flex-col gap-4">
            {ORDER.filter((l) => byLevel.get(l)?.length).map((level) => (
              <section key={level}>
                <h3 className={cn("mb-1.5 text-xs font-semibold tracking-wide uppercase", LEVEL_TEXT[level])}>
                  {HEADING[level]} ({byLevel.get(level)!.length})
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {byLevel.get(level)!.map((d, i) => (
                    <li key={`${d.code}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onNavigate(locateDiagnostic(d.location))}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left transition-colors hover:brightness-125 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
                          LEVEL_STYLE[level],
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-gray-400">{d.code}</span>
                          <span className="font-mono text-[11px] text-gray-500">{d.location}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-200">{d.message}</p>
                        {d.fix ? <p className="mt-1 text-xs text-gray-400">fix: {d.fix}</p> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
