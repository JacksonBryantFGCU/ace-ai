import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the evaluation report, shown while scoring runs. Mirrors
 * the report's overall-score header + a scored-dimensions block so the real report
 * settles in without a jump. Announces itself for assistive tech.
 */
export function EvaluationSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Scoring your interview"
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <span className="sr-only">Scoring your interview…</span>
      <div className="mx-auto max-w-3xl space-y-6 py-2">
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-black/20 p-5">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
