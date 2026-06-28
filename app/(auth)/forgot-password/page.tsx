import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
