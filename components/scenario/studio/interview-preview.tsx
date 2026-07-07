"use client";

import { useState } from "react";
import { Play, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { loadPreviewScenario } from "@/actions/authoring";
import { ScenarioWorkspace } from "@/components/scenario/scenario-workspace";
import { EmptyState } from "@/components/ui/empty-state";
import type { LoadedScenario } from "@/lib/scenarios/types";

/**
 * Preview Interview — launch the selected scenario as the REAL candidate runtime
 * (`ScenarioWorkspace`) with no setup flow. Everything the runtime supports is
 * live here: button + voice controls, hints, verification, checkpoints, and the
 * completion evaluation report. Author-only rubrics/hints are included so the
 * author sees the full experience.
 *
 * The parent keys this component on the slug, so switching scenarios remounts it
 * fresh — no reset effect needed.
 */
export function InterviewPreview({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<LoadedScenario | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [nonce, setNonce] = useState(0);

  async function launch() {
    setStatus("loading");
    const result = await loadPreviewScenario(slug);
    if (result) {
      setLoaded(result);
      setStatus("idle");
    } else {
      setStatus("error");
    }
  }

  if (loaded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Live preview · {loaded.scenario.title}</span>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1 text-sm text-gray-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
          >
            <RotateCcw className="size-3.5" /> Restart
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10">
          <ScenarioWorkspace key={`${slug}:${nonce}`} loaded={loaded} onRestart={() => setNonce((n) => n + 1)} />
        </div>
      </div>
    );
  }

  return (
    <EmptyState
      icon={status === "error" ? AlertTriangle : Play}
      title={status === "error" ? "Couldn't load this scenario" : "Preview the interview"}
      description={
        status === "error"
          ? "The scenario failed to load. Check the Validation tab for errors."
          : "Launch the selected scenario as the real candidate runtime — no setup flow."
      }
      action={
        <button
          type="button"
          onClick={launch}
          disabled={status === "loading"}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
        >
          {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {status === "loading" ? "Loading…" : "Launch preview"}
        </button>
      }
    />
  );
}
