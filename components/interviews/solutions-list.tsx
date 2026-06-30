import { Check, X } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { CodeSubmission } from "@/types/interview";

/**
 * The candidate's code submissions for a technical interview replay (dark
 * surface). Each problem shows a pass/fail badge and the final code; native
 * `<details>` keeps it collapsible without client JS.
 */
export function SolutionsList({ submissions }: { submissions: CodeSubmission[] }) {
  if (submissions.length === 0) return null;

  return (
    <div className="space-y-4">
      {submissions.map((s, i) => (
        <details key={i} className="group rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-300">
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-white">{s.problemTitle}</span>
            {s.passed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <Check className="size-3.5" />
                Passed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                <X className="size-3.5" />
                Failed
              </span>
            )}
          </summary>

          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              {LANGUAGES[s.language]?.label ?? s.language}
            </p>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-gray-200">
              <code>{s.code}</code>
            </pre>
          </div>
        </details>
      ))}
    </div>
  );
}
