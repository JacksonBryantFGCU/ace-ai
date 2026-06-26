import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview history",
};

export default function InterviewsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Interview history</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(P2): server read of owner-scoped interviews; link each to /interviews/[id]. */}
        Your past interviews will be listed here.
      </p>
    </div>
  );
}
