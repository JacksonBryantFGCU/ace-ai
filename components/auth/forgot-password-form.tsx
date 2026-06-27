"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          If an account exists for that email, we&apos;ve sent a link to reset your password. Check
          your inbox.
        </p>
        <Link href="/login" className="text-foreground text-sm underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="w-full">Send reset link</SubmitButton>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
