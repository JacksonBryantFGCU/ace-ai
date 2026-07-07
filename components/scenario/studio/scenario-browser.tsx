"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  ALL_FILTER,
  distinctCatalogValues,
  filterCatalogScenarios,
  groupCatalogScenarios,
  runtimeFrameworkValue,
} from "@/lib/scenarios/scenario-catalog";
import type { StudioScenarioSummary } from "@/lib/scenarios/authoring/studio-types";

function relativeTime(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/**
 * The Scenario Browser: a searchable, filterable list of every scenario with its
 * authored metadata and a validation status glance. Selecting a row drives the
 * detail view. Pure presentational — data + selection come from the parent.
 */
export function ScenarioBrowser({
  scenarios,
  selectedSlug,
  onSelect,
}: {
  scenarios: StudioScenarioSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL_FILTER);
  const [difficulty, setDifficulty] = useState(ALL_FILTER);
  const [category, setCategory] = useState(ALL_FILTER);
  const [role, setRole] = useState(ALL_FILTER);
  const [runtimeFramework, setRuntimeFramework] = useState(ALL_FILTER);

  const categories = useMemo(() => distinctCatalogValues(scenarios.map((s) => s.category)), [scenarios]);
  const roles = useMemo(() => distinctCatalogValues(scenarios.flatMap((s) => s.jobRoles)), [scenarios]);
  const runtimeFrameworks = useMemo(
    () => distinctCatalogValues(scenarios.map(runtimeFrameworkValue)),
    [scenarios],
  );

  const filtered = useMemo(() => {
    const statusFiltered = status === ALL_FILTER ? scenarios : scenarios.filter((s) => s.status === status);
    return filterCatalogScenarios(statusFiltered, {
      query,
      role,
      difficulty,
      category,
      runtimeFramework,
    });
  }, [scenarios, query, status, difficulty, category, role, runtimeFramework]);
  const grouped = useMemo(() => groupCatalogScenarios(filtered), [filtered]);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scenarios…"
          aria-label="Search scenarios"
          className="w-full rounded-md border border-white/15 bg-black/40 py-1.5 pr-2 pl-8 text-sm text-white outline-none focus:border-blue-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <FilterSelect label="Status" value={status} onChange={setStatus} options={["draft", "review", "verified"]} />
        <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["easy", "medium", "hard"]} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
        <FilterSelect label="Role" value={role} onChange={setRole} options={roles} />
        <div className="col-span-2">
          <FilterSelect label="Runtime/framework" value={runtimeFramework} onChange={setRuntimeFramework} options={runtimeFrameworks} />
        </div>
      </div>

      <p className="px-0.5 text-xs text-gray-500">
        {filtered.length} of {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"}
      </p>

      <div data-testid="studio-scenario-scroll" className="flex max-h-[calc(100vh-14rem)] min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No scenarios match" description="Adjust the search or filters." />
        ) : (
          grouped.map((group) => (
            <section key={group.family} aria-label={`${group.label} scenarios`} className="space-y-1.5">
              <div className="sticky top-0 z-10 bg-gray-950/95 py-1 text-xs font-semibold text-gray-500 backdrop-blur">
                {group.label}
              </div>
              {group.scenarios.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onSelect(s.slug)}
                  aria-current={s.slug === selectedSlug}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
                    s.slug === selectedSlug
                      ? "border-blue-400/60 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-100">{s.title}</span>
                    <ValidationGlance summary={s} />
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{s.summary || s.slug}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusBadge tone={s.status === "verified" ? "success" : s.status === "review" ? "info" : "neutral"}>
                      {s.status}
                    </StatusBadge>
                    <Badge>{s.difficulty}</Badge>
                    <Badge>{s.category}</Badge>
                    {runtimeFrameworkValue(s) ? <Badge>{runtimeFrameworkValue(s)}</Badge> : null}
                    <span className="ml-auto text-[11px] text-gray-600">{relativeTime(s.lastModifiedMs)}</span>
                  </div>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/** The per-row validation glance: invalid / errors / warnings / clean. */
function ValidationGlance({ summary }: { summary: StudioScenarioSummary }) {
  if (summary.invalid || summary.errorCount > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-red-300" title="Has validation errors">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        {summary.invalid ? "invalid" : summary.errorCount}
      </span>
    );
  }
  if (summary.warningCount > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-300" title="Has warnings">
        <AlertCircle className="size-3.5" aria-hidden="true" />
        {summary.warningCount}
      </span>
    );
  }
  return <CheckCircle2 className="size-3.5 shrink-0 text-green-400" aria-label="No static errors" />;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-gray-200 outline-none focus:border-blue-400"
      >
        <option value={ALL_FILTER}>{label}: any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
