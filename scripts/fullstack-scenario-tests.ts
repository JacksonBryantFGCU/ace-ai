/**
 * Fullstack scenario test runner.
 *
 * Usage:
 *   npm run scenario:test:fullstack -- <slug>
 *   npm run scenario:test:fullstack:backend -- <slug>
 *   npm run scenario:test:fullstack:frontend -- <slug>
 *   npm run scenario:test:fullstack:integration -- <slug>
 */
import {
  parseFullstackTestLayer,
  type FullstackTestLayer,
} from "@/lib/scenarios/fullstack-test-runner";
import { runFullstackScenarioTests } from "@/server/scenarios/fullstack-test-runner";

function formatDuration(ms: number): string {
  return `${Math.round(ms)}ms`;
}

async function main(): Promise<void> {
  const [, , rawLayer = "all", slug] = process.argv;
  const parsedLayer = parseFullstackTestLayer(rawLayer);

  if (!slug) {
    console.error("Usage: tsx scripts/fullstack-scenario-tests.ts <backend|frontend|integration|all> <slug>");
    process.exit(2);
  }

  const layers: FullstackTestLayer[] | undefined = parsedLayer === "all" ? undefined : [parsedLayer];
  const result = await runFullstackScenarioTests({ slug, layers });

  console.log(`\nFullstack tests for ${result.scenarioSlug}: ${result.status}`);
  for (const layer of result.layers) {
    const icon = layer.status === "passed" ? "✓" : layer.status === "skipped" ? "→" : "✗";
    console.log(`${icon} ${layer.layer}: ${layer.status} (${formatDuration(layer.durationMs)})`);
    if (layer.message) console.log(`  ${layer.message}`);
    if (layer.stderr?.trim()) console.log(`  stderr:\n${layer.stderr.trim()}`);
  }

  if (result.status === "failed") process.exit(1);
  process.exit(0);
}

void main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : "Fullstack scenario tests failed."}`);
  process.exit(2);
});
