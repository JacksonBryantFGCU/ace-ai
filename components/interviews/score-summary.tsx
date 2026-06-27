import type { SavedInterview } from "@/types/db";
import { scoreTone, titleCase } from "@/lib/format";

/** Renders the evaluation result as server markup (no charts — those arrive in Phase 6). */
export function ScoreSummary({ interview }: { interview: SavedInterview }) {
  const { result } = interview;

  if (!result) {
    return (
      <section className="border-border rounded-lg border p-6">
        <p className="text-muted-foreground text-sm">No evaluation available for this interview.</p>
      </section>
    );
  }

  const breakdown = Object.entries(result.breakdown ?? {});

  return (
    <section className="border-border space-y-6 rounded-lg border p-6">
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold ${scoreTone(result.score)}`}>{result.score}</span>
        <span className="text-muted-foreground">/ 100 overall</span>
      </div>

      {result.summary ? <p className="text-sm leading-relaxed">{result.summary}</p> : null}

      {breakdown.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Breakdown</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {breakdown.map(([dimension, value]) => (
              <li key={dimension} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{titleCase(dimension)}</span>
                <span className={`font-medium ${scoreTone(Number(value))}`}>{value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FeedbackList title="Strengths" items={result.strengths} />
        <FeedbackList title="Areas to improve" items={result.improvements} />
      </div>

      <FeedbackList title="Next steps" items={result.nextSteps} />
    </section>
  );
}

function FeedbackList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
