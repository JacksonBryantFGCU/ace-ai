import type { ReactNode } from "react";

/** Shared glass input styling for auth fields (legacy `bg-white/60` rounded-xl). */
export const authInputClass =
  "h-12 rounded-xl border border-white/60 bg-white/60 px-4 text-gray-900 shadow-sm backdrop-blur-sm placeholder:text-gray-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20";

/**
 * Glassmorphism auth card with centered title + subtitle (login / signup /
 * forgot / reset). Recreates the legacy auth panel.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
