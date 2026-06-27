import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { InterviewList } from "@/components/interviews/interview-list";

export const metadata: Metadata = {
  title: "Interview history",
};

export default async function InterviewsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Interview history</h1>
        <p className="text-muted-foreground text-sm">Review your past interviews and scores.</p>
      </div>

      <Suspense fallback={<InterviewListSkeleton />}>
        <InterviewList userId={user.id} />
      </Suspense>
    </div>
  );
}

function InterviewListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
