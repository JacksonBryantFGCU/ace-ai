import { cn } from "@/lib/utils";

/**
 * Loading placeholder. A neutral, animated block used to build skeleton screens
 * while data/editor/results load. Scenario-agnostic — every interview surface
 * composes it (no per-screen loaders).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-white/10", className)} />;
}
