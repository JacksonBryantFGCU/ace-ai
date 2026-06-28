import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
      <p className="text-gray-600">
        {/* TODO(P6): server aggregate (stat cards + recent interviews) lands in the analytics phase. */}
        Your interview overview will appear here.
      </p>
    </div>
  );
}
