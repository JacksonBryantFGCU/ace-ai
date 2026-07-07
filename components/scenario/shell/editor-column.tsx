"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronRight, Lock, X } from "lucide-react";
import { WorkspaceEditor } from "@/components/scenario/workspace-editor";
import { shell } from "@/components/scenario/shell/tokens";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";

const ext = (path: string) => (path.split(".").pop() || "").toUpperCase();

/** Friendly language label for the status bar (mirrors VS Code's wording). */
function languageLabel(path: string): string {
  const e = path.split(".").pop()?.toLowerCase();
  switch (e) {
    case "tsx":
      return "TypeScript React";
    case "ts":
      return "TypeScript";
    case "jsx":
      return "JavaScript React";
    case "js":
      return "JavaScript";
    case "css":
      return "CSS";
    case "json":
      return "JSON";
    case "html":
      return "HTML";
    case "md":
      return "Markdown";
    default:
      return e ? e.toUpperCase() : "Plain Text";
  }
}

/**
 * The editor column: open-file tab bar (a proper ARIA `tablist` with roving
 * tabindex + Arrow/Home/End/Delete), a path breadcrumb, the Monaco workspace
 * editor, and a status bar. Folds in the old `WorkspacePanel` behavior with the
 * new IDE chrome.
 */
export function EditorColumn({ api }: { api: ScenarioSessionApi }) {
  const { session, active, error, edit, open, close, clearError } = api;
  const tablistRef = useRef<HTMLDivElement>(null);
  const openFiles = session.openFileIds
    .map((id) => session.files.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const focusTab = (index: number) => {
    requestAnimationFrame(() => {
      tablistRef.current
        ?.querySelector<HTMLButtonElement>(`[role="tab"][data-index="${index}"]`)
        ?.focus();
    });
  };

  const onTabKeyDown = (event: KeyboardEvent) => {
    const count = openFiles.length;
    if (count === 0) return;
    const currentIndex = openFiles.findIndex((f) => f.id === session.activeFileId);

    if (event.key === "Delete" || event.key === "Backspace") {
      const file = openFiles[currentIndex];
      if (file) {
        event.preventDefault();
        close(file.id);
        focusTab(Math.min(currentIndex, count - 2));
      }
      return;
    }

    let next = currentIndex;
    if (event.key === "ArrowRight") next = (currentIndex + 1) % count;
    else if (event.key === "ArrowLeft") next = (currentIndex - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;

    event.preventDefault();
    const file = openFiles[next];
    if (file) {
      open(file.id);
      focusTab(next);
    }
  };

  const crumbs = active ? active.path.split("/") : [];

  return (
    <div className="flex min-w-0 flex-1 flex-col" style={{ background: shell.editorBg }}>
      {/* Tab bar */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Open files"
        onKeyDown={onTabKeyDown}
        className="flex h-10 flex-none items-stretch overflow-x-auto"
        style={{ background: shell.tabBarBg, borderBottom: `1px solid ${shell.borderSoft}` }}
      >
        {openFiles.map((file, index) => {
          const isActive = file.id === session.activeFileId;
          return (
            <div
              key={file.id}
              className="group relative flex items-center gap-2 px-3.5"
              style={{
                background: isActive ? shell.editorBg : "transparent",
                borderRight: `1px solid ${shell.borderSoft}`,
              }}
            >
              {isActive ? (
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: shell.accent }} aria-hidden="true" />
              ) : null}
              <button
                type="button"
                role="tab"
                data-index={index}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => open(file.id)}
                className="flex items-center gap-2 py-0 font-mono text-[13px] focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none"
                style={{ color: isActive ? shell.titleText : shell.tabInactiveText }}
              >
                {file.role === "readonly" ? (
                  <Lock className="size-[13px]" style={{ color: shell.textFainter }} />
                ) : (
                  <span
                    className="rounded font-mono text-[10px] font-bold"
                    style={{
                      padding: "2px 4px",
                      color: isActive ? shell.accent : "#8b95a3",
                      background: isActive ? shell.infoBg : "rgba(255,255,255,.06)",
                    }}
                  >
                    {ext(file.path)}
                  </span>
                )}
                {file.path}
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => close(file.id)}
                aria-label={`Close ${file.path}`}
                className={`rounded p-0.5 text-[#8b95a3] hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:outline-none ${
                  isActive ? "" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb */}
      {active ? (
        <div
          className="flex h-8 flex-none items-center gap-1.5 px-4 font-mono text-xs"
          style={{ background: shell.breadcrumbBg, borderBottom: `1px solid ${shell.borderFaint}`, color: shell.tabInactiveText }}
        >
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5">
                <span style={last ? { color: shell.text } : undefined}>{crumb}</span>
                {last ? null : <ChevronRight className="size-3" style={{ color: shell.breadcrumbSep }} />}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Error banner */}
      {error ? (
        <div className="flex items-center justify-between bg-red-500/15 px-3 py-1.5 text-sm text-red-300" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss"
            className="rounded p-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <WorkspaceEditor files={session.files} activeFile={active} onEdit={edit} />
      </div>

      {/* Status bar */}
      <div
        className="flex h-7 flex-none items-center gap-4 px-3.5 font-mono text-[11.5px]"
        style={{ background: shell.statusBarBg, borderTop: `1px solid ${shell.border}`, color: shell.textMuted }}
      >
        <span className="inline-flex items-center gap-1.5" style={{ color: shell.presenceSpeaking }}>
          <span className="size-[7px] rounded-full" style={{ background: shell.presenceRing }} />
          All changes saved
        </span>
        <span className="ml-auto">Spaces: 2</span>
        <span>UTF-8</span>
        {active ? <span style={{ color: shell.text }}>{languageLabel(active.path)}</span> : null}
      </div>
    </div>
  );
}
