import { Skeleton } from "@/components/ui/skeleton";

// Varied widths so it reads like lines of code rather than a uniform block.
const LINE_WIDTHS = [
  "w-3/5",
  "w-4/5",
  "w-2/5",
  "w-11/12",
  "w-1/2",
  "w-3/4",
  "w-1/3",
  "w-5/6",
  "w-2/3",
  "w-1/2",
  "w-4/6",
  "w-1/4",
];

/**
 * A code-editor loading placeholder on the Monaco surface color, so the swap to the
 * real editor is seamless. Used both by the workspace skeleton and while Monaco's
 * chunk loads.
 */
export function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2.5 bg-[#1e1e1e] p-4" role="status" aria-label="Loading editor">
      {LINE_WIDTHS.map((width, i) => (
        <Skeleton key={i} className={`h-3 ${width}`} />
      ))}
    </div>
  );
}
