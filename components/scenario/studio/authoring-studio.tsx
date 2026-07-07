"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, MousePointerClick, Play, ShieldCheck, FlaskConical } from "lucide-react";
import {
  getScenarioDossier,
  listStudioScenarios,
  validateScenarioReport,
} from "@/actions/authoring";
import { ScenarioBrowser } from "@/components/scenario/studio/scenario-browser";
import { StudioDashboard } from "@/components/scenario/studio/studio-dashboard";
import { ValidationPanel } from "@/components/scenario/studio/validation-panel";
import { StepExplorer } from "@/components/scenario/studio/step-explorer";
import { WorkspacePreview } from "@/components/scenario/studio/workspace-preview";
import { InterviewPreview } from "@/components/scenario/studio/interview-preview";
import { STUDIO_TABS, type StudioTab } from "@/components/scenario/studio/tabs";
import type { DiagnosticTarget } from "@/components/scenario/studio/locate";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ScenarioDossier, StudioScenarioSummary } from "@/lib/scenarios/authoring/studio-types";
import type { ScenarioReport } from "@/lib/scenarios/authoring/types";

/**
 * The Scenario Authoring Studio — the developer environment for creating,
 * validating, previewing, and debugging scenarios. A left Scenario Browser selects
 * a scenario; the right detail view tabs through Dashboard, Validation, Step
 * Explorer, Workspace Preview, and a live Interview Preview.
 *
 * This is pure ORCHESTRATION: every panel drives the existing runtime, validation,
 * and evaluation systems through the dev-only `actions/authoring` server actions.
 * No runtime logic is duplicated here. Dev-only (the route 404s in production).
 */
export function AuthoringStudio({ initialScenarios }: { initialScenarios: StudioScenarioSummary[] }) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ScenarioDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [tab, setTab] = useState<StudioTab>("dashboard");

  const [report, setReport] = useState<ScenarioReport | null>(null);
  const [running, startValidate] = useTransition();
  const [runningSolution, startSolution] = useTransition();

  // Navigation target set when jumping from a validation issue.
  const [stepIndex, setStepIndex] = useState(0);
  const [focusFile, setFocusFile] = useState<string | null>(null);

  const runValidation = useCallback(
    (slug: string, runSolution: boolean) => {
      const start = runSolution ? startSolution : startValidate;
      start(async () => {
        try {
          setReport(await validateScenarioReport(slug, { runSolution }));
        } catch {
          setReport(null);
        }
      });
    },
    [],
  );

  const selectScenario = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      setDossier(null);
      setReport(null);
      setTab("dashboard");
      setStepIndex(0);
      setFocusFile(null);
      setLoadingDossier(true);
      void getScenarioDossier(slug).then((d) => {
        setDossier(d);
        setLoadingDossier(false);
      });
      runValidation(slug, false);
    },
    [runValidation],
  );

  // Refresh the browser list once on mount so counts reflect the latest disk state.
  useEffect(() => {
    void listStudioScenarios().then(setScenarios);
  }, []);

  const navigate = useCallback((target: DiagnosticTarget) => {
    setTab(target.tab);
    if (target.stepIndex != null) setStepIndex(target.stepIndex);
    if (target.file) setFocusFile(target.file);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 bg-gray-950 text-gray-100">
      {/* Left: Scenario Browser */}
      <aside className="flex w-80 shrink-0 flex-col gap-3 border-r border-white/10 p-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-blue-400" />
          <h1 className="text-sm font-semibold tracking-wide text-gray-200">Authoring Studio</h1>
        </div>
        <ScenarioBrowser scenarios={scenarios} selectedSlug={selectedSlug} onSelect={selectScenario} />
      </aside>

      {/* Right: detail view */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedSlug ? (
          <EmptyState
            icon={MousePointerClick}
            title="Select a scenario"
            description="Pick a scenario from the browser to validate, preview, and inspect it."
          />
        ) : (
          <>
            {/* Tab bar + utilities */}
            <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
              {STUDIO_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
                    tab === id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => selectedSlug && runValidation(selectedSlug, false)}
                  disabled={running}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                >
                  {running ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  Validate
                </button>
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                >
                  <Play className="size-3.5" /> Preview
                </button>
              </div>
            </div>

            {/* Tab body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              {loadingDossier || !dossier ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : tab === "dashboard" ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <StudioDashboard dossier={dossier} report={report} onOpenValidation={() => setTab("validation")} />
                </div>
              ) : tab === "validation" ? (
                <ValidationPanel
                  report={report}
                  running={running}
                  runningSolution={runningSolution}
                  onRunStatic={() => runValidation(selectedSlug, false)}
                  onRunSolution={() => runValidation(selectedSlug, true)}
                  onNavigate={navigate}
                />
              ) : tab === "steps" ? (
                dossier.scenario ? (
                  <StepExplorer
                    scenario={dossier.scenario}
                    files={dossier.files}
                    selectedIndex={stepIndex}
                    onSelectIndex={setStepIndex}
                  />
                ) : (
                  <EmptyState title="Scenario is invalid" description="Fix the frontmatter errors in the Validation tab." />
                )
              ) : tab === "workspace" ? (
                dossier.scenario ? (
                  <WorkspacePreview scenario={dossier.scenario} files={dossier.files} focusFile={focusFile} />
                ) : (
                  <EmptyState title="Scenario is invalid" description="Fix the frontmatter errors in the Validation tab." />
                )
              ) : (
                <InterviewPreview key={selectedSlug} slug={selectedSlug} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
