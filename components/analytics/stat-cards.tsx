import { CalendarClock, CheckCircle2, Gauge, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDuration, scoreTone } from "@/lib/format";
import type { UserMetrics } from "@/types/analytics";

/**
 * Headline stat cards for the dashboard. Server component (light surface) —
 * presentational only, fed the already-computed `UserMetrics`.
 */
export function StatCards({ metrics }: { metrics: UserMetrics }) {
  const duration = formatDuration(metrics.averageDurationMs) ?? "—";

  const cards: { label: string; value: string; icon: LucideIcon; valueClass?: string }[] = [
    { label: "Total Interviews", value: String(metrics.totalInterviews), icon: ListChecks },
    {
      label: "Average Score",
      value: metrics.averageScore > 0 ? String(metrics.averageScore) : "—",
      icon: Gauge,
      valueClass: metrics.averageScore > 0 ? scoreTone(metrics.averageScore) : undefined,
    },
    { label: "Success Rate", value: `${metrics.successRate}%`, icon: CheckCircle2 },
    { label: "Avg Duration", value: duration, icon: CalendarClock },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, valueClass }) => (
        <div key={label} className="glass-card flex items-center gap-4 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${valueClass ?? "text-gray-900"}`}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
