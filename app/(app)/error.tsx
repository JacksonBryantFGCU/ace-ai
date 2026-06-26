"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for all authenticated pages. Handles unexpected server-read
 * failures (Supabase/OpenAI/network) with a retry. Expected misses (e.g. a bad
 * interview id) are handled with `notFound()` in the page, not here.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // TODO(observability): forward to a logger/Sentry once configured.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
