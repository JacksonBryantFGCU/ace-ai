"use client";

import { AlertTriangle, CheckCircle2, Circle, XCircle } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type {
  TestCaseStatus,
  VerificationResult,
  VerificationStatus,
} from "@/lib/scenarios/verification";

/**
 * Renders a structured VerificationResult. Harness-agnostic — it only reads the
 * typed result, never anything test-tech-specific, so every engine (component /
 * node / sql / docker / …) renders identically.
 */
export function VerificationResultCard({ result }: { result: VerificationResult }) {
  return (
    <div className="space-y-2 rounded-md border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <StatusBadge tone={statusTone(result.status)}>{statusLabel(result.status)}</StatusBadge>
        <span className="text-xs text-gray-500">{result.durationMs} ms</span>
      </div>

      {result.message ? <p className="text-xs text-gray-400">{result.message}</p> : null}

      {result.groups?.length ? (
        <div className="space-y-2">
          {result.groups.map((group) => (
            <details key={group.name} className="rounded-md border border-white/10 bg-white/[0.03] p-2" open={!group.ok}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-gray-200">
                <span className="capitalize">{group.name}</span>
                <span className={group.skipped ? "text-gray-400" : group.ok ? "text-green-400" : "text-red-400"}>
                  {group.skipped ? "Skipped" : group.ok ? "Passed" : "Failed"}
                </span>
              </summary>
              {group.reason ? <p className="mt-2 text-xs text-gray-400">{group.reason}</p> : null}
              {group.command ? <p className="mt-2 break-all text-[11px] text-gray-500">{group.command}</p> : null}
              {group.output ? (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/30 p-2 font-mono text-[11px] whitespace-pre-wrap text-gray-300">
                  {group.output}
                </pre>
              ) : null}
            </details>
          ))}
        </div>
      ) : null}

      {result.groups?.length ? null : result.testResults.length > 0 ? (
        <ul className="space-y-1">
          {result.testResults.map((test) => (
            <li key={test.name} className="flex items-center gap-2 text-sm text-gray-200">
              <TestIcon status={test.status} />
              <span className="truncate">{test.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {result.errors.length > 0 ? (
        <ul className="space-y-1">
          {result.errors.map((err, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span className="break-words">{err.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TestIcon({ status }: { status: TestCaseStatus }) {
  if (status === "passed") return <CheckCircle2 className="size-4 shrink-0 text-green-400" />;
  if (status === "failed") return <XCircle className="size-4 shrink-0 text-red-400" />;
  return <Circle className="size-4 shrink-0 text-gray-500" />;
}

function statusLabel(status: VerificationStatus): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "errored":
      return "Error";
    case "manual":
      return "Manual review";
    case "unsupported":
      return "Unsupported";
  }
}

function statusTone(status: VerificationStatus): StatusTone {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
    case "errored":
      return "danger";
    case "manual":
      return "warning";
    case "unsupported":
      return "neutral";
  }
}
