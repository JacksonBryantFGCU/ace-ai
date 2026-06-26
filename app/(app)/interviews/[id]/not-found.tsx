import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Expected miss: a bad or foreign interview id. Friendly 404, not an error.
 */
export default function InterviewNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h2 className="text-xl font-semibold">Interview not found</h2>
      <p className="text-muted-foreground text-sm">
        This interview doesn&apos;t exist or isn&apos;t yours to view.
      </p>
      <Link href="/interviews" className={buttonVariants()}>
        Back to history
      </Link>
    </div>
  );
}
