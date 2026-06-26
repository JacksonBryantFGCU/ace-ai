"use client";

import { useEffect } from "react";

/**
 * Catastrophic boundary: replaces the root layout when it crashes, so it must
 * render its own <html>/<body>.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-neutral-500">An unexpected error occurred.</p>
        <button onClick={reset} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
          Try again
        </button>
      </body>
    </html>
  );
}
