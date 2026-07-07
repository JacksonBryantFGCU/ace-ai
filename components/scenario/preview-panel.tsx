"use client";

import { useMemo } from "react";
import { PreviewEmpty } from "@/components/scenario/preview/preview-chrome";
import { shell } from "@/components/scenario/shell/tokens";
import { previewRendererRegistry } from "@/lib/scenarios/preview/renderers/registry";
import { createPreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import { renderPreview } from "@/lib/scenarios/preview/runtime";
import type { LoadedScenario, SessionFile } from "@/lib/scenarios/types";

/**
 * The reserved location for live preview output (Preview Runtime architecture
 * doc §11 "Preview panel"). Shows the empty state when the scenario has no
 * `preview/` folder or no renderer is registered for its kind; otherwise asks
 * the Preview Runtime to render it. Presentational only: it builds a
 * `PreviewSnapshot` from the files it's handed, but owns no interview state
 * itself.
 */
export function PreviewPanel({
  loaded,
  files,
}: {
  loaded: LoadedScenario;
  files: SessionFile[];
}) {
  // Always previews the scenario's fixed entry (`workspace.entry`), NOT
  // whichever file the candidate currently has open in the editor — the
  // entry is what `Preview.tsx` imports (docs §8), and switching editor tabs
  // must never itself trigger a recompile (Phase 3 perf requirement).
  // Memoized so an unrelated parent re-render (e.g. the interview timer, or
  // switching tabs, which doesn't change `files`' identity) doesn't hand the
  // renderer a new snapshot identity — only an actual file-content change
  // should restart the debounced re-render cycle.
  const snapshot = useMemo(
    () => createPreviewSnapshot({ scenario: loaded.scenario, files, activeFile: loaded.entry }),
    [loaded.scenario, loaded.entry, files],
  );
  const output = renderPreview(loaded.preview, snapshot, previewRendererRegistry);

  return (
    <div
      className="flex w-[360px] max-w-[38vw] flex-none flex-col"
      style={{ background: shell.panelBg, borderLeft: `1px solid ${shell.border}` }}
    >
      {output.status === "rendered" ? output.node : <PreviewEmpty />}
    </div>
  );
}
