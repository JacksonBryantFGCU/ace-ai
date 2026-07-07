"use client";

import { ScenarioWorkspace } from "@/components/scenario/scenario-workspace";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { VapiInterviewConfig } from "@/types/interview";

/**
 * The real (authenticated) candidate interview surface. Wraps the shared
 * `ScenarioWorkspace` with the interview chrome. Unlike the dev playground there
 * is deliberately NO restart control — a real interview is a single, timed
 * attempt, and restarting would corrupt the recorded result / analytics.
 *
 * `config` (the setup draft) is passed through so the completed interview is
 * persisted to Past Interviews / dashboard / analytics on end.
 */
export function ScenarioInterview({
  loaded,
  config,
}: {
  loaded: LoadedScenario;
  config: VapiInterviewConfig;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScenarioWorkspace
        loaded={loaded}
        autoStartVoice
        limitMinutes={loaded.scenario.estimatedMinutes}
        saveConfig={config}
      />
    </div>
  );
}
