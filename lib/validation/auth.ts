import { z } from "zod";

/**
 * Zod schemas for authentication inputs. Server Actions validate against these
 * before calling Supabase, so the action is a real security boundary (Server
 * Actions are reachable by direct POST). Shared, no secrets — lives in `lib/`.
 */

const email = z.email({ error: "Enter a valid email address." }).trim();
const password = z.string().min(8, { error: "Password must be at least 8 characters." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Password is required." }),
});

export const signUpSchema = z.object({
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Returns the first human-readable error message from a failed safeParse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
