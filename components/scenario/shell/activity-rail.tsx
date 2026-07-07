"use client";

import { FileText, MessageCircle, SquarePen, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { shell } from "@/components/scenario/shell/tokens";

export type PanelTab = "explorer" | "scenario" | "conversation";

const TABS: { id: PanelTab; label: string; icon: LucideIcon }[] = [
  { id: "explorer", label: "Explorer", icon: FileText },
  { id: "scenario", label: "Scenario", icon: SquarePen },
  { id: "conversation", label: "Conversation", icon: MessageCircle },
];

/**
 * The VS Code–style activity bar. Each button selects a left-panel tab; clicking
 * the already-active tab collapses the panel (that toggle is the parent's job —
 * this only reports intent). The highlighted tab shows an accent rail + brighter
 * icon when its panel is open.
 */
export function ActivityRail({
  activeTab,
  panelOpen,
  onSelect,
}: {
  activeTab: PanelTab;
  panelOpen: boolean;
  onSelect: (tab: PanelTab) => void;
}) {
  return (
    <div
      className="flex w-14 flex-none flex-col items-center gap-1 py-2.5"
      style={{ background: shell.railBg, borderRight: `1px solid ${shell.borderSoft}` }}
      role="tablist"
      aria-orientation="vertical"
      aria-label="Panels"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const highlighted = panelOpen && activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={highlighted}
            title={label}
            aria-label={label}
            onClick={() => onSelect(id)}
            className="relative flex size-[42px] items-center justify-center rounded-[10px] transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            {highlighted ? (
              <span
                className="absolute top-2.5 bottom-2.5 -left-2.5 w-[2.5px] rounded-full"
                style={{ background: shell.accent }}
                aria-hidden="true"
              />
            ) : null}
            <Icon className="size-[22px]" style={{ color: highlighted ? "#e6e9ee" : "#5f6b7a" }} />
          </button>
        );
      })}

      <div
        className="mt-auto flex size-[30px] items-center justify-center rounded-full text-white"
        style={{ background: "linear-gradient(135deg,#3b82f6,#a855f7)" }}
        aria-hidden="true"
      >
        <User className="size-4" />
      </div>
    </div>
  );
}
