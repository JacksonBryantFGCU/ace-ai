"use client";

import { useRouter } from "next/navigation";
import { ROLE_META } from "@/lib/constants";
import type { QuestionType } from "@/types/interview";

const SELECT_CLASS =
  "rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400";

/**
 * History filter controls — a small client island that pushes `?type=&role=`
 * to the URL so the (server-rendered) list re-queries. Current values come from
 * the server as props; the island only owns the navigation.
 */
export function HistoryFilterBar({
  type,
  role,
}: {
  type?: QuestionType;
  role?: string;
}) {
  const router = useRouter();

  function apply(next: { type?: string; role?: string }) {
    const merged = { type, role, ...next };
    const params = new URLSearchParams();
    if (merged.type) params.set("type", merged.type);
    if (merged.role) params.set("role", merged.role);
    const qs = params.toString();
    router.push(qs ? `/interviews?${qs}` : "/interviews");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span className="sr-only sm:not-sr-only">Type</span>
        <select
          aria-label="Filter by interview type"
          className={SELECT_CLASS}
          value={type ?? ""}
          onChange={(e) => apply({ type: e.target.value })}
        >
          <option value="">All types</option>
          <option value="behavioral">Behavioral</option>
          <option value="technical">Technical</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span className="sr-only sm:not-sr-only">Role</span>
        <select
          aria-label="Filter by role"
          className={SELECT_CLASS}
          value={role ?? ""}
          onChange={(e) => apply({ role: e.target.value })}
        >
          <option value="">All roles</option>
          {ROLE_META.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {type || role ? (
        <button
          type="button"
          onClick={() => router.push("/interviews")}
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
