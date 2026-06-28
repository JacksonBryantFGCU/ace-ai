"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { authInputClass } from "@/components/auth/auth-card";

const initialState: AuthFormState = {};

function errorFromParam(code?: string): string | undefined {
  if (code === "oauth") return "Google sign-in failed. Please try again.";
  if (code === "verification") return "That link is invalid or has expired. Please try again.";
  return undefined;
}

export function LoginForm({ next, errorParam }: { next?: string; errorParam?: string }) {
  const [state, action] = useActionState(signIn, initialState);
  const error = state.error ?? errorFromParam(errorParam);
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700">
              Password
            </Label>
            <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className={authInputClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <SubmitButton variant="brand" className="h-12 w-full rounded-xl text-base">
          Sign in
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-300/60" />
        <span className="text-xs text-gray-500">or continue with</span>
        <span className="h-px flex-1 bg-gray-300/60" />
      </div>

      <GoogleAuthButton next={next} />

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href={signupHref} className="font-medium text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
