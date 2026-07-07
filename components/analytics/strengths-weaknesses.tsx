import type { FeedbackTheme } from "@/types/analytics";

/**
 * Recurring strengths vs. areas-for-improvement, ranked by how often the AI
 * raised them across all evaluations. Dark interview/evaluation surface — mirrors
 * the `EvaluationReport` list-card pattern (uppercase label, tone dot, count).
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
        tone="green"
        themes={strengths}
        emptyLabel="No strengths recorded yet."
      />
      <ThemeCard
        title="Areas to improve"
        tone="amber"
        themes={improvements}
        emptyLabel="No improvement areas recorded yet."
      />
    </div>
  );
}

function ThemeCard({
  title,
  tone,
  themes,
  emptyLabel,
}: {
  title: string;
  tone: "green" | "amber";
  themes: FeedbackTheme[];
  emptyLabel: string;
}) {
  const dot = tone === "green" ? "bg-green-400" : "bg-amber-400";
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</h3>
      {themes.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {themes.map((theme) => (
            <li key={theme.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-gray-200">
                <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
                <span className="truncate">{theme.label}</span>
              </span>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
                ×{theme.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
