import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { InterviewList } from "@/components/interviews/interview-list";
import { HistoryFilterBar } from "@/components/interviews/history-filter-bar";
import { asRole } from "@/lib/constants";
import type { InterviewFilters } from "@/server/storage";
import type { QuestionType } from "@/types/interview";

export const metadata: Metadata = {
  title: "Interview history",
};

function parseType(value: string | undefined): QuestionType | undefined {
  return value === "behavioral" || value === "technical" ? value : undefined;
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; role?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const filters: InterviewFilters = {
    questionType: parseType(params.type),
    role: asRole(params.role),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Past Interviews</h1>
        <p className="text-gray-600">Select any session to replay the full conversation.</p>
      </div>

      <HistoryFilterBar type={filters.questionType} role={filters.role} />

      <Suspense
        key={`${filters.questionType ?? ""}:${filters.role ?? ""}`}
        fallback={<InterviewListSkeleton />}
      >
        <InterviewList userId={user.id} filters={filters} />
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
