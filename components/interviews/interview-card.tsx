import Link from "next/link";
import type { InterviewListItem } from "@/types/db";
import { formatDate, scoreTone, titleCase } from "@/lib/format";

/** One row in the history list. Server component; links to the replay. */
export function InterviewCard({ interview }: { interview: InterviewListItem }) {
  const score = interview.result?.score;

  return (
    <Link
      href={`/interviews/${interview.id}`}
      className="border-border bg-card hover:bg-accent/50 flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
    >
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{interview.role}</p>
        <p className="text-muted-foreground text-sm">
          {titleCase(interview.question_type)} · {formatDate(interview.date)}
        </p>
      </div>
      {typeof score === "number" ? (
        <p className="shrink-0">
          <span className={`text-2xl font-semibold ${scoreTone(score)}`}>{score}</span>
          <span className="text-muted-foreground text-sm">/100</span>
        </p>
      ) : (
        <span className="text-muted-foreground shrink-0 text-sm">No score</span>
      )}
    </Link>
  );
}
