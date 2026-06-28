"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { authInputClass } from "@/components/auth/auth-card";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          If an account exists for that email, we&apos;ve sent a link to reset your password. Check
          your inbox.
        </p>
        <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className={authInputClass}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <SubmitButton variant="brand" className="h-12 w-full rounded-xl text-base">
        Send reset link
      </SubmitButton>
      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
