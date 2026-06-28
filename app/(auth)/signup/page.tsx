import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth";
import { safeNext } from "@/lib/auth-redirects";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  await redirectIfAuthenticated(safeNext(next));

  return (
    <AuthCard title="Create account" subtitle="Start practicing interviews today">
      <SignupForm next={next} />
    </AuthCard>
  );
}
