"use client";

import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Markdown } from "@/components/ui/markdown";
import { StatisticsPanel } from "@/components/scenario/studio/statistics-panel";
import { cn } from "@/lib/utils";
import type { ScenarioDossier } from "@/lib/scenarios/authoring/studio-types";
import type { ScenarioReport } from "@/lib/scenarios/authoring/types";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

/**
 * Scenario Dashboard — the at-a-glance home for one scenario: metadata,
 * validation status, statistics, warnings, author notes, last-modified, and
 * estimated duration. Invalid scenarios surface their schema error prominently.
 */
export function StudioDashboard({
  dossier,
  report,
  onOpenValidation,
}: {
  dossier: ScenarioDossier;
  report: ScenarioReport | null;
  onOpenValidation: () => void;
}) {
  const s = dossier.scenario;
  const lastModified = dossier.lastModifiedMs ? new Date(dossier.lastModifiedMs).toLocaleString() : "—";
  const warnings = report?.diagnostics.filter((d) => d.level === "warning") ?? [];
  const authorNotes = dossier.sections["Evaluation Notes"] ?? dossier.sections["Author Notes"] ?? null;

  if (!s) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-red-300">
          <AlertTriangle className="size-4" />
          <span className="font-medium">This scenario&apos;s frontmatter is invalid</span>
        </div>
        <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-red-200">
          {dossier.schemaError ?? "Unknown schema error."}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-white">{s.title}</h2>
          <StatusBadge tone={s.status === "verified" ? "success" : s.status === "review" ? "info" : "neutral"}>
            {s.status}
          </StatusBadge>
        </div>
        <p className="mt-0.5 text-sm text-gray-400">{s.summary}</p>
        <p className="mt-0.5 font-mono text-xs text-gray-600">
          {dossier.category}/{dossier.slug} · v{s.version}
        </p>
      </div>

      {/* Validation + duration cards */}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenValidation}
          className={cn(
            "flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:brightness-125 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
            report ? (report.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5") : "border-white/10 bg-white/[0.02]",
          )}
        >
          {report ? (
            report.ok ? <CheckCircle2 className="size-5 text-green-400" /> : <AlertTriangle className="size-5 text-red-400" />
          ) : (
            <ShieldCheck className="size-5 text-gray-500" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-100">
              {report ? (report.ok ? "Production-ready" : "Has errors") : "Not validated yet"}
            </div>
            <div className="text-xs text-gray-500">
              {report
                ? `${report.diagnostics.filter((d) => d.level === "error").length} errors · ${warnings.length} warnings`
                : "Open the Validation tab to run checks"}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.02] px-4 py-3">
          <Clock className="size-5 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-100">~{s.estimatedMinutes} min</div>
            <div className="text-xs text-gray-500">Last modified {lastModified}</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {dossier.stats ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">Statistics</h3>
          <StatisticsPanel stats={dossier.stats} />
        </section>
      ) : null}

      {/* Metadata */}
      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">Metadata</h3>
        <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2">
          <MetaRow label="Difficulty">
            <Badge>{s.difficulty}</Badge>
          </MetaRow>
          <MetaRow label="Experience">
            <Badge>
              {s.experienceMin} – {s.experienceMax}
            </Badge>
          </MetaRow>
          <MetaRow label="Stack">
            {s.stack.languages.map((l) => (
              <Badge key={l}>{l}</Badge>
            ))}
            <Badge>harness: {s.stack.harness}</Badge>
          </MetaRow>
          <MetaRow label="Job roles">
            {s.jobRoles.map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </MetaRow>
          <MetaRow label="Skills">
            {s.skills.map((sk) => (
              <Badge key={sk}>{sk}</Badge>
            ))}
          </MetaRow>
          {s.tags?.length ? (
            <MetaRow label="Tags">
              {s.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </MetaRow>
          ) : null}
        </div>
      </section>

      {/* Warnings */}
      {warnings.length ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-amber-300 uppercase">
            Warnings ({warnings.length})
          </h3>
          <ul className="space-y-1">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-sm text-amber-200">
                {w.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Author notes */}
      {authorNotes ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">Author notes</h3>
          <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-2">
            <Markdown headingBaseLevel={4}>{authorNotes}</Markdown>
          </div>
        </section>
      ) : null}
    </div>
  );
}
