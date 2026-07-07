"use client";

import type { ReactNode } from "react";
import { Loader2, MonitorPlay, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared visual language for the live preview panel — ONE place that owns the
 * preview's frame, brand mark, control styling, and every runtime state
 * (loading, compile error, runtime error, disconnected, empty). Both the
 * preview toolbar and the preview frame import from here so the experience
 * reads the same regardless of scenario; nothing about the preview is styled
 * per-scenario. This is presentation only — it holds no sandbox/runtime logic.
 */

/** Neutral stage the iframe "card" floats on, and the framed card treatment
 *  itself (rounded, hairline border, soft shadow). */
export const previewStageClass = "relative flex min-h-0 flex-1 items-stretch overflow-auto p-3";

export const previewCardClass =
  "flex w-full overflow-hidden rounded-xl border border-white/10 bg-[var(--preview-canvas)] shadow-[0_10px_40px_-16px_rgba(0,0,0,0.7)]";

/** Shared control styling for every toolbar button/select. */
export const previewControlClass =
  "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.04]";

export const previewControlActiveClass = "border-blue-400/40 bg-blue-500/15 text-blue-100";

/** Full-surface overlay for the transient states (loading, compiling), with a
 *  soft fade so state changes don't flash. */
function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in absolute inset-3 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/95 text-center text-xs text-gray-600 duration-200">
      {children}
    </div>
  );
}

export function PreviewLoading({ label }: { label: string }) {
  return (
    <Overlay>
      <Loader2 className="size-5 animate-spin text-gray-400" aria-hidden="true" />
      <p className="font-medium text-gray-500">{label}</p>
    </Overlay>
  );
}

export function PreviewDisconnected({ onReload }: { onReload: () => void }) {
  return (
    <Overlay>
      <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <PlugZap className="size-4" aria-hidden="true" />
      </span>
      <div className="space-y-0.5">
        <p className="font-medium text-gray-700">Preview disconnected.</p>
        <p className="text-gray-500">The sandbox stopped responding.</p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
      >
        Reload preview
      </button>
    </Overlay>
  );
}

export interface PreviewError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

/**
 * Compile / runtime error card. Anchored to the bottom of the stage so the
 * last good render stays visible above it. Compile errors read as amber
 * (a fixable authoring/syntax problem), runtime errors as red (the component
 * threw). The message region scrolls and preserves whitespace, keeping any
 * stack trace intact.
 */
export function PreviewErrorCard({
  kind,
  error,
}: {
  kind: "compile-error" | "runtime-error";
  error: PreviewError;
}) {
  const isCompile = kind === "compile-error";
  const location =
    error.file != null
      ? `${error.file}${error.line != null ? `:${error.line}${error.column != null ? `:${error.column}` : ""}` : ""}`
      : null;
  return (
    <div
      role="alert"
      className={cn(
        "absolute inset-x-3 bottom-3 max-h-[60%] overflow-y-auto rounded-lg border shadow-lg backdrop-blur-sm",
        isCompile ? "border-amber-500/30 bg-amber-950/85" : "border-red-500/30 bg-red-950/85",
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            isCompile ? "bg-amber-500/20 text-amber-200" : "bg-red-500/20 text-red-200",
          )}
        >
          {isCompile ? "Compile error" : "Runtime error"}
        </span>
        {location ? (
          <span className={cn("truncate font-mono text-[11px]", isCompile ? "text-amber-300/90" : "text-red-300/90")}>
            {location}
          </span>
        ) : null}
      </div>
      <pre
        className={cn(
          "px-3 pt-1.5 pb-3 font-mono text-xs leading-relaxed whitespace-pre-wrap",
          isCompile ? "text-amber-100/90" : "text-red-100/90",
        )}
      >
        {error.message}
      </pre>
    </div>
  );
}

/** Polished empty state for when a scenario ships no preview. */
export function PreviewEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-500">
        <MonitorPlay className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-gray-300">No preview available</p>
      <p className="max-w-[15rem] text-xs leading-relaxed text-gray-500">
        This scenario doesn&apos;t include a live preview. Your work is still verified against the tests.
      </p>
    </div>
  );
}
