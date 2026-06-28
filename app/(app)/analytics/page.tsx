import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { getAnalytics } from "@/server/analytics";
import { StatCards } from "@/components/analytics/stat-cards";
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart";
import { StrengthsWeaknesses } from "@/components/analytics/strengths-weaknesses";
import { InterviewsEmptyState } from "@/components/interviews/empty-state";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
        <p className="text-gray-600">Track how your interview performance trends over time.</p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent userId={user.id} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({ userId }: { userId: string }) {
  const { metrics, scoreTrend, strengths, improvements } = await getAnalytics(userId);

  if (metrics.totalInterviews === 0) {
    return <InterviewsEmptyState />;
  }

  return (
    <div className="space-y-8">
      <StatCards metrics={metrics} />

      <section className="glass-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Score over time</h2>
        {scoreTrend.length >= 2 ? (
          <ScoreTrendChart data={scoreTrend} />
        ) : (
          <p className="py-12 text-center text-sm text-gray-500">
            Complete at least two scored interviews to see your trend.
          </p>
        )}
      </section>

      <StrengthsWeaknesses strengths={strengths} improvements={improvements} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[88px] animate-pulse" />
        ))}
      </div>
      <div className="glass-card h-80 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
