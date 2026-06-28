import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
      <p className="text-gray-600">
        {/* TODO(P6): cached server aggregate streamed into a Recharts island. */}
        Score trends and breakdowns will appear here.
      </p>
    </div>
  );
}
