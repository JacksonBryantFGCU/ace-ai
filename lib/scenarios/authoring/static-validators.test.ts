import { describe, expect, it } from "vitest";
import { scenarioSchema } from "@/lib/scenarios/schema";
import { validateFrontmatter } from "@/lib/scenarios/authoring/frontmatter";
import { validateExecution, validateDatabase } from "@/lib/scenarios/authoring/execution";
import { validateWorkspace } from "@/lib/scenarios/authoring/workspace";
import { validateSteps } from "@/lib/scenarios/authoring/steps";
import { validateRubric } from "@/lib/scenarios/authoring/rubric";
import { crossScenarioDiagnostics } from "@/lib/scenarios/authoring/validate";
import type { AuthoredBundle, Diagnostic } from "@/lib/scenarios/authoring/types";

// A schema-valid baseline frontmatter; tests shallow-override the field under test.
function baseFrontmatter(): Record<string, unknown> {
  return {
    id: "sample-scenario",
    title: "Sample Scenario",
    summary: "A sample scenario used purely by the authoring toolkit tests.",
    category: "frontend-react",
    skills: ["state"],
    jobRoles: ["frontend"],
    tags: ["framework:react"],
    difficulty: "medium",
    experienceMin: "entry",
    experienceMax: "senior",
    estimatedMinutes: 25,
    stack: { languages: ["typescript"], harness: "component" },
    workspace: { files: [{ path: "Widget.tsx", role: "edit" }], entry: "Widget.tsx" },
    rubric: [
      { criterion: "Correctness", weight: 60, detail: "Works as specified." },
      { criterion: "Communication", weight: 40, detail: "Explains the approach clearly." },
    ],
    status: "review",
    version: 1,
    steps: [
      {
        id: "build",
        kind: "implement",
        prompt: "Build the widget.",
        verification: "automated-tests",
        verify: { harness: "component", functionName: "Widget", tests: ["tests/build.test.tsx"] },
        weight: 100,
        checkpoint: { files: ["solution/build/Widget.tsx"] },
        hints: ["Start with state.", "Render the label."],
      },
    ],
  };
}

function baseFiles(): Record<string, string> {
  return {
    "workspace/Widget.tsx": "export function Widget() { return null; }",
    "tests/build.test.tsx": 'import { Widget } from "../workspace/Widget";\ntest("x", () => {});',
    "solution/build/Widget.tsx": "export function Widget() { return <div>ready</div>; }",
  };
}

function bundle(overrides: {
  slug?: string;
  category?: string;
  frontmatter?: Record<string, unknown>;
  files?: Record<string, string>;
} = {}): AuthoredBundle {
  const fm = { ...baseFrontmatter(), ...overrides.frontmatter };
  const parsed = scenarioSchema.safeParse(fm);
  return {
    slug: overrides.slug ?? "sample-scenario",
    category: overrides.category ?? "frontend-react",
    raw: "(test)",
    frontmatter: fm,
    scenario: parsed.success ? parsed.data : null,
    schemaError: parsed.success ? null : parsed.error.issues.map((i) => i.message).join("; "),
    sections: {},
    files: { ...baseFiles(), ...overrides.files },
  };
}

const codes = (ds: Diagnostic[]) => ds.map((d) => d.code);
const errors = (ds: Diagnostic[]) => ds.filter((d) => d.level === "error");

