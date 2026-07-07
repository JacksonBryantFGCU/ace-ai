"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { shell } from "@/components/scenario/shell/tokens";

/**
 * The live-interview top bar: brand mark, scenario identity (title + category +
 * difficulty), the live interviewer presence, the session timer, and Restart.
 * Purely presentational — `presence` and `timer` are injected so this component
 * stays free of voice/timer logic.
 */
export function InterviewTopBar({
  title,
  category,
  difficulty,
  timer,
  presence,
  onRestart,
}: {
  title: string;
  category: string;
  difficulty: string;
  timer: ReactNode;
  presence?: ReactNode;
  onRestart?: () => void;
}) {
  return (
    <header
      className="flex h-14 flex-none items-center gap-4 px-[18px]"
      style={{ background: shell.topBar, borderBottom: `1px solid ${shell.border}` }}
    >
      <div className="flex flex-none items-center gap-[9px]">
        <Image src="/icon-512.png" alt="" width={512} height={512} priority className="size-[22px] object-contain" />
        <span className="text-[15px] font-bold tracking-[-0.01em] text-white">
          ace<span style={{ color: shell.aiAccent }}>.ai</span>
        </span>
      </div>

      <div className="h-[22px] w-px flex-none" style={{ background: "rgba(255,255,255,.1)" }} />

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <h1
          className="min-w-0 flex-initial truncate text-sm font-semibold"
          style={{ color: shell.titleText }}
          title={title}
        >
          {title}
        </h1>
        <span
          className="flex-none rounded-md px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap"
          style={{ background: shell.infoBg, color: shell.infoText, border: `1px solid ${shell.infoBorder}` }}
        >
          {category}
        </span>
        <span
          className="flex-none rounded-md px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap capitalize"
          style={{ background: shell.chipBg, color: "#a8b0bd", border: "1px solid rgba(255,255,255,.08)" }}
        >
          {difficulty}
        </span>
      </div>

      {presence}

      <div className="flex flex-none items-center gap-3">
        {timer}
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            style={{ border: "1px solid rgba(255,255,255,.1)", color: "#c4cad3" }}
          >
            <RotateCcw className="size-3.5" /> Restart
          </button>
        ) : null}
      </div>
    </header>
  );
}
