import Link from "next/link";
import { Calendar, ChevronRight, Code2, Mic } from "lucide-react";
import type { InterviewListItem } from "@/types/db";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime, titleCase } from "@/lib/format";

/** One row in the history list. Server component; links to the replay. */
export function InterviewCard({ interview }: { interview: InterviewListItem }) {
  const score = interview.result?.score;
  const roleLabel = ROLE_LABELS[interview.role] ?? titleCase(interview.role);
  const isTechnical = interview.question_type === "technical";
  const Icon = isTechnical ? Code2 : Mic;

  return (
    <Link
      href={`/interviews/${interview.id}`}
      className="glass-card flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 text-white">
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{roleLabel}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-purple-600">{titleCase(interview.question_type)}</span>
          <span className="flex items-center gap-1 text-gray-500">
            <Calendar className="size-3.5" />
            {formatDateTime(interview.date)}
          </span>
          {typeof score === "number" ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
              Score {score}
            </span>
          ) : null}
        </div>
      </div>

      <ChevronRight className="size-5 shrink-0 text-gray-400" />
    </Link>
  );
}
