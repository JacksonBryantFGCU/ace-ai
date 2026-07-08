import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";

const AT = "scenario.md";
const WORKSPACE_ROOTS = ["backend/", "frontend/", "shared/"] as const;
const TEST_ROOTS = ["tests/backend/", "tests/frontend/", "tests/integration/"] as const;

function hasFile(bundle: AuthoredBundle, prefix: string): boolean {
  return Object.keys(bundle.files).some((path) => path.startsWith(prefix));
}

function workspaceRoot(path: string): string | null {
  return WORKSPACE_ROOTS.find((root) => path.startsWith(root)) ?? null;
}

function stepDir(path: string): string | null {
  const parts = path.split("/");
  return parts[0] === "solution" && parts[1] ? parts[1] : null;
}

/**
 * Fullstack-only contract checks. Existing backend/frontend scenarios are left
 * alone; when `type: fullstack` is declared, authors get strict structure checks
 * for the backend/frontend workspace, authored test groups, and checkpoints.
 */
export function validateFullstackContract(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario || scenarioTypeOf(scenario) !== "fullstack") return [];

  const out: Diagnostic[] = [];
  const declared = scenario.workspace.files.map((file) => file.path);

  if (scenario.type !== "fullstack") {
    out.push(
      diag.error(
        "fullstack/missing-type",
        `${AT} → type`,
        "Fullstack scenarios must explicitly declare `type: fullstack`.",
        "Add `type: fullstack` to the scenario frontmatter.",
      ),
    );
  }

  if (!hasFile(bundle, "workspace/backend/")) {
    out.push(
      diag.error(
        "fullstack/missing-backend-workspace",
        "workspace/backend",
        "Fullstack scenarios must include a backend workspace folder.",
        "Add Express/SQLite backend files under `workspace/backend/` and declare them in `workspace.files`.",
      ),
    );
  }
  if (!hasFile(bundle, "workspace/frontend/")) {
    out.push(
      diag.error(
        "fullstack/missing-frontend-workspace",
        "workspace/frontend",
        "Fullstack scenarios must include a frontend workspace folder.",
        "Add React/Vite frontend files under `workspace/frontend/` and declare them in `workspace.files`.",
      ),
    );
  }

  const hasBackendDeclared = declared.some((path) => path.startsWith("backend/"));
  const hasFrontendDeclared = declared.some((path) => path.startsWith("frontend/"));
  if (!hasBackendDeclared || !hasFrontendDeclared) {
    out.push(
      diag.error(
        "fullstack/workspace-files-missing-side",
        `${AT} → workspace.files`,
        "Fullstack workspace files must declare both backend/ and frontend/ files.",
        "Add at least one declared workspace file under `backend/` and one under `frontend/`.",
      ),
    );
  }

  for (const path of declared) {
    if (!workspaceRoot(path)) {
      out.push(
        diag.error(
          "fullstack/workspace-file-outside-root",
          `${AT} → workspace.files`,
          `workspace file "${path}" is outside backend/, frontend/, or shared/.`,
          "Move fullstack workspace files under `workspace/backend/`, `workspace/frontend/`, or `workspace/shared/`.",
        ),
      );
    }
  }

  for (const root of TEST_ROOTS) {
    if (!hasFile(bundle, root)) {
      out.push(
        diag.error(
          `fullstack/missing-${root.slice("tests/".length, -1)}-tests`,
          root.slice(0, -1),
          `Fullstack scenarios must include ${root.slice("tests/".length, -1)} authored tests.`,
          "Add authored-only tests under `tests/backend/`, `tests/frontend/`, and `tests/integration/`.",
        ),
      );
    }
  }

  for (const step of scenario.steps) {
    const files = step.checkpoint?.files ?? [];
    const hasBackend = files.some((path) => {
      const dir = stepDir(path);
      return Boolean(dir && path.startsWith(`solution/${dir}/backend/`));
    });
    const hasFrontend = files.some((path) => {
      const dir = stepDir(path);
      return Boolean(dir && path.startsWith(`solution/${dir}/frontend/`));
    });
    if (!hasBackend || !hasFrontend) {
      out.push(
        diag.error(
          "fullstack/checkpoint-missing-side",
          `${AT} → steps.${step.id}.checkpoint.files`,
          `Step "${step.id}" must checkpoint both backend and frontend files.`,
          "Add checkpoint files under `solution/<step>/backend/` and `solution/<step>/frontend/`.",
        ),
      );
    }
    for (const path of files) {
      const dir = stepDir(path);
      if (!dir) continue;
      const target = path.slice(`solution/${dir}/`.length);
      if (!workspaceRoot(target)) {
        out.push(
          diag.error(
            "fullstack/checkpoint-file-outside-root",
            `${AT} → steps.${step.id}.checkpoint.files`,
            `checkpoint file "${path}" does not map to backend/, frontend/, or shared/.`,
            "Use checkpoint paths like `solution/step-1/backend/...` and `solution/step-1/frontend/...`.",
          ),
        );
      }
    }
  }

  return out;
}
