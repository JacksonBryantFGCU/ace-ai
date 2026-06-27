import type { Metadata } from "next";
import { SetupForm } from "@/components/setup/setup-form";

export const metadata: Metadata = {
  title: "New interview",
};

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your interview</h1>
        <p className="text-muted-foreground text-sm">
          Choose your role, difficulty, and interviewer, then start.
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
