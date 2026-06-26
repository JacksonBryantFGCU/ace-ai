import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(auth): AuthForm client island (Supabase) lands in Phase 1. */}
        Authentication is wired up in a later phase.
      </p>
    </div>
  );
}
