"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Error boundary for live interview routes. Problem-generation / setup-resolution
 * failures recover back to setup.
 */
export default function InterviewError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">We couldn&apos;t start your interview</h2>
      <p className="text-muted-foreground text-sm">Please try again or head back to setup.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/setup" className={buttonVariants({ variant: "outline" })}>
          Back to setup
        </Link>
      </div>
    </div>
  );
}
