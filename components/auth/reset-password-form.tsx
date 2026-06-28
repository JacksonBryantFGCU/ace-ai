"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { authInputClass } from "@/components/auth/auth-card";

const initialState: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-gray-700">
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Min. 8 characters"
          required
          className={authInputClass}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-gray-700">
          Confirm new password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Re-enter password"
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
        Update password
      </SubmitButton>
    </form>
  );
}
