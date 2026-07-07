"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Play, Search, SlidersHorizontal } from "lucide-react";
import { chooseTechnicalScenario } from "@/actions/interview";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ALL_FILTER,
  DIFFICULTY_ORDER,
  distinctCatalogValues,
  filterCatalogScenarios,
  runtimeFrameworkValue,
  sortCatalogScenarios,
} from "@/lib/scenarios/scenario-catalog";
import { noScenarioMessage, scenarioRoleFamily } from "@/lib/scenarios/selection/roles";
import type { ScenarioPickerOption } from "@/lib/scenarios/types";
import type { VapiInterviewConfig } from "@/types/interview";

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  hard: "border-rose-200 bg-rose-50 text-rose-700",
};

export function ScenarioPickerPage({
  config,
  scenarios,
  recommendedSlug,
}: {
  config: VapiInterviewConfig;
  scenarios: ScenarioPickerOption[];
  recommendedSlug: string | null;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [difficulty, setDifficulty] = useState(ALL_FILTER);
  const [category, setCategory] = useState(ALL_FILTER);
  const [runtimeFramework, setRuntimeFramework] = useState(ALL_FILTER);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(recommendedSlug);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roleBound = useMemo(
    () => sortCatalogScenarios(filterCatalogScenarios(scenarios, { allowedRole: config.role })),
    [scenarios, config.role],
  );
  const roles = useMemo(() => [ALL_FILTER, ...distinctCatalogValues(roleBound.flatMap((s) => s.jobRoles))], [roleBound]);
  const difficulties = useMemo(
    () => [
      ALL_FILTER,
      ...distinctCatalogValues(roleBound.map((s) => s.difficulty)).sort(
        (a, b) =>
          DIFFICULTY_ORDER.indexOf(a as (typeof DIFFICULTY_ORDER)[number]) -
          DIFFICULTY_ORDER.indexOf(b as (typeof DIFFICULTY_ORDER)[number]),
      ),
    ],
    [roleBound],
  );
  const categories = useMemo(() => [ALL_FILTER, ...distinctCatalogValues(roleBound.map((s) => s.category))], [roleBound]);
  const stacks = useMemo(() => [ALL_FILTER, ...distinctCatalogValues(roleBound.map(runtimeFrameworkValue))], [roleBound]);

  const filtered = useMemo(
    () =>
      sortCatalogScenarios(
        filterCatalogScenarios(roleBound, {
          query,
          role: roleFilter,
          difficulty,
          category,
          runtimeFramework,
        }),
      ),
    [roleBound, query, roleFilter, difficulty, category, runtimeFramework],
  );
  const recommended = useMemo(() => {
    const exact = recommendedSlug ? roleBound.find((scenario) => scenario.slug === recommendedSlug) : null;
    const sameDifficulty = roleBound.filter((scenario) => scenario.difficulty === config.difficulty);
    return sortCatalogScenarios([...(exact ? [exact] : []), ...sameDifficulty.filter((s) => s.slug !== exact?.slug)]).slice(0, 3);
  }, [roleBound, recommendedSlug, config.difficulty]);
  const selected = selectedSlug ? roleBound.find((scenario) => scenario.slug === selectedSlug) ?? null : null;

  function startInterview() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await chooseTechnicalScenario(selected.slug);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="min-h-0 flex-1 bg-[linear-gradient(135deg,#eef2ff_0%,#f7f5ff_42%,#eaf6ff_100%)] text-slate-950">
      <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-[1520px] flex-col gap-3 px-4 py-3 md:px-5">
        <header className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 shadow-[0_18px_60px_-36px_rgba(56,79,145,0.6)] backdrop-blur-xl">
          <Link href="/new" className="mr-5 flex w-20 shrink-0 items-center" aria-label="Back to setup">
            <BrandLogo className="w-14 scale-125" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">Choose your scenario</h1>
            <p className="text-sm text-slate-500">Pick a focused technical exercise before the interview starts.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              {ROLE_LABELS[config.role] ?? titleCase(config.role)} · {titleCase(config.difficulty)} · {titleCase(config.questionType)}
            </span>
            <Link
              href={`/new?role=${encodeURIComponent(config.role)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
          <aside className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur-xl lg:min-h-0">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            </div>
            <div className="space-y-2.5">
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Search
                <span className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Title, API, React…"
                    aria-label="Search scenarios"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                  />
                </span>
              </label>
              <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={roles} />
              <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={difficulties} />
              <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
              <FilterSelect label="Stack/runtime" value={runtimeFramework} onChange={setRuntimeFramework} options={stacks} />
            </div>
          </aside>

          <main className="flex min-h-0 flex-col rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl">
            <div className="shrink-0 border-b border-slate-200/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Recommended scenarios</h2>
                  <p className="text-xs text-slate-500">{roleBound.length} role-matched scenarios available</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {filtered.length} shown
                </span>
              </div>
              {recommended.length > 0 ? (
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {recommended.map((scenario) => (
                    <ScenarioCard
                      key={scenario.slug}
                      scenario={scenario}
                      compact
                      selected={scenario.slug === selectedSlug}
                      recommended={scenario.slug === recommendedSlug}
                      onSelect={() => setSelectedSlug(scenario.slug)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div data-testid="scenario-picker-scroll" className="min-h-0 flex-1 overflow-y-auto p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">All scenarios</h2>
              {roleBound.length === 0 ? (
                <EmptyMessage message={noScenarioMessage(config.role)} />
              ) : filtered.length === 0 ? (
                <EmptyMessage message="No scenarios match your filters." />
              ) : (
                <div className="grid gap-2.5 xl:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((scenario) => (
                    <ScenarioCard
                      key={scenario.slug}
                      scenario={scenario}
                      selected={scenario.slug === selectedSlug}
                      recommended={scenario.slug === recommendedSlug}
                      onSelect={() => setSelectedSlug(scenario.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>

          <aside className="flex min-h-0 flex-col rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur-xl lg:sticky lg:top-3">
            <ScenarioDetails scenario={selected} pending={pending} error={error} onStart={startInterview} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  selected,
  recommended,
  compact = false,
  onSelect,
}: {
  scenario: ScenarioPickerOption;
  selected: boolean;
  recommended: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const stack = runtimeFrameworkValue(scenario) || scenario.category;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-0 flex-col rounded-xl border p-3 text-left shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none",
        selected
          ? "border-indigo-400 bg-indigo-50 shadow-[0_16px_32px_-24px_rgba(67,56,202,0.9)] ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-950">{scenario.title}</span>
            {recommended ? <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">Recommended</span> : null}
          </div>
          <p className={cn("mt-1 text-xs leading-relaxed text-slate-600", compact ? "line-clamp-1" : "line-clamp-2")}>
            {scenario.summary}
          </p>
        </div>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white text-transparent",
          )}
        >
          <Check className="size-3.5" />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip className={DIFFICULTY_STYLE[scenario.difficulty]}>{scenario.difficulty}</Chip>
        <Chip>{titleCase(scenarioRoleFamily(scenario))}</Chip>
        <Chip>{titleCase(stack.replace(/-/g, " "))}</Chip>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500">
          <Clock className="size-3.5" /> {scenario.estimatedMinutes}m
        </span>
      </div>
    </button>
  );
}

function ScenarioDetails({
  scenario,
  pending,
  error,
  onStart,
}: {
  scenario: ScenarioPickerOption | null;
  pending: boolean;
  error: string | null;
  onStart: () => void;
}) {
  if (!scenario) {
    return (
      <div className="flex min-h-80 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
        <p className="text-sm font-semibold text-slate-800">Select a scenario</p>
        <p className="mt-1 text-sm text-slate-500">Details and the start button will appear here.</p>
        <Button className="mt-5 w-full" variant="brand" disabled>
          Start Interview
        </Button>
      </div>
    );
  }

  const stack = runtimeFrameworkValue(scenario) || scenario.category;
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="text-xs font-semibold tracking-[0.16em] text-indigo-500 uppercase">Selected scenario</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{scenario.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{scenario.summary}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip className={DIFFICULTY_STYLE[scenario.difficulty]}>{scenario.difficulty}</Chip>
          <Chip>{scenario.category}</Chip>
          <Chip>{titleCase(stack.replace(/-/g, " "))}</Chip>
          <Chip>{scenario.estimatedMinutes} min</Chip>
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">Skills tested</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {scenario.skills.map((skill) => (
              <Chip key={skill}>{titleCase(skill.replace(/-/g, " "))}</Chip>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">Step preview</h3>
          <ol className="mt-2 space-y-2">
            {scenario.stepPreview.map((step, index) => (
              <li key={step.id} className="rounded-lg border border-slate-200 bg-white/70 p-2">
                <p className="text-xs font-medium text-slate-500">
                  Step {index + 1} · {titleCase(step.kind)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-700">{step.prompt}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mt-4 shrink-0 border-t border-slate-200 pt-4">
        {error ? (
          <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button type="button" variant="brand" onClick={onStart} disabled={pending} className="h-11 w-full">
          <Play className="size-4" />
          {pending ? "Starting..." : "Start Interview"}
        </Button>
      </div>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === ALL_FILTER ? "All" : titleCase(option.replace(/-/g, " "))}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600", className)}>
      {children}
    </span>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/55 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
