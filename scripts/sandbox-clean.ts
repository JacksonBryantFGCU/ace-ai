import { cleanupOrphanedSandboxContainers } from "@/server/scenarios/sandbox/cleanup";

async function main() {
  const result = await cleanupOrphanedSandboxContainers();
  if (!result.ok) {
    console.error(result.message ?? "Failed to clean up sandbox containers.");
    process.exitCode = 1;
    return;
  }
  if (result.removed.length === 0) {
    console.log("No orphaned sandbox containers found.");
    return;
  }
  console.log(`Removed ${result.removed.length} orphaned sandbox container(s):`);
  for (const id of result.removed) console.log(`  ${id}`);
}

main();
