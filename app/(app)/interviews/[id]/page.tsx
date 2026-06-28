import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mic } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getInterviewById } from "@/server/storage";
import { ROLE_LABELS, getInterviewer } from "@/lib/constants";
import { formatDateTime, scoreTone, titleCase } from "@/lib/format";
import { TranscriptTimeline } from "@/components/interviews/transcript-timeline";
import { QuestionAnalysis } from "@/components/interviews/question-analysis";
import { OverallSummary } from "@/components/interviews/overall-summary";
import { SettingChip } from "@/components/interview/setting-chip";

export async function generateMetadata(props: PageProps<"/interviews/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const user = await requireUser();
  const interview = await getInterviewById(user.id, id);

  if (!interview) return { title: "Interview not found" };
  return { title: `${interview.role} · ${titleCase(interview.question_type)} — replay` };
}

export default async function InterviewReplayPage(props: PageProps<"/interviews/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  // Owner-scoped single fetch (cached per request, so it dedupes with
  // generateMetadata). A missing/foreign id returns null → notFound().
  const interview = await getInterviewById(user.id, id);

  if (!interview) notFound();

  const { result, config } = interview;
  const roleLabel = ROLE_LABELS[interview.role] ?? titleCase(interview.role);
  const interviewer = getInterviewer(config?.interviewer);

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/interviews"
            className="flex items-center gap-1 text-gray-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            All Interviews
          </Link>
          <span className="font-semibold text-white">{roleLabel}</span>
          <span className="flex items-center gap-1 text-gray-400">
            <Mic className="size-3.5" />
            {titleCase(interview.question_type)}
          </span>
          <span className="text-gray-400">{formatDateTime(interview.date)}</span>
          {config?.difficulty ? (
            <SettingChip tone="amber">{titleCase(config.difficulty)}</SettingChip>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {typeof result?.score === "number" ? (
            <span className="text-sm text-gray-400">
              Score <span className={`text-lg font-bold ${scoreTone(result.score)}`}>{result.score}</span>
            </span>
          ) : null}
          <Link
            href="/roles"
            className="inline-flex h-9 items-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
          >
            New Interview
          </Link>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase">Transcript</h2>
          <TranscriptTimeline transcript={interview.transcript} interviewerName={interviewer.name} />
        </section>

        <section className="space-y-6">
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Question Analysis
          </h2>
          {result ? (
            <>
              <QuestionAnalysis items={result.questionBreakdown} />
              <OverallSummary result={result} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No evaluation available for this interview.</p>
          )}
        </section>
      </div>
    </div>
  );
}
