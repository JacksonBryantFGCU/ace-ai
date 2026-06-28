import type { RecentActivityPoint } from "@/types/analytics";

/**
 * 30-day activity strip — one bar per day, height scaled to the busiest day.
 * Server component using plain CSS bars (no chart library, so it stays off the
 * client island); purely presentational.
 */
export function RecentActivity({ points }: { points: RecentActivityPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
        <p className="text-xs text-gray-500">
          {total} in the last 30 days
        </p>
      </div>

      <div className="flex h-24 items-end gap-1" aria-hidden>
        {points.map((p) => (
          <div
            key={p.date}
            title={`${p.date}: ${p.count}`}
            className="flex-1 rounded-sm bg-gradient-to-t from-blue-400/40 to-purple-500/70"
            style={{ height: `${Math.max(4, (p.count / max) * 100)}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400">
        <span>{points[0]?.date}</span>
        <span>{points.at(-1)?.date}</span>
      </div>
    </div>
  );
}
