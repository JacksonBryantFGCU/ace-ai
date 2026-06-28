import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAnalytics } from "@/server/analytics";
import { getInterviews } from "@/server/storage";
import { StatCards } from "@/components/analytics/stat-cards";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewsEmptyState } from "@/components/interviews/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Your interview overview at a glance.</p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <Overview userId={user.id} />
      </Suspense>

      <Suspense fallback={<RecentSkeleton />}>
        <RecentInterviews userId={user.id} />
      </Suspense>
    </div>
  );
}

/** Stat cards + activity strip, fed by the cached analytics aggregate. */
async function Overview({ userId }: { userId: string }) {
  const { metrics, recentActivity } = await getAnalytics(userId);
  return (
    <div className="space-y-6">
      <StatCards metrics={metrics} />
      <RecentActivity points={recentActivity} />
    </div>
  );
}

/** The five most recent interviews, reusing the history card. */
async function RecentInterviews({ userId }: { userId: string }) {
  const interviews = await getInterviews(userId);

  if (interviews.length === 0) {
    return <InterviewsEmptyState />;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent interviews</h2>
        <Link
          href="/interviews"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          View all
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <ul className="space-y-3">
        {interviews.slice(0, RECENT_LIMIT).map((interview) => (
          <li key={interview.id}>
            <InterviewCard interview={interview} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[88px] animate-pulse" />
        ))}
      </div>
      <div className="glass-card h-44 animate-pulse" />
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-3">
      <div className="bg-muted h-6 w-40 animate-pulse rounded-md" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card h-[68px] animate-pulse" />
      ))}
    </div>
  );
}
