import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAnalytics } from "@/server/analytics";
import { getInterviews } from "@/server/storage";
import { StatCards } from "@/components/analytics/stat-cards";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { InterviewCard } from "@/components/interviews/interview-card";
import { InterviewsEmptyState } from "@/components/interviews/empty-state";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}

/**
 * Dashboard body. Reads the cached analytics aggregate to decide between the
 * first-run experience and the normal overview: with zero completed interviews
 * we show the onboarding card; otherwise the stat cards, activity, a persistent
 * "New Interview" CTA, and the recent interviews list.
 */
async function DashboardContent({ userId }: { userId: string }) {
  const { metrics, recentActivity } = await getAnalytics(userId);

  if (metrics.totalInterviews === 0) {
    return <OnboardingCard />;
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Your interview overview at a glance.</p>
        </div>
        <Link
          href="/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
        >
          <Plus className="size-4" />
          New Interview
        </Link>
      </div>

      <div className="space-y-6">
        <StatCards metrics={metrics} />
        <RecentActivity points={recentActivity} />
      </div>

      <Suspense fallback={<RecentSkeleton />}>
        <RecentInterviews userId={userId} />
      </Suspense>
    </>
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

/** Full-body placeholder while the analytics aggregate (the zero-state gate) loads. */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-44 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-11 w-36 animate-pulse rounded-xl" />
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-[88px] animate-pulse" />
          ))}
        </div>
        <div className="glass-card h-44 animate-pulse" />
      </div>
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
