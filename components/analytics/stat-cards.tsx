import { CalendarClock, CheckCircle2, Gauge, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDuration, scoreTone } from "@/lib/format";
import type { UserMetrics } from "@/types/analytics";

/**
 * Headline stat cards. Presentational only — fed the already-computed
 * `UserMetrics`. The `surface` variant keeps the light dashboard look while
 * letting Analytics render on the dark interview/evaluation surface.
 */
export function StatCards({
  metrics,
  surface = "light",
}: {
  metrics: UserMetrics;
  surface?: "light" | "dark";
}) {
  const duration = formatDuration(metrics.averageDurationMs) ?? "—";
  const dark = surface === "dark";

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

  const cardClass = dark
    ? "flex items-center gap-4 rounded-lg border border-white/10 bg-black/20 p-5"
    : "glass-card flex items-center gap-4 p-5";
  const iconClass = dark
    ? "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300"
    : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white";
  const labelClass = dark ? "text-sm font-medium text-gray-400" : "text-sm font-medium text-gray-500";
  const valueDefault = dark ? "text-white" : "text-gray-900";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, valueClass }) => (
        <div key={label} className={cardClass}>
          <span className={iconClass}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className={labelClass}>{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${valueClass ?? valueDefault}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
