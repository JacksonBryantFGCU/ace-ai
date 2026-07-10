"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { fetchMlDataPreview, listMlScenarioDataFiles } from "@/actions/scenario";
import { shell } from "@/components/scenario/shell/tokens";
import type { MlDataPreview } from "@/lib/scenarios/machine-learning-data-preview";

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.13em]";

/** A preview fetch result, tagged with the file it was fetched FOR — lets the
 *  render derive "is this still current" instead of an effect resetting
 *  state when the selection changes. */
interface PreviewFor {
  file: string;
  result: MlDataPreview;
}

/** Same tagging trick for the error path. */
interface PreviewErrorFor {
  file: string;
  message: string;
}

/**
 * The ML "Data Preview" panel tab (Phase 4): lists the scenario's candidate-
 * visible `workspace/data/*.csv` files and shows a bounded preview (columns +
 * first rows) of the selected one. Server-driven — the browser only ever holds
 * the small, already-capped `MlDataPreview` returned by `fetchMlDataPreview`,
 * never the raw file content.
 */
export function DataPreviewTab({ scenarioSlug }: { scenarioSlug: string }) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewFor | null>(null);
  const [previewError, setPreviewError] = useState<PreviewErrorFor | null>(null);

  useEffect(() => {
    let active = true;
    listMlScenarioDataFiles(scenarioSlug)
      .then((list) => {
        if (!active) return;
        setFiles(list);
        setSelected(list[0] ?? null);
      })
      .catch((e) => {
        if (active) setFilesError(e instanceof Error ? e.message : "Failed to list data files.");
      });
    return () => {
      active = false;
    };
  }, [scenarioSlug]);

  // No synchronous `setState` in this effect body at all — every update
  // happens inside an async callback (`.then`/`.catch`), tagged with the
  // `selected` file it was fetched for. "Loading" and "stale from a previous
  // selection" are both derived from that tag at render time below, instead
  // of separate `previewLoading`/reset-on-change state.
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const file = selected;
    fetchMlDataPreview(scenarioSlug, file)
      .then((result) => {
        if (active) setPreview({ file, result });
      })
      .catch((e) => {
        if (active) {
          setPreviewError({ file, message: e instanceof Error ? e.message : "Failed to load data preview." });
        }
      });
    return () => {
      active = false;
    };
  }, [scenarioSlug, selected]);

  // Derived, not stored: a `preview`/`previewError` only counts if it was
  // fetched for the CURRENTLY selected file — anything left over from a
  // prior selection or scenario is automatically stale and ignored, with no
  // effect needed to reset it. "Loading" is simply "selected, but neither a
  // matching result nor a matching error has arrived yet".
  const displayedPreview = selected && preview?.file === selected ? preview.result : null;
  const displayedPreviewError = selected && previewError?.file === selected ? previewError.message : null;
  const previewLoading = !!selected && !displayedPreview && !displayedPreviewError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div>
        <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
          Dataset files
        </span>

        {filesError ? (
          <EmptyPanel icon={<AlertTriangle className="size-4" />} message={filesError} />
        ) : files === null ? (
          <LoadingPanel label="Loading dataset files..." />
        ) : files.length === 0 ? (
          <EmptyPanel icon={<Database className="size-4" />} message="No data files found for this scenario." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {files.map((file) => (
              <li key={file}>
                <button
                  type="button"
                  onClick={() => setSelected(file)}
                  aria-current={file === selected ? "true" : undefined}
                  className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2 text-left text-[12.5px] font-mono transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                  style={{
                    background: file === selected ? "rgba(59,130,246,.14)" : "rgba(255,255,255,.03)",
                    border: `1px solid ${file === selected ? "rgba(59,130,246,.35)" : shell.borderSoft}`,
                    color: file === selected ? "#ffffff" : shell.text,
                  }}
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {files && files.length > 0 ? (
        <div>
          <span className={`${SECTION_LABEL} mb-[9px] block`} style={{ color: shell.textFaint }}>
            Preview
          </span>

          {displayedPreviewError ? (
            <EmptyPanel icon={<AlertTriangle className="size-4" />} message={displayedPreviewError} />
          ) : previewLoading || !displayedPreview ? (
            <LoadingPanel label="Loading preview..." />
          ) : displayedPreview.columns.length === 0 ? (
            <EmptyPanel icon={<Database className="size-4" />} message="No previewable rows in this file yet." />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: shell.textFainter }}>
                {displayedPreview.fileName}
                {typeof displayedPreview.rowCount === "number"
                  ? ` — ${displayedPreview.rowCount} row${displayedPreview.rowCount === 1 ? "" : "s"}${displayedPreview.truncated ? ` (showing first ${displayedPreview.rows.length})` : ""}`
                  : null}
              </p>
              <div
                className="overflow-x-auto rounded-[9px]"
                style={{ border: `1px solid ${shell.borderSoft}` }}
              >
                <table className="w-full border-collapse text-left font-mono text-[11.5px]">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,.04)" }}>
                      {displayedPreview.columns.map((column) => (
                        <th
                          key={column}
                          className="px-2.5 py-1.5 font-semibold whitespace-nowrap"
                          style={{ color: shell.text, borderBottom: `1px solid ${shell.borderSoft}` }}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPreview.rows.map((row, i) => (
                      <tr key={i}>
                        {displayedPreview.columns.map((column) => (
                          <td
                            key={column}
                            className="px-2.5 py-1.5 whitespace-nowrap"
                            style={{ color: shell.textMuted, borderBottom: `1px solid ${shell.borderFaint}` }}
                          >
                            {row[column] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {displayedPreview.truncated ? (
                <p className="text-[11px]" style={{ color: shell.textFainter }}>
                  Showing the first {displayedPreview.rows.length} rows only.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-[12.5px]"
      style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}`, color: shell.textFainter }}
    >
      <Loader2 className="size-3.5 animate-spin" />
      {label}
    </div>
  );
}

function EmptyPanel({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-[12.5px]"
      style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${shell.borderSoft}`, color: shell.textFainter }}
    >
      {icon}
      {message}
    </div>
  );
}
