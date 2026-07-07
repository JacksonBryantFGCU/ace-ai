// No `server-only` marker here (mirroring `nodeEngine`): the boundary is enforced
// at the composition root (`server/scenarios/execution-platform.ts`), so the
// authoring toolkit — which runs under `tsx`, where `server-only` is unresolvable
// — can compose the SAME engine set via `createExecutionPlatform`. This engine is
// never imported by client code directly; only the (server-only) platform is.
import { createVerificationService } from "@/lib/scenarios/verification";
import { createComponentEngine } from "@/lib/scenarios/engines/component-engine";
import type { TestSource } from "@/lib/scenarios/engines/contracts";
import type { ExecutionContext } from "@/lib/scenarios/execution/context";
import type { ExecutionEngine, WorkspaceValidation } from "@/lib/scenarios/execution/engine";
import type { EngineCapabilities } from "@/lib/scenarios/execution/capabilities";
import { NO_CAPABILITIES } from "@/lib/scenarios/execution/capabilities";
import type { ExecutionProfile } from "@/lib/scenarios/execution/profile";

/**
 * The React verification engine — the ONE fully-implemented engine after Phase 6.
 *
 * It is a thin adapter: it reuses the existing, battle-tested component pipeline
 * (`createComponentEngine` → browser test runtime → React + RTL under a server
 * DOM) unchanged, and simply maps the generalized `ExecutionContext` onto that
 * pipeline. The authored tests are taken from the context (already resolved by
 * the caller) via an inline `TestSource`, so no React specifics leak into the
 * platform.
 */
const REACT_CAPABILITIES: EngineCapabilities = {
  ...NO_CAPABILITIES,
  supportsPreview: true,
  supportsBrowser: true,
  supportsSnapshots: true,
  supportsMultipleFiles: true,
};

export const reactEngine: ExecutionEngine = {
  id: "react",
  displayName: "React",

  capabilities: () => REACT_CAPABILITIES,

  supports: (profile: ExecutionProfile) => profile.engine === "react",

  async validateWorkspace(context: ExecutionContext): Promise<WorkspaceValidation> {
    const editable = context.workspaceFiles.filter((f) => f.role === "edit");
    if (editable.length === 0) {
      return {
        ok: false,
        diagnostics: [{ level: "blocker", message: "No editable workspace file to verify." }],
      };
    }
    return { ok: true, diagnostics: [] };
  },

  async verify(context) {
    // Feed the context's pre-resolved tests to the component engine through an
    // inline TestSource, then run through the generic verification service so
    // snapshotting + error-normalization behave exactly as before.
    const inlineTestSource: TestSource = {
      resolve: async () => context.testFiles.map((f) => ({ path: f.path, content: f.content })),
    };
    const service = createVerificationService([createComponentEngine({ testSource: inlineTestSource })]);
    const result = await service.verify({
      scenarioSlug: context.scenarioSlug,
      step: context.step,
      files: context.workspaceFiles.map((f) => ({ path: f.path, content: f.content, role: f.role })),
      signal: context.verificationOptions.signal,
    });
    // Relabel the result under the ENGINE id (the harness id "component" is an
    // internal detail of the component pipeline).
    return { ...result, engine: reactEngine.id };
  },
};
