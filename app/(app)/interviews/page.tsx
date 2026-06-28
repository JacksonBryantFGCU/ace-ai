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
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Past Interviews</h1>
        <p className="text-gray-600">Select any session to replay the full conversation.</p>
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
        <div key={i} className="glass-card h-[68px] animate-pulse" />
      ))}
    </div>
  );
}
