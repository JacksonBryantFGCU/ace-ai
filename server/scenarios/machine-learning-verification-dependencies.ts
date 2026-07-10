import { runMachineLearningPytest } from "@/server/scenarios/machine-learning-runtime";
import { runMlScriptPreview } from "@/server/scenarios/machine-learning-preview";
import type { MlStepVerificationDependencies } from "@/lib/scenarios/machine-learning-step-verification";

/**
 * The real `MlStepVerificationDependencies` — the real Python/pytest runtime,
 * plus (only used when a scenario configures `execution.artifacts.metrics.
 * required: true`) the SAME real Output Preview runtime
 * (`runMlScriptPreview`) to run `main.py` and read back a generated
 * artifact's raw text. No separate/parallel execution path.
 *
 * A standalone module (rather than living in `machine-learning-step-
 * verification.ts`) so BOTH real interview verification
 * (`server/scenarios/machine-learning-step-verification.ts`) and
 * authoring-time solution validation (`server/scenarios/authoring.ts`) can
 * import the identical composition without an import cycle between them
 * (`authoring.ts` is also imported BY the verification module, to load
 * authored tests off disk).
 */
export const realMlStepVerificationDependencies: MlStepVerificationDependencies = {
  runPytest: (input) => runMachineLearningPytest(input),
  runMainAndReadArtifact: async (input) => {
    const preview = await runMlScriptPreview({
      scenarioSlug: input.scenarioSlug,
      workspaceFiles: input.workspaceFiles,
      timeoutMs: input.timeoutMs,
    });
    const artifact = preview.artifacts.find((a) => a.path === input.artifactPath);
    // `previewTooLarge` artifacts have no `preview.text` (by design — preview
    // never reads oversized file content); treated the same as "not found"
    // for required-artifact verification, since the same 1 MB cap is also
    // the metrics parser's own default `maxBytes`.
    return { ranOk: preview.ok, content: artifact?.preview?.text ?? null };
  },
};
