"use client";

import { Moon, RotateCcw, Sun } from "lucide-react";
import type { PreviewStory } from "@/lib/scenarios/preview/types";
import { shell } from "@/components/scenario/shell/tokens";
import { previewControlActiveClass, previewControlClass } from "@/components/scenario/preview/preview-chrome";
import { cn } from "@/lib/utils";

export type PreviewTheme = "light" | "dark";

/**
 * The preview panel's control strip (Phase 5.2): story picker, theme, and Reset
 * Preview. Pure presentation — every piece of state it shows/changes is owned
 * by `ComponentPreviewFrame`; this component never talks to the sandbox
 * directly. A story that pins its own theme (docs §6/§11) disables that control
 * rather than hiding it, so it stays visible what the story forces.
 */
export function PreviewToolbar({
  stories,
  activeStoryId,
  onStoryChange,
  theme,
  onThemeChange,
  themePinned,
  onReset,
}: {
  stories: PreviewStory[];
  activeStoryId: string;
  onStoryChange: (id: string) => void;
  theme: PreviewTheme;
  onThemeChange: (theme: PreviewTheme) => void;
  themePinned: boolean;
  onReset: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 border-b px-2.5 py-2"
      style={{ borderColor: shell.border, background: shell.panelFooterBg }}
    >
      {stories.length > 1 ? (
        <select
          aria-label="Preview story"
          value={activeStoryId}
          onChange={(e) => onStoryChange(e.target.value)}
          className={cn(previewControlClass, "min-w-0 flex-1")}
        >
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="flex-1" />
      )}

      <button
        type="button"
        role="switch"
        aria-checked={theme === "dark"}
        aria-label="Preview theme"
        disabled={themePinned}
        title={themePinned ? "Pinned by the active story" : "Toggle preview theme"}
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className={cn(previewControlClass, "flex-none", theme === "dark" && previewControlActiveClass)}
      >
        {theme === "dark" ? (
          <Moon className="size-3.5" aria-hidden="true" />
        ) : (
          <Sun className="size-3.5" aria-hidden="true" />
        )}
        {theme === "dark" ? "Dark" : "Light"}
      </button>

      <button
        type="button"
        aria-label="Reset preview"
        title="Reset preview (clears in-preview state only)"
        onClick={onReset}
        className={cn(previewControlClass, "flex-none")}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
