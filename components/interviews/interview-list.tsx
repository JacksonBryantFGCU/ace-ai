import { getInterviews } from "@/server/storage";
import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewsEmptyState } from "@/components/interviews/empty-state";

/**
 * Async server component: the awaited section of the history page, wrapped in a
 * Suspense boundary by the page so the heading paints instantly while this
 * streams in.
 */
export async function InterviewList({ userId }: { userId: string }) {
  const interviews = await getInterviews(userId);

  if (interviews.length === 0) {
    return <InterviewsEmptyState />;
  }

  return (
    <ul className="space-y-3">
      {interviews.map((interview) => (
        <li key={interview.id}>
          <InterviewCard interview={interview} />
        </li>
      ))}
    </ul>
  );
}
