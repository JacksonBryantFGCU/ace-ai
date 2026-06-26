import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New interview",
};

export default function SetupPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Set up your interview</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(P4): SetupForm client island (sliders) → saveSetupDraft action → redirect. */}
        Role, difficulty, interviewer, and topic selection will live here.
      </p>
    </div>
  );
}
