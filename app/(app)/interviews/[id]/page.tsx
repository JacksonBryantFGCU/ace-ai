import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getInterviewById } from "@/server/storage";
import { ScoreSummary } from "@/components/interviews/score-summary";
import { TranscriptTimeline } from "@/components/interviews/transcript-timeline";
import { formatDateTime, formatDuration, titleCase } from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/interviews/[id]">,
): Promise<Metadata> {
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

  const duration = formatDuration(interview.duration_ms);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {interview.role} · {titleCase(interview.question_type)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(interview.date)}
          {duration ? ` · ${duration}` : ""}
          {interview.question_count ? ` · ${interview.question_count} questions` : ""}
        </p>
      </header>

      <ScoreSummary interview={interview} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Transcript</h2>
        <TranscriptTimeline transcript={interview.transcript} />
      </section>
    </div>
  );
}
