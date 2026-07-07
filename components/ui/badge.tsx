import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A neutral metadata chip (category, difficulty, a step kind, …). For status
 * pills that carry meaning through color, use `StatusBadge` instead.
 */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-gray-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
