"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { shell } from "@/components/scenario/shell/tokens";

/**
 * The single left panel of the shell. The activity rail chooses which tab renders
 * inside; this owns the panel chrome (fixed width, header label, collapse control).
 */
export function SidePanel({
  title,
  onCollapse,
  children,
}: {
  title: string;
  onCollapse: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="flex w-[340px] max-w-[78vw] flex-none flex-col"
      style={{ background: shell.panelBg, borderRight: `1px solid ${shell.border}` }}
    >
      <div
        className="flex h-10 flex-none items-center justify-between pr-2 pl-4"
        style={{ borderBottom: `1px solid ${shell.borderSoft}` }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.13em]"
          style={{ color: shell.text }}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={onCollapse}
          title="Collapse panel"
          aria-label="Collapse panel"
          className="flex size-7 items-center justify-center rounded-[7px] text-[#8b95a3] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
