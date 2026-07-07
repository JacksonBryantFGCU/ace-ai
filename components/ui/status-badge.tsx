import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A small, tone-based status pill. Application-wide primitive: callers map their
 * own domain status (step status, verification status, …) to a `tone`, so the pill
 * styling lives in exactly one place.
 */
export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "bg-green-500/15 text-green-300",
  danger: "bg-red-500/15 text-red-300",
  warning: "bg-amber-500/15 text-amber-300",
  info: "bg-blue-500/15 text-blue-300",
  neutral: "bg-white/5 text-gray-400",
};

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
