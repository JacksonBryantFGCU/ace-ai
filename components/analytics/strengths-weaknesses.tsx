import { ThumbsUp, TrendingUp } from "lucide-react";
import type { FeedbackTheme } from "@/types/analytics";

/**
 * Recurring strengths vs. areas-for-improvement, ranked by how often the AI
 * raised them across all evaluations. Server component (light surface).
 */
export function StrengthsWeaknesses({
  strengths,
  improvements,
}: {
  strengths: FeedbackTheme[];
  improvements: FeedbackTheme[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ThemeCard
        title="Top strengths"
        accent="from-emerald-400 to-green-500"
        icon={ThumbsUp}
        themes={strengths}
        emptyLabel="No strengths recorded yet."
      />
      <ThemeCard
        title="Areas to improve"
        accent="from-amber-400 to-orange-500"
        icon={TrendingUp}
        themes={improvements}
        emptyLabel="No improvement areas recorded yet."
      />
    </div>
  );
}

function ThemeCard({
  title,
  accent,
  icon: Icon,
  themes,
  emptyLabel,
}: {
  title: string;
  accent: string;
  icon: typeof ThumbsUp;
  themes: FeedbackTheme[];
  emptyLabel: string;
}) {
  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}
        >
          <Icon className="size-4.5" />
        </span>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>

      {themes.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {themes.map((theme) => (
            <li key={theme.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-gray-700">{theme.label}</span>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                ×{theme.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
