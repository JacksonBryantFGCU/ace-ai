import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(auth): AuthForm client island (Supabase) lands in Phase 1. */}
        Authentication is wired up in a later phase.
      </p>
    </div>
  );
}
