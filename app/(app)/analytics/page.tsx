import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAnalytics } from "@/server/analytics";
import { StatCards } from "@/components/analytics/stat-cards";
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart";
import { StrengthsWeaknesses } from "@/components/analytics/strengths-weaknesses";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-gray-400">Track how your interview performance trends over time.</p>
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
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-black/20">
        <EmptyState
          icon={LineChart}
          title="No analytics yet"
          description="Complete your first interview to start tracking your performance."
          action={
            <Link
              href="/new"
              className="inline-flex h-9 items-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
            >
              Start an interview
            </Link>
          }
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatCards metrics={metrics} surface="dark" />

      <section className="rounded-lg border border-white/10 bg-black/20 p-5">
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Score over time
        </h2>
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-white/10 bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/5" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );
}
