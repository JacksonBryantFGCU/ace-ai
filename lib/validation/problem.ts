import { z } from "zod";

/**
 * Zod schema for the `/api/execute` request body (server-side code execution).
 */

const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  description: z.string().optional(),
});

/** `/api/execute` request body (Java/C++/Bash are rejected by the route itself). */
export const executeBodySchema = z.object({
  language: z.enum(["javascript", "typescript", "python", "java", "cpp", "bash"]),
  code: z.string().min(1).max(50_000),
  functionName: z.string().min(1).max(200),
  testCases: z.array(testCaseSchema).min(1).max(50),
});
