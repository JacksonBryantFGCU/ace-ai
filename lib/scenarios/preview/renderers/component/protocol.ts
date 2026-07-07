import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";

/**
 * The postMessage protocol between the host (`ComponentPreviewFrame`) and the
 * sandboxed `/preview-sandbox` route — typed, one-way-in / one-way-out
 * (docs/README.md). This is NOT a general
 * RPC channel: the host only ever asks for a render; the sandbox only ever
 * reports its own status back. Every field is plain, structured-cloneable
 * data — a `PreviewSnapshot`'s files are flattened into plain
 * `PreviewModuleFile`s before crossing the boundary.
 */

export interface PreviewModuleFile {
  path: string;
  content: string;
}

export interface RenderRequestMessage {
  type: "render";
  requestId: number;
  files: PreviewModuleFile[];
  entryPath: string;
  previewSource: string;
  providersSource?: string;
  /** Optional authored `preview/preview.css` (§ Phase 5.2) — injected into the
   *  sandbox document, layered over the shared `.preview-canvas` base. */
  css?: string;
  /** The active story's `props` (docs §6) — plain, serializable data forwarded
   *  as props on `Preview.tsx`'s default export. */
  storyProps?: Record<string, unknown>;
  /** The effective theme (story-pinned or panel-selected, §11) — forwarded as
   *  a `theme` prop through the same mechanism as `storyProps`. Isolated to
   *  the sandbox; never touches the host application's theme. */
  theme?: "light" | "dark";
  /** Reset Preview (§ Phase 3): force the sandbox to tear down and remount
   *  from scratch — clears any candidate-component-owned state — instead of
   *  the usual in-place update. Candidate files/snapshot are unchanged. */
  reset?: boolean;
}

export type HostToSandboxMessage = RenderRequestMessage;

export type SandboxToHostMessage =
  | { type: "sandbox-ready" }
  | { type: "rendered"; requestId: number }
  | {
      type: "render-error";
      requestId: number;
      phase: "compile" | "runtime";
      message: string;
      stack?: string;
      file?: string;
      line?: number;
      column?: number;
    };

export interface RenderRequestOptions {
  css?: string;
  storyProps?: Record<string, unknown>;
  theme?: "light" | "dark";
  reset?: boolean;
}

/** Flatten a `PreviewSnapshot` + authored bundle source into a postMessage-safe
 *  render request — the only place a snapshot crosses the sandbox boundary. */
export function toRenderRequest(
  requestId: number,
  snapshot: PreviewSnapshot,
  previewSource: string,
  providersSource: string | undefined,
  options: RenderRequestOptions = {},
): RenderRequestMessage {
  return {
    type: "render",
    requestId,
    files: snapshot.files.map((f) => ({ path: f.path, content: f.content })),
    entryPath: snapshot.activeFile,
    previewSource,
    providersSource,
    css: options.css,
    storyProps: options.storyProps,
    theme: options.theme,
    reset: options.reset,
  };
}
