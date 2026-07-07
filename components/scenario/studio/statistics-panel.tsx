import type { ScenarioStats } from "@/lib/scenarios/authoring/stats";

/** A single labelled statistic tile. */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="text-lg font-semibold text-gray-100 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

/**
 * Scenario Statistics — the at-a-glance shape of a scenario (steps, verification
 * vs discussion, hints, checkpoints, files, tests, estimated completion). Computed
 * server-side by `computeScenarioStats`; purely presentational here.
 */
export function StatisticsPanel({ stats }: { stats: ScenarioStats }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Total steps" value={stats.totalSteps} />
      <Stat label="Verification steps" value={stats.verificationSteps} />
      <Stat label="Discussion steps" value={stats.discussionSteps} />
      <Stat label="Hints" value={stats.hints} />
      <Stat label="Checkpoints" value={stats.checkpointSteps} />
      <Stat label="Workspace files" value={stats.files} />
      <Stat label="Test files" value={stats.tests} />
      <Stat label="Est. completion" value={`${stats.estimatedMinutes} min`} />
    </div>
  );
}
