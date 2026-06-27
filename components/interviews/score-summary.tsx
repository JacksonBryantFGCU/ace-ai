import type { SavedInterview } from "@/types/db";
import { scoreTone } from "@/lib/format";

const DIMENSIONS = [
  { key: "communication", label: "Communication" },
  { key: "technicalAccuracy", label: "Technical accuracy" },
  { key: "problemSolving", label: "Problem solving" },
] as const;

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

  return (
    <section className="border-border space-y-6 rounded-lg border p-6">
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold ${scoreTone(result.score)}`}>{result.score}</span>
        <span className="text-muted-foreground">/ 100 overall</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {DIMENSIONS.map(({ key, label }) => (
          <div key={key} className="border-border rounded-md border p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className={`text-xl font-semibold ${scoreTone(result[key])}`}>{result[key]}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FeedbackList title="Strengths" items={result.strengths} />
        <FeedbackList title="Areas to improve" items={result.improvements} />
      </div>

      <FeedbackList title="Next steps" items={result.nextSteps} />

      {result.questionBreakdown.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Question breakdown</h3>
          <ul className="space-y-3">
            {result.questionBreakdown.map((item, index) => (
              <li key={index} className="border-border space-y-1 rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{item.question}</p>
                  <span className={`shrink-0 text-sm font-semibold ${scoreTone(item.score)}`}>
                    {item.score}
                  </span>
                </div>
                {item.candidateAnswer ? (
                  <p className="text-muted-foreground text-sm">{item.candidateAnswer}</p>
                ) : null}
                {item.feedback ? <p className="text-sm">{item.feedback}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
