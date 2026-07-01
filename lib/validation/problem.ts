import { z } from "zod";

/**
 * Zod schemas for coding problems — used to validate AI-generated problems
 * (untrusted model output) and the `/api/execute` request body.
 */

const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  description: z.string().optional(),
});

export const codingProblemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topics: z.array(z.string()).default([]),
  functionName: z.string().min(1),
  starterCode: z.record(z.string(), z.string()).optional(),
  testCases: z.array(testCaseSchema).min(1),
  examples: z
    .array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() }))
    .optional(),
  constraints: z.array(z.string()).optional(),
  hints: z.array(z.string()).optional(),
});

export const generatedProblemsSchema = z.object({
  problems: z.array(codingProblemSchema).min(1),
});

/** `/api/execute` request body (Java/C++/Bash are rejected by the route itself). */
export const executeBodySchema = z.object({
  language: z.enum(["javascript", "typescript", "python", "java", "cpp", "bash"]),
  code: z.string().min(1).max(50_000),
  functionName: z.string().min(1).max(200),
  testCases: z.array(testCaseSchema).min(1).max(50),
});
