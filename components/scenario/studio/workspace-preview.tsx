"use client";

import { useMemo, useState } from "react";
import { CodeViewer } from "@/components/scenario/studio/code-viewer";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scenario } from "@/lib/scenarios/schema";

interface Variant {
  id: string;
  label: string;
  /** prefix → target path (prefix stripped so paths read as workspace-relative). */
  prefix: string;
}

/** Build the set of preview variants: starter, then one per step that has a solution. */
function buildVariants(scenario: Scenario, files: Record<string, string>): Variant[] {
  const variants: Variant[] = [{ id: "starter", label: "Starter workspace", prefix: "workspace/" }];
  scenario.steps.forEach((step, i) => {
    const prefix = `solution/${step.id}/`;
    if (Object.keys(files).some((p) => p.startsWith(prefix))) {
      const isLast = i === scenario.steps.length - 1;
      variants.push({ id: step.id, label: `${isLast ? "Final · " : ""}After ${step.id}`, prefix });
    }
  });
  return variants;
}

function filesFor(files: Record<string, string>, prefix: string): { path: string; content: string }[] {
  return Object.entries(files)
    .filter(([p]) => p.startsWith(prefix))
    .map(([p, content]) => ({ path: p.slice(prefix.length), content }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Workspace Preview — switch between the starter workspace, each checkpoint
 * workspace, and the final solution, browsing files read-only. Reuses the same
 * authored files the runtime seeds from, so what an author sees is what a
 * candidate starts with (or is restored to).
 */
export function WorkspacePreview({
  scenario,
  files,
  focusFile,
}: {
  scenario: Scenario;
  files: Record<string, string>;
  /** A scenario-relative file to reveal on mount (e.g. from a validation click). */
  focusFile?: string | null;
}) {
  const variants = useMemo(() => buildVariants(scenario, files), [scenario, files]);

  // If a focus file was passed, open the variant whose prefix contains it.
  const initialVariant =
    (focusFile && variants.find((v) => focusFile.startsWith(v.prefix))?.id) ?? variants[0]!.id;
  const [variantId, setVariantId] = useState(initialVariant);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]!;

  const variantFiles = useMemo(() => filesFor(files, variant.prefix), [files, variant.prefix]);
  const focusRelative = focusFile?.startsWith(variant.prefix) ? focusFile.slice(variant.prefix.length) : null;
  const [openPath, setOpenPath] = useState<string | null>(focusRelative);
  const activePath =
    (openPath && variantFiles.some((f) => f.path === openPath) && openPath) ||
    focusRelative ||
    variantFiles[0]?.path ||
    null;
  const active = variantFiles.find((f) => f.path === activePath) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVariantId(v.id);
              setOpenPath(null);
            }}
            className={cn(
              "rounded-md border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
              v.id === variant.id ? "border-blue-400/60 bg-blue-500/10 text-blue-200" : "border-white/15 text-gray-300 hover:bg-white/5",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <ul className="w-52 shrink-0 space-y-0.5 overflow-y-auto">
          {variantFiles.length === 0 ? (
            <li className="text-xs text-gray-500">No files.</li>
          ) : (
            variantFiles.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setOpenPath(f.path)}
                  className={cn(
                    "w-full truncate rounded px-2 py-1 text-left font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none",
                    f.path === activePath ? "bg-blue-500/10 text-blue-200" : "text-gray-400 hover:bg-white/5",
                  )}
                  title={f.path}
                >
                  {f.path}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-black/30">
          {active ? (
            <CodeViewer path={active.path} content={active.content} />
          ) : (
            <EmptyState icon={FolderTree} title="No files in this variant" />
          )}
        </div>
      </div>
    </div>
  );
}