describe("frontmatter validation", () => {
  it("accepts a valid scenario with no errors", () => {
    const b = bundle();
    const ds = [...validateFrontmatter(b), ...validateWorkspace(b), ...validateSteps(b), ...validateRubric(b)];
    expect(errors(ds)).toEqual([]);
  });

  it("reports a single actionable error when the schema fails", () => {
    const b = bundle({ frontmatter: { title: undefined } });
    expect(b.scenario).toBeNull();
    const ds = validateFrontmatter(b);
    expect(codes(ds)).toEqual(["frontmatter/invalid"]);
    expect(ds[0]!.fix).toBeTruthy();
  });

  it("flags id/slug and category/folder mismatches", () => {
    expect(codes(validateFrontmatter(bundle({ frontmatter: { id: "different" } })))).toContain("frontmatter/id-slug-mismatch");
    expect(codes(validateFrontmatter(bundle({ frontmatter: { category: "backend-node" } })))).toContain(
      "frontmatter/category-folder-mismatch",
    );
  });

  it("flags unknown roles and unsupported languages", () => {
    expect(codes(validateFrontmatter(bundle({ frontmatter: { jobRoles: ["wizard"] } })))).toContain("frontmatter/unknown-role");
    const langs = validateFrontmatter(bundle({ frontmatter: { stack: { languages: ["cobol"], harness: "component" } } }));
    expect(codes(langs)).toContain("frontmatter/unsupported-language");
  });

  it("flags a harness/language mismatch on an otherwise valid scenario", () => {
    const mismatch = validateFrontmatter(bundle({ frontmatter: { stack: { languages: ["python"], harness: "component" } } }));
    expect(codes(mismatch)).toContain("frontmatter/harness-language-mismatch");
  });

  it("surfaces schema-enforced invariants (inverted experience range) as a single error", () => {
    const b = bundle({ frontmatter: { experienceMin: "senior", experienceMax: "entry" } });
    expect(b.scenario).toBeNull();
    expect(codes(validateFrontmatter(b))).toContain("frontmatter/invalid");
  });

  it("nudges on unknown category and outlier estimated time (non-errors)", () => {
    expect(codes(validateFrontmatter(bundle({ frontmatter: { category: "frontend-react" } })))).not.toContain("frontmatter/unknown-category");
    const outlier = validateFrontmatter(bundle({ frontmatter: { estimatedMinutes: 5 } }));
    expect(codes(outlier)).toContain("frontmatter/estimated-minutes-outlier");
  });
});

