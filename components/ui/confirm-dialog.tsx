"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable confirmation dialog — the single, accessible replacement for
 * `window.confirm` and hand-rolled modals across the app. Built on Base UI's
 * AlertDialog, so focus trap/restore, Escape/backdrop dismissal, and ARIA wiring
 * come for free.
 *
 * Controlled: the parent owns `open` and decides when to close (so it works for
 * both instant confirms and async actions that stay open while `loading`).
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /**
   * Colors the confirm action: `destructive` = red (delete/irreversible),
   * `warning` = amber (cautionary but not destructive, e.g. checkpoints).
   */
  tone?: "default" | "destructive" | "warning";
  /** Keeps the dialog open + disables actions while an async confirm runs. */
  loading?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  tone = "default",
  loading = false,
  error = null,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        {/* `dark` is set explicitly: Base UI portals to <body>, outside the route's
            `.dark` scope, so token-based children (Button) would otherwise render
            light on this dark popup. */}
        <AlertDialog.Popup className="dark fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-gray-900 p-5 text-gray-100 shadow-xl outline-none transition duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description
              // Descriptions are often rich (lists); render a div so block content is valid.
              render={<div />}
              className="mt-2 text-sm text-gray-300"
            >
              {description}
            </AlertDialog.Description>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={loading}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {cancelLabel}
            </AlertDialog.Close>
            <Button
              type="button"
              size="sm"
              variant={tone === "destructive" ? "destructive" : "default"}
              className={tone === "warning" ? "bg-amber-600 text-white hover:bg-amber-500" : undefined}
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
