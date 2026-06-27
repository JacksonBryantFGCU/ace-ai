"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, X } from "lucide-react";
import type { ShortcutsMap } from "@/hooks/use-keyboard-shortcuts";

/** Floating keyboard-shortcuts reference. Ported from the legacy component. */
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: ShortcutsMap }) {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  const entries = Object.entries(shortcuts).filter(([, s]) => s.description);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
        className="border-border bg-background/80 text-muted-foreground hover:text-foreground fixed right-5 bottom-5 z-40 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-colors"
      >
        <Keyboard className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-5 backdrop-blur-sm"
          onClick={handleBackdrop}
        >
          <div
            ref={modalRef}
            className="border-border bg-popover w-80 overflow-hidden rounded-2xl border shadow-2xl"
          >
            <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
              <span className="text-sm font-semibold">Keyboard shortcuts</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              {entries.map(([combo, shortcut]) => (
                <div key={combo} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-xs">{shortcut.description}</span>
                  <kbd className="border-border bg-muted text-muted-foreground shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] whitespace-nowrap">
                    {shortcut.label}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
