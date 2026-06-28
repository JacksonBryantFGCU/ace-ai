"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { authInputClass } from "@/components/auth/auth-card";

const initialState: AuthFormState = {};

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUp, initialState);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-gray-700">
            Password
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
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <SubmitButton variant="brand" className="h-12 w-full rounded-xl text-base">
          Create account
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-300/60" />
        <span className="text-xs text-gray-500">or continue with</span>
        <span className="h-px flex-1 bg-gray-300/60" />
      </div>

      <GoogleAuthButton next={next} />

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
