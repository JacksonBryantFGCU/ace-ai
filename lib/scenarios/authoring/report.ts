import type { Diagnostic, DiagnosticLevel, ScenarioReport } from "@/lib/scenarios/authoring/types";

/**
 * Human-readable formatting for author diagnostics. One consolidated report:
 * Errors, Warnings, Suggestions, Performance notes, and Missing best practices —
 * each with location, explanation, and a concrete fix.
 */

const ORDER: DiagnosticLevel[] = ["error", "warning", "suggestion", "performance", "best-practice"];
const HEADING: Record<DiagnosticLevel, string> = {
  error: "Errors",
  warning: "Warnings",
  suggestion: "Suggestions",
  performance: "Performance notes",
  "best-practice": "Missing best practices",
};
const ICON: Record<DiagnosticLevel, string> = {
  error: "✗",
  warning: "⚠",
  suggestion: "→",
  performance: "◷",
  "best-practice": "★",
};

export interface Totals {
  error: number;
  warning: number;
  suggestion: number;
  performance: number;
  "best-practice": number;
}

export function totals(reports: ScenarioReport[]): Totals {
  const t: Totals = { error: 0, warning: 0, suggestion: 0, performance: 0, "best-practice": 0 };
  for (const r of reports) for (const d of r.diagnostics) t[d.level]++;
  return t;
}

export function hasErrors(reports: ScenarioReport[]): boolean {
  return reports.some((r) => !r.ok);
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatDiagnostic(d: Diagnostic): string {
  const lines = [`  ${ICON[d.level]} [${d.code}] ${d.location}`, `      ${d.message.replace(/\n/g, "\n      ")}`];
  if (d.fix) lines.push(`      fix: ${d.fix.replace(/\n/g, "\n           ")}`);
  return lines.join("\n");
}

export function formatScenarioReport(report: ScenarioReport): string {
  const byLevel = new Map<DiagnosticLevel, Diagnostic[]>();
  for (const d of report.diagnostics) byLevel.set(d.level, [...(byLevel.get(d.level) ?? []), d]);

  const status = report.ok ? "✓ ok" : "✗ FAILED";
  const counts = ORDER.filter((l) => (byLevel.get(l)?.length ?? 0) > 0)
    .map((l) => `${byLevel.get(l)!.length} ${l}`)
    .join(", ");
  const header = `▌ ${report.slug}  [${report.category}]  ${status}${counts ? `  (${counts})` : ""}`;

  const sections: string[] = [];
  for (const level of ORDER) {
    const items = byLevel.get(level);
    if (!items || items.length === 0) continue;
    sections.push(`  ${HEADING[level]}`);
    sections.push(items.map(formatDiagnostic).join("\n"));
  }
  return [header, ...sections].join("\n");
}

/** The one consolidated report a scenario author reads. */
export function formatReports(reports: ScenarioReport[]): string {
  if (reports.length === 0) return "No scenarios found to validate.";

  const body = reports.map(formatScenarioReport).join("\n\n");
  const t = totals(reports);
  const failed = reports.filter((r) => !r.ok).length;

  const summary = [
    "",
    "─".repeat(60),
    `Validated ${pluralize(reports.length, "scenario")}: ` +
      `${t.error} error${t.error === 1 ? "" : "s"}, ${t.warning} warning${t.warning === 1 ? "" : "s"}, ` +
      `${t.suggestion} suggestion${t.suggestion === 1 ? "" : "s"}, ${t.performance} perf, ${t["best-practice"]} best-practice`,
    failed > 0
      ? `✗ ${pluralize(failed, "scenario")} not production-ready — fix the error(s) above.`
      : `✓ All scenarios pass. ${t.warning + t.suggestion > 0 ? "Consider the warnings/suggestions." : ""}`.trim(),
  ].join("\n");

  return `${body}\n${summary}`;
}
