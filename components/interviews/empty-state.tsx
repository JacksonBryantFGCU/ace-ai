import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Expected "no rows" case for the history list — an empty state, not an error. */
export function InterviewsEmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">No interviews yet</h2>
        <p className="text-muted-foreground text-sm">
          Complete your first interview to see it here.
        </p>
      </div>
      <Link href="/setup" className={buttonVariants()}>
        Start an interview
      </Link>
    </div>
  );
}
