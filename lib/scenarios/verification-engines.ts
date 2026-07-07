import { runStepVerification } from "@/actions/scenario";
import type { SnapshotFile, VerificationService } from "@/lib/scenarios/verification";

/**
 * Client verification service — a thin proxy to the server.
 *
 * Verification now executes ENTIRELY server-side (server action →
 * `verifyStepOnServer` → `VerificationService` + `component` engine). The browser
 * submits its workspace snapshot and receives only a `VerificationResult`; authored
 * tests never reach the client, and the heavy browser runner (RTL + `typescript`)
 * no longer enters the client bundle.
 *
 * The `VerificationService` interface is unchanged, so `useVerification` and the
 * interview controller keep calling `verificationService.verify(input)` exactly as
 * before — only the execution site moved.
 */
export const verificationService: VerificationService = {
  verify: (input) =>
    runStepVerification({
      scenarioSlug: input.scenarioSlug,
      step: input.step,
      files: input.files.map(
        (f): SnapshotFile => ({ path: f.path, content: f.content, role: f.role }),
      ),
    }),
};
