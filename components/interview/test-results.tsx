import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestResult } from "@/lib/code-exec/types";

/** Renders the per-test-case results panel below the editor. */
export function TestResults({ results, running }: { results: TestResult[] | null; running: boolean }) {
  if (running) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300">
        <span className="size-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        Running tests…
      </div>
    );
  }

  if (!results) {
    return <p className="px-4 py-3 text-sm text-gray-500">Run your code to see test results.</p>;
  }

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return (
    <div className="space-y-2 px-4 py-3" aria-live="polite">
      <p className={cn("text-sm font-semibold", allPassed ? "text-emerald-400" : "text-gray-300")}>
        {passedCount}/{results.length} tests passed
      </p>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              r.passed ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10",
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {r.passed ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <X className="size-3.5 text-red-400" />
              )}
              <span className={r.passed ? "text-emerald-300" : "text-red-300"}>
                Test {i + 1}: {r.passed ? "Passed" : "Failed"}
              </span>
            </div>
            {!r.passed ? (
              <div className="mt-1 space-y-0.5 font-mono text-[11px] text-gray-400">
                <p>expected: {r.expected}</p>
                <p>actual: {r.actual}</p>
                {r.error ? <p className="text-red-400">error: {r.error}</p> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
