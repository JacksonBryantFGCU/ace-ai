import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/server/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
