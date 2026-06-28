import { z } from "zod";
import { VALID_ROLES } from "@/lib/constants";

/**
 * Zod schemas for interview-domain inputs. Server Actions validate against these
 * before touching OpenAI/Supabase, since Actions are a public callable surface.
 * Shared, no secrets — lives in `lib/`.
 */

/** Transcript entries accepted for evaluation (system turns are filtered out upstream). */
const transcriptEntrySchema = z.object({
  role: z.enum(["assistant", "user"]),
  text: z.string().min(1).max(10_000, { error: "Transcript entry is too long." }),
  timestamp: z.number().optional(),
});

export const interviewConfigSchema = z.object({
  role: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  experience: z.enum(["intern", "entry", "junior", "senior"]),
  strictness: z.enum(["lenient", "balanced", "strict"]),
  questionType: z.enum(["behavioral", "technical"]),
  interviewer: z.string().min(1),
  language: z.enum(["javascript", "typescript", "python", "java", "cpp", "bash"]).optional(),
  topics: z.array(z.string()).optional(),
});

export const evaluateInputSchema = z.object({
  transcript: z
    .array(transcriptEntrySchema)
    .min(2, { error: "Not enough conversation to evaluate." })
    .max(200, { error: "Transcript is too large." }),
  config: interviewConfigSchema,
});

/** Profile role allow-list. */
export const roleSchema = z.enum(VALID_ROLES);

/** Returns the first human-readable error message from a failed safeParse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
