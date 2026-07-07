import { Skeleton } from "@/components/ui/skeleton";
import { EditorSkeleton } from "@/components/scenario/ui/editor-skeleton";
import { shell } from "@/components/scenario/shell/tokens";

/**
 * Loading placeholder for the whole interview surface — top bar + activity rail +
 * left panel + editor — mirroring `ScenarioWorkspace`'s VS Code shell so the real
 * interview fades in without a layout jump. Shown by the route's `loading.tsx`.
 */
export function ScenarioWorkspaceSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: shell.appBg }}
      role="status"
      aria-label="Loading interview"
    >
      {/* Top bar */}
      <div
        className="flex h-14 flex-none items-center gap-4 px-[18px]"
        style={{ background: shell.topBar, borderBottom: `1px solid ${shell.border}` }}
      >
        <Skeleton className="size-[22px] rounded-md" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-24 rounded-md" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Activity rail */}
        <div
          className="flex w-14 flex-none flex-col items-center gap-2 py-2.5"
          style={{ background: shell.railBg, borderRight: `1px solid ${shell.borderSoft}` }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="size-[42px] rounded-[10px]" />
          ))}
        </div>

        {/* Left panel */}
        <div
          className="flex w-[340px] flex-none flex-col gap-[18px] p-4"
          style={{ background: shell.panelBg, borderRight: `1px solid ${shell.border}` }}
        >
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[5px] flex-1 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-[9px]" />
          <div className="mt-auto flex gap-2.5">
            <Skeleton className="h-9 flex-1 rounded-[9px]" />
            <Skeleton className="h-9 flex-1 rounded-[9px]" />
          </div>
        </div>

        {/* Editor */}
        <div className="min-h-0 flex-1 overflow-hidden" style={{ background: shell.editorBg }}>
          <EditorSkeleton />
        </div>
      </div>
    </div>
  );
}
