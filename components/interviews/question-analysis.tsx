import { ChevronDown } from "lucide-react";
import { scoreTone } from "@/lib/format";
import type { QuestionBreakdown } from "@/types/interview";

/**
 * Per-question analysis cards for the replay (dark). Each card is a native
 * `<details>` so it collapses without client JS. Recreates the legacy
 * "Question Analysis" column.
 */
export function QuestionAnalysis({ items }: { items: QuestionBreakdown[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {items.map((q, i) => (
        <details key={i} open className="group rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-300">
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-white">{q.question}</span>
            <span className={`text-sm font-semibold ${scoreTone(q.score)}`}>{q.score}</span>
            <ChevronDown className="size-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-3 space-y-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                style={{ width: `${Math.max(0, Math.min(100, q.score))}%` }}
              />
            </div>

            {q.candidateAnswer ? (
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                  Candidate Answer
                </p>
                <p className="text-sm text-gray-300">{q.candidateAnswer}</p>
              </div>
            ) : null}

            {q.feedback ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                  AI Feedback
                </p>
                <p className="text-sm text-gray-300 italic">{q.feedback}</p>
              </div>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
