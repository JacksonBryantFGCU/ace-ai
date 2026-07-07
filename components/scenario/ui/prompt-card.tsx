import { Markdown } from "@/components/ui/markdown";

/**
 * The step's task, set apart in a subtle card so the prompt reads as "the thing to
 * do" rather than body text. Renders authored Markdown (headings, lists, code,
 * tables, …); heading level starts at 3 so the outline stays valid beneath the
 * panel's "Step X of N" heading.
 */
export function PromptCard({ children }: { children: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <Markdown headingBaseLevel={3}>{children}</Markdown>
    </div>
  );
}