describe("execution metadata validation", () => {
  it("is clean for a scenario whose profile derives from the legacy stack (React)", () => {
    expect(errors(validateExecution(bundle()))).toEqual([]);
  });

  it("flags an incompatible explicit combination (React engine on a Python runtime)", () => {
    const b = bundle({ frontmatter: { runtime: "python", verification: { engine: "react" } } });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateExecution(b))).toContain("execution/incompatible-metadata");
  });

  it("flags an unsupported Node import in a Node-engine scenario", () => {
    const b = bundle({
      frontmatter: {
        language: { primary: "typescript" },
        runtime: "node",
        framework: "none",
        verification: { engine: "node" },
      },
      files: { "workspace/Widget.tsx": 'import fs from "fs";\nexport function Widget() { return null; }' },
    });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateExecution(b))).toContain("execution/unsupported-node-import");
  });

  it("allows the narrow crypto builtin for Node-engine auth scenarios", () => {
    const b = bundle({
      frontmatter: {
        language: { primary: "typescript" },
        runtime: "node",
        framework: "express",
        verification: { engine: "node" },
        workspace: { files: [{ path: "app.ts", role: "edit" }], entry: "app.ts" },
      },
      files: {
        "workspace/app.ts":
          'import express from "express";\nimport { randomBytes } from "node:crypto";\nconst app = express();\nrandomBytes(16);\nexport default app;',
      },
    });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateExecution(b))).not.toContain("execution/unsupported-node-import");
  });

  it("flags a missing default export in an Express scenario", () => {
    const b = bundle({
      frontmatter: {
        language: { primary: "typescript" },
        runtime: "node",
        framework: "express",
        verification: { engine: "node" },
      },
      // base entry `workspace/Widget.tsx` has a named export, no default.
    });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateExecution(b))).toContain("express/no-default-export");
  });

  it("flags app.listen() in an Express scenario, and allows the bundled express import", () => {
    const b = bundle({
      frontmatter: {
        language: { primary: "typescript" },
        runtime: "node",
        framework: "express",
        verification: { engine: "node" },
        workspace: { files: [{ path: "app.ts", role: "edit" }], entry: "app.ts" },
      },
      files: {
        "workspace/app.ts": 'import express from "express";\nconst app = express();\napp.listen(3000);\nexport default app;',
      },
    });
    expect(b.scenario).not.toBeNull();
    const c = codes(validateExecution(b));
    expect(c).toContain("express/uses-listen");
    expect(c).not.toContain("execution/unsupported-node-import"); // express is allowed
  });

  const SQLITE_FM = {
    language: { primary: "typescript" },
    runtime: "node",
    framework: "none",
    verification: { engine: "node" },
    database: { engine: "sqlite" },
  };

  it("requires schema.sql for a SQLite scenario", () => {
    const b = bundle({ frontmatter: SQLITE_FM });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateExecution(b))).toContain("sqlite/missing-schema");
  });

  it("flags duplicate tables and unknown FK targets, and allows the @ace/db import", () => {
    const b = bundle({
      frontmatter: SQLITE_FM,
      files: {
        "database/schema.sql":
          "CREATE TABLE users (id INTEGER PRIMARY KEY);\n" +
          "CREATE TABLE users (id INTEGER);\n" +
          "CREATE TABLE posts (id INTEGER, uid INTEGER, FOREIGN KEY (uid) REFERENCES ghosts(id));",
        "workspace/Widget.tsx": 'import { db } from "@ace/db";\nexport function Widget() { return null; }',
      },
    });
    const c = codes(validateExecution(b));
    expect(c).toContain("sqlite/duplicate-table");
    expect(c).toContain("sqlite/foreign-key-unknown-table");
    expect(c).not.toContain("execution/unsupported-node-import"); // @ace/db is allowed
  });

  it("validateDatabase applies the schema against real SQLite", async () => {
    const good = bundle({ frontmatter: SQLITE_FM, files: { "database/schema.sql": "CREATE TABLE t (id INTEGER PRIMARY KEY);" } });
    expect(await validateDatabase(good)).toEqual([]);

    const bad = bundle({ frontmatter: SQLITE_FM, files: { "database/schema.sql": "CREATE TABLE (oops" } });
    expect((await validateDatabase(bad)).map((d) => d.code)).toContain("sqlite/invalid-schema");
  });

  it("validateDatabase is a no-op for non-database scenarios", async () => {
    expect(await validateDatabase(bundle())).toEqual([]);
  });
});

describe("workspace validation", () => {
  it("reports a missing declared file", () => {
    const b = bundle({ files: {} }); // baseFiles overridden to nothing → workspace/Widget.tsx missing
    // baseFiles() spread first then overrides; passing {} keeps base — so drop the file explicitly:
    delete b.files["workspace/Widget.tsx"];
    expect(codes(validateWorkspace(b))).toContain("workspace/missing-file");
  });

  it("warns when the entry file is readonly", () => {
    expect(
      codes(validateWorkspace(bundle({ frontmatter: { workspace: { files: [{ path: "Widget.tsx", role: "readonly" }], entry: "Widget.tsx" } } }))),
    ).toContain("workspace/entry-readonly");
  });

  it("reports an unresolved relative import", () => {
    const b = bundle({ files: { "workspace/Widget.tsx": 'import { x } from "./missing";\nexport function Widget() { return null; }' } });
    expect(codes(validateWorkspace(b))).toContain("workspace/unresolved-import");
  });

  it("resolves imports that point at declared siblings", () => {
    const b = bundle({
      frontmatter: {
        workspace: {
          files: [
            { path: "Widget.tsx", role: "edit" },
            { path: "helper.ts", role: "readonly" },
          ],
          entry: "Widget.tsx",
        },
      },
      files: {
        "workspace/Widget.tsx": 'import { h } from "./helper";\nexport function Widget() { return null; }',
        "workspace/helper.ts": "export const h = 1;",
      },
    });
    expect(codes(validateWorkspace(b))).not.toContain("workspace/unresolved-import");
  });

  it("flags an undeclared workspace file present on disk", () => {
    const b = bundle({ files: { "workspace/Orphan.tsx": "export const x = 1;" } });
    expect(codes(validateWorkspace(b))).toContain("workspace/undeclared-file");
  });
});

