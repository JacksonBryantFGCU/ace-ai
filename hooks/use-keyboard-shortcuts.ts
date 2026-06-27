"use client";

import { useEffect } from "react";

/** Ported verbatim from the legacy `useKeyboardShortcuts`. */

export interface ShortcutConfig {
  handler: () => void;
  description: string;
  /** Human-readable combo, e.g. "Ctrl+Enter". */
  label: string;
  enabled?: boolean;
  /** Allow this shortcut to fire even when an input/textarea is focused. */
  allowInInput?: boolean;
}

export type ShortcutsMap = Record<string, ShortcutConfig>;

/**
 * Canonical combo string from a KeyboardEvent.
 * Format: optional "ctrl+" (Ctrl/Cmd), optional "shift+", then lowercase key.
 * Examples: "ctrl+enter", "ctrl+shift+enter", "escape", "m", "ctrl+shift+m".
 */
function comboFromEvent(e: KeyboardEvent): string {
  let combo = "";
  if (e.ctrlKey || e.metaKey) combo += "ctrl+";
  if (e.shiftKey) combo += "shift+";
  combo += e.key.toLowerCase();
  return combo;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  const ce = el.getAttribute("contenteditable");
  return (
    tag === "input" ||
    tag === "textarea" ||
    el.isContentEditable ||
    (ce !== null && ce !== "false")
  );
}

export function useKeyboardShortcuts(shortcuts: ShortcutsMap) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const combo = comboFromEvent(e);
      const shortcut = shortcuts[combo];
      if (!shortcut) return;
      if (shortcut.enabled === false) return;
      if (!shortcut.allowInInput && isTypingTarget(e.target)) return;
      e.preventDefault();
      shortcut.handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
