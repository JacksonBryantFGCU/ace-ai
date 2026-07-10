import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/server/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Set new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  // Reached via the recovery email link, which establishes a session in
  // /auth/confirm. Without that session there is nothing to reset.
  const user = await getUser();
  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <AuthShell>
      <AuthCard title="Set a new password" subtitle="Choose a new password for your account">
        <ResetPasswordForm />
      </AuthCard>
    </AuthShell>
  );
}