describe("step validation", () => {
  it("flags duplicate step ids (schema doesn't dedupe them)", () => {
    const step = (id: string) => ({
      id,
      kind: "implement",
      prompt: "p",
      verification: "automated-tests",
      verify: { harness: "component", functionName: "W", tests: ["tests/build.test.tsx"] },
      weight: 50,
    });
    const b = bundle({ frontmatter: { steps: [step("dup"), step("dup")] } });
    expect(b.scenario).not.toBeNull();
    expect(codes(validateSteps(b))).toContain("steps/duplicate-id");
  });

  it("flags declared test and checkpoint files that are missing on disk", () => {
    const missing = bundle();
    delete missing.files["tests/build.test.tsx"];
    delete missing.files["solution/build/Widget.tsx"];
    const c = codes(validateSteps(missing));
    expect(c).toContain("steps/missing-test-file");
    expect(c).toContain("steps/missing-checkpoint-file");
  });

  it("warns on duplicate hints", () => {
    const b = bundle({
      frontmatter: {
        steps: [
          {
            id: "build",
            kind: "implement",
            prompt: "p",
            verification: "automated-tests",
            verify: { harness: "component", functionName: "W", tests: ["tests/build.test.tsx"] },
            weight: 100,
            checkpoint: { files: ["solution/build/Widget.tsx"] },
            hints: ["same", "same"],
          },
        ],
      },
    });
    expect(codes(validateSteps(b))).toContain("steps/duplicate-hint");
  });
});

describe("rubric validation", () => {
  it("flags duplicate criteria, empty/placeholder feedback, and zero weight", () => {
    const dup = bundle({
      frontmatter: { rubric: [{ criterion: "Same", weight: 50, detail: "a" }, { criterion: "same", weight: 50, detail: "b" }] },
    });
    expect(codes(validateRubric(dup))).toContain("rubric/duplicate-criterion");

    const empty = bundle({ frontmatter: { rubric: [{ criterion: "A", weight: 100, detail: "   " }] } });
    expect(codes(validateRubric(empty))).toContain("rubric/empty-feedback");

    const todo = bundle({ frontmatter: { rubric: [{ criterion: "A", weight: 50, detail: "TODO write this" }, { criterion: "B", weight: 50, detail: "ok" }] } });
    expect(codes(validateRubric(todo))).toContain("rubric/placeholder-feedback");

    const zero = bundle({ frontmatter: { rubric: [{ criterion: "A", weight: 100, detail: "ok" }, { criterion: "B", weight: 0, detail: "ok" }] } });
    expect(codes(validateRubric(zero))).toContain("rubric/zero-weight");
  });
});

describe("cross-scenario validation", () => {
  it("detects duplicate slugs across the tree", () => {
    const a = bundle({ slug: "dup", category: "frontend-react", frontmatter: { id: "dup" } });
    const b = bundle({ slug: "dup", category: "backend-node", frontmatter: { id: "dup", category: "backend-node" } });
    const cross = crossScenarioDiagnostics([a, b]);
    expect(codes(cross.get("dup") ?? [])).toContain("cross/duplicate-slug");
  });

  it("is clean for unique slugs", () => {
    const a = bundle({ slug: "one", frontmatter: { id: "one" } });
    const b = bundle({ slug: "two", frontmatter: { id: "two" } });
    expect(crossScenarioDiagnostics([a, b]).size).toBe(0);
  });
});

describe("every error diagnostic includes a fix", () => {
  it("errors always carry an actionable fix", () => {
    const samples = [
      validateFrontmatter(bundle({ frontmatter: { id: "x" } })),
      validateWorkspace((() => { const b = bundle(); delete b.files["workspace/Widget.tsx"]; return b; })()),
      validateRubric(bundle({ frontmatter: { rubric: [{ criterion: "A", weight: 100, detail: "  " }] } })),
    ].flat();
    for (const d of samples.filter((x) => x.level === "error")) {
      expect(d.fix, `${d.code} must have a fix`).toBeTruthy();
    }
  });
});
