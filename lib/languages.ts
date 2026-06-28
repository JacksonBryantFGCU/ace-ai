import type { ProgrammingLanguage } from "@/types/interview";

/**
 * Single source of truth mapping the `ProgrammingLanguage` union to its display
 * label, Monaco editor language id, and execution mode.
 *
 * Phase 5 executes JavaScript/TypeScript/Python entirely in the browser. Java,
 * C++, and Bash are "deferred": they require a real server sandbox (Judge0/
 * Piston/etc.) that does not exist yet, so they are not offered for technical
 * interviews and `/api/execute` rejects them.
 */
export interface LanguageMeta {
  value: ProgrammingLanguage;
  label: string;
  /** Monaco's language identifier. */
  monaco: string;
  execution: "browser" | "deferred";
}

export const LANGUAGES: Record<ProgrammingLanguage, LanguageMeta> = {
  javascript: { value: "javascript", label: "JavaScript", monaco: "javascript", execution: "browser" },
  typescript: { value: "typescript", label: "TypeScript", monaco: "typescript", execution: "browser" },
  python: { value: "python", label: "Python", monaco: "python", execution: "browser" },
  java: { value: "java", label: "Java", monaco: "java", execution: "deferred" },
  cpp: { value: "cpp", label: "C++", monaco: "cpp", execution: "deferred" },
  bash: { value: "bash", label: "Bash", monaco: "shell", execution: "deferred" },
};

/** Languages a candidate can pick for a technical interview (browser-executable). */
export const EXECUTABLE_LANGUAGES: readonly ProgrammingLanguage[] = [
  "javascript",
  "typescript",
  "python",
];

export function isExecutable(language: ProgrammingLanguage): boolean {
  return LANGUAGES[language]?.execution === "browser";
}
