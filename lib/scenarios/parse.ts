import YAML from "yaml";
import type { z } from "zod";
import { scenarioSchema, type Scenario } from "@/lib/scenarios/schema";

/**
 * Pure scenario.md parsing — string in, validated model out. No filesystem
 * access, so it can be unit-tested directly and reused wherever a scenario's raw
 * text is already in hand. Filesystem loading + workspace assembly lives in the
 * server-only loader (`server/scenarios/load.ts`).
 */

export interface ParsedFrontmatter {
  frontmatter: unknown;
  body: string;
}

/** Split a `---`-fenced YAML frontmatter block from the Markdown body. */
export function splitFrontmatter(raw: string): ParsedFrontmatter {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("scenario.md is missing YAML frontmatter (it must start with a `---` block)");
  }
  let frontmatter: unknown;
  try {
    frontmatter = YAML.parse(match[1]!);
  } catch (e) {
    throw new Error(`scenario frontmatter is not valid YAML: ${(e as Error).message}`);
  }
  return { frontmatter, body: match[2] ?? "" };
}

/**
 * Split a Markdown body into `## Heading` -> section text. Only level-2 headings
 * delimit sections (mirrors the task validator's `splitSections`).
 */
export function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current !== null) sections[current] = buffer.join("\n").trim();
  };
  for (const line of body.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      flush();
      current = heading[1]!;
      buffer = [];
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

/** Format Zod issues into a single readable, multi-line message. */
function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export interface ParsedScenario {
  scenario: Scenario;
  /** `## Heading` -> text. Authored-only sections are dropped by the loader. */
  sections: Record<string, string>;
}

/** Parse + validate a full scenario.md string. Throws a readable error on failure. */
export function parseScenario(raw: string): ParsedScenario {
  const { frontmatter, body } = splitFrontmatter(raw);
  const result = scenarioSchema.safeParse(frontmatter);
  if (!result.success) {
    throw new Error(`scenario frontmatter is invalid:\n${formatIssues(result.error)}`);
  }
  return { scenario: result.data, sections: splitSections(body) };
}
