import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(P6): cached server aggregate streamed into a Recharts island. */}
        Score trends and breakdowns will appear here.
      </p>
    </div>
  );
}
