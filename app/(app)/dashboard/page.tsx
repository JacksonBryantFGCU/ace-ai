import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(P6): server aggregate + ScoreTrendChart client island. */}
        Your interview overview will appear here.
      </p>
    </div>
  );
}
