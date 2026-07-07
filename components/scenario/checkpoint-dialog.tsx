"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Confirmation for applying a checkpoint. A thin wrapper over the shared
 * `ConfirmDialog` (focus trap, Escape/backdrop dismissal, ARIA) that supplies the
 * checkpoint-specific copy and the cautionary "warning" tone. While applying, close
 * requests are ignored so the async apply can finish.
 */
export function CheckpointDialog({
  open,
  stepLabel,
  applying,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  stepLabel: string;
  applying: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !applying) onCancel();
      }}
      title={`Apply checkpoint for ${stepLabel}?`}
      description={
        <ul className="list-disc space-y-2 pl-5">
          <li>Restores the workspace to a known-good starting point for the next step.</li>
          <li>
            <strong className="text-gray-100">Does not award credit</strong> for this step.
          </li>
          <li>Replaces your current code — this can only be undone by restarting the scenario.</li>
        </ul>
      }
      confirmLabel="Apply checkpoint"
      tone="warning"
      loading={applying}
      error={error}
      onConfirm={onConfirm}
    />
  );
}
