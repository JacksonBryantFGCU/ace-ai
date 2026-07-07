import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readDraft } from "@/server/interview-draft";
import { loadScenario } from "@/server/scenarios/load";
import { listScenarioCandidates } from "@/server/scenarios/candidates";
import { selectScenarioResult } from "@/lib/scenarios/selection/select-scenario";
import { criteriaFromConfig, scenarioToCandidate } from "@/lib/scenarios/selection/adapters";
import { roleMatchForScenario } from "@/lib/scenarios/selection/roles";
import { isPublicScenario } from "@/lib/scenarios/visibility";
import { ScenarioInterview } from "@/components/scenario/scenario-interview";
import { EmptyState } from "@/components/ui/empty-state";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { VapiInterviewConfig } from "@/types/interview";

type ScenarioResolution = { scenario: LoadedScenario; message?: never } | { scenario: null; message: string };

export const metadata: Metadata = {
  title: "Technical interview",
  robots: { index: false, follow: false },
};

/**
 * Technical interview route — the **Scenario Runtime** (the permanent production
 * technical interview; the legacy LeetCode flow is gone).
 *
 * The candidate picks their scenario at setup, so the draft usually carries a
 * `scenarioSlug` — that exact scenario loads. When it doesn't (an older draft, or a
 * stale/removed slug), the flow falls back to **selection**: the selector picks the
 * closest scenario for the candidate's role / difficulty / experience. No hardcoded
 * scenario. Auth is enforced by the `(interview)` layout; this route requires a
 * technical setup draft (the entitlement gate ran in `saveSetupDraft`).
 *
 * `includeAuthorOnly: false` keeps rubrics/grading out of the candidate's browser
 * (grading resolves them server-side).
 */
export default async function TechnicalInterviewPage() {
  const config = await readDraft();
  if (!config || config.questionType !== "technical") {
    redirect("/new");
  }

  // Resolve the scenario to run: the candidate's explicit choice takes precedence;
  // otherwise fall back to selection (an older draft, or a stale/removed slug).
  const loaded = (await loadChosenScenario(config.scenarioSlug, config)) ?? (await loadSelectedScenario(config));

  if (!loaded.scenario) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState title="No scenario available" description={loaded.message} />
      </div>
    );
  }

  return <ScenarioInterview loaded={loaded.scenario} config={config} />;
}

/** Load the candidate's chosen scenario, or null if it no longer loads (falls back). */
async function loadChosenScenario(
  scenarioSlug: string | undefined,
  config: VapiInterviewConfig,
): Promise<ScenarioResolution | null> {
  if (!scenarioSlug) return null;
  try {
    const loaded = await loadScenario(scenarioSlug, { includeAuthorOnly: false });
    if (!isPublicScenario(loaded.scenario)) return null;
    const candidate = scenarioToCandidate(loaded.scenario, loaded.slug);
    return roleMatchForScenario(candidate, config.role).allowed ? { scenario: loaded } : null;
  } catch {
    return null;
  }
}

/** Load the closest scenario for the config via the selector, or null if none serve it. */
async function loadSelectedScenario(config: VapiInterviewConfig): Promise<ScenarioResolution> {
  const candidates = await listScenarioCandidates();
  const selection = selectScenarioResult(candidates, criteriaFromConfig(config), {
    // Repeat-avoidance activates once completed scenario slugs are persisted — no
    // slugs are stored yet (see docs/README.md).
    exclude: [],
    // NOTE: production should pass `eligibleStatuses: ["verified", "review"]` once
    // scenarios are promoted past `draft`; left open today so authored scenarios
    // remain reachable.
  });
  if (selection.status === "empty") return { scenario: null, message: selection.message };
  return { scenario: await loadScenario(selection.candidate.slug, { includeAuthorOnly: false }) };
}
