"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateRole } from "@/actions/profile";
import { ROLE_META } from "@/lib/constants";
import { Button } from "@/components/ui/button";

/**
 * Default-role settings island. Reuses the existing `updateRole` server action;
 * the surrounding profile page stays a Server Component. Keeps a local "saved"
 * confirmation since the action revalidates the profile cache on success.
 */
export function RoleForm({ initialRole }: { initialRole: string | null }) {
  const [role, setRole] = useState(initialRole ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = role !== (initialRole ?? "") && role !== "";

  function onSave() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const result = await updateRole(role);
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor="default-role" className="text-sm font-medium text-gray-700">
          Default role
        </label>
        <select
          id="default-role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setStatus("idle");
          }}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
        >
          <option value="" disabled>
            Select a role…
          </option>
          {ROLE_META.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={onSave} disabled={!dirty || pending} variant="brand" className="h-11 rounded-xl">
          {pending ? "Saving…" : "Save"}
        </Button>
        {status === "saved" ? (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <Check className="size-4" />
            Saved
          </span>
        ) : null}
        {status === "error" ? (
          <span role="alert" className="text-sm text-red-600">
            {error ?? "Failed to save"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
