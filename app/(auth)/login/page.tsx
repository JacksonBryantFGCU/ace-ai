import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth";
import { safeNext } from "@/lib/auth-redirects";
import { LoginForm } from "@/components/auth/login-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  await redirectIfAuthenticated(safeNext(next));

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      <LoginForm next={next} errorParam={error} />
    </AuthCard>
  );
}
