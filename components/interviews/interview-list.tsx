import { getInterviews, type InterviewFilters } from "@/server/storage";
import { groupInterviewsByRecency } from "@/lib/analytics";
import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewsEmptyState } from "@/components/interviews/empty-state";

/**
 * Async server component: the awaited section of the history page, wrapped in a
 * Suspense boundary by the page so the heading paints instantly while this
 * streams in. Optionally filtered (`?type=&role=`) and grouped by recency.
 */
export async function InterviewList({
  userId,
  filters = {},
}: {
  userId: string;
  filters?: InterviewFilters;
}) {
  const interviews = await getInterviews(userId, filters);
  const isFiltered = Boolean(filters.questionType || filters.role);

  if (interviews.length === 0) {
    if (isFiltered) {
      return (
        <div className="glass-card border-dashed py-12 text-center text-sm text-gray-600">
          No interviews match these filters.
        </div>
      );
    }
    return <InterviewsEmptyState />;
  }

  const groups = groupInterviewsByRecency(interviews);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            {group.label}
          </h2>
          <ul className="space-y-3">
            {group.items.map((interview) => (
              <li key={interview.id}>
                <InterviewCard interview={interview} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
