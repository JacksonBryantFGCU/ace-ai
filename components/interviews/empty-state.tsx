import Link from "next/link";

/** Expected "no rows" case for the history list — an empty state, not an error. */
export function InterviewsEmptyState() {
  return (
    <div className="glass-card flex flex-col items-center gap-4 border-dashed py-16 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">No interviews yet</h2>
        <p className="text-sm text-gray-600">Complete your first interview to see it here.</p>
      </div>
      <Link
        href="/roles"
        className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700"
      >
        Start an interview
      </Link>
    </div>
  );
}
