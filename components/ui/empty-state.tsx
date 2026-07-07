import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A deliberate empty state — an optional icon, a title, a short explanation, and an
 * optional action. Application-wide primitive so "nothing here yet" reads as
 * intentional guidance rather than leftover placeholder text.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2 p-8 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="size-8 text-gray-600" aria-hidden="true" /> : null}
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {description ? <p className="max-w-xs text-xs leading-relaxed text-gray-500">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
