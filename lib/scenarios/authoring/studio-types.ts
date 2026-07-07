import type { Scenario } from "@/lib/scenarios/schema";
import type { ScenarioStats } from "@/lib/scenarios/authoring/stats";

/**
 * Serializable payloads the Authoring Studio passes across the server-action
 * boundary. Pure types (no fs, no React), so both the dev-only server actions
 * (`actions/authoring.ts`) and the client Studio components import them.
 */

/** One row in the Scenario Browser: authored metadata + a fast static-validation summary. */
export interface StudioScenarioSummary {
  slug: string;
  category: string;
  title: string;
  summary: string;
  /** Authored difficulty (easy/medium/hard). */
  difficulty: string;
  /** Authored lifecycle status (draft/review/verified). */
  status: string;
  jobRoles: string[];
  skills: string[];
  tags: string[];
  runtime?: string;
  framework?: string;
  estimatedMinutes: number;
  stepCount: number;
  /** Epoch ms of the most recently edited file in the scenario folder. */
  lastModifiedMs: number;
  /** Static-validation (no-execution) error / warning counts. */
  errorCount: number;
  warningCount: number;
  /** True when the frontmatter itself could not be parsed/validated. */
  invalid: boolean;
}

/** The full authoring view of a single scenario — everything the detail tabs render. */
export interface ScenarioDossier {
  slug: string;
  category: string;
  /** Full authored scenario (rubrics included), or null if the frontmatter is invalid. */
  scenario: Scenario | null;
  /** Readable schema/parse error when `scenario` is null. */
  schemaError: string | null;
  /** Every `## Heading` → body text, INCLUDING authored-only sections. */
  sections: Record<string, string>;
  /** Every file under the folder except scenario.md, keyed by scenario-relative POSIX path. */
  files: Record<string, string>;
  /** Computed statistics, or null when the scenario is invalid. */
  stats: ScenarioStats | null;
  lastModifiedMs: number;
}
