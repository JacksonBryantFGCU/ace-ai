import { Play } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/interview/code-editor";
import { TestResults } from "@/components/interview/test-results";
import type { ProgrammingLanguage } from "@/types/interview";
import type { TestResult } from "@/lib/code-exec/types";

/** Right-panel code workspace: language header + Run + Monaco editor + results. */
export function CodePanel({
  language,
  code,
  onChange,
  onRun,
  running,
  results,
  disabled,
}: {
  language: ProgrammingLanguage;
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  running: boolean;
  results: TestResult[] | null;
  disabled: boolean;
}) {
  const meta = LANGUAGES[language];

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-xl backdrop-blur-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-sm font-medium text-gray-300">{meta?.label ?? language}</span>
        <Button
          variant="brand"
          size="sm"
          onClick={onRun}
          disabled={running || disabled}
          className="gap-1.5 rounded-lg"
        >
          <Play className="size-3.5" />
          {running ? "Running…" : "Run Tests"}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <CodeEditor language={meta?.monaco ?? "plaintext"} value={code} onChange={onChange} />
      </div>

      <div className="max-h-56 shrink-0 overflow-y-auto border-t border-white/10">
        <TestResults results={results} running={running} />
      </div>
    </div>
  );
}
