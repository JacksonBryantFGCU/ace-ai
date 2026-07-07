import type { ReactNode } from "react";

/**
 * A labeled block in the interviewer panel (e.g. "Check your work", "Stuck?"). Owns
 * the consistent section chrome — uppercase label, optional trailing action, spacing
 * — so every section in the panel reads the same.
 */
export function InterviewSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
