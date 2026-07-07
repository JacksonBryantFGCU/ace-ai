import { describe, expect, it } from "vitest";
import { scenarioSchema } from "@/lib/scenarios/schema";
import { validatePreview } from "@/lib/scenarios/authoring/preview";
import { validateScenario } from "@/lib/scenarios/authoring/validate";
import type { AuthoredBundle, Diagnostic } from "@/lib/scenarios/authoring/types";

/**
 * Preview validation is STATIC ONLY (docs/README.md) — these tests never mount
 * React, never execute the interview runtime, and never touch a browser.
 * `stories.ts`/`preview.config.ts` ARE evaluated (they're plain data, exactly
 * like `server/scenarios/load.ts` already does at serve time).
 */

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

const VALID_PREVIEW = "export default function Preview() { return null; }";
const VALID_PROVIDERS = "export function Wrapper({ children }) { return children; }";
const VALID_STORIES = `
  export const stories = [
    { id: "default", label: "Default" },
    { id: "empty", label: "Empty state" },
    { id: "mobile", label: "Mobile", viewport: "mobile" },
  ];
`;
const VALID_CONFIG = `export const config = { kind: "component", title: "Widget preview", defaultStoryId: "default" };`;

function baseFiles(): Record<string, string> {
  return {
    "workspace/Widget.tsx": "export function Widget() { return null; }",
    "tests/build.test.tsx": 'import { Widget } from "../workspace/Widget";\ntest("x", () => {});',
    "solution/build/Widget.tsx": "export function Widget() { return <div>ready</div>; }",
  };
}

function bundle(
  overrides: { frontmatter?: Record<string, unknown>; files?: Record<string, string> } = {},
): AuthoredBundle {
  const fm = { ...baseFrontmatter(), ...overrides.frontmatter };
  const parsed = scenarioSchema.safeParse(fm);
  return {
    slug: "sample-scenario",
    category: "frontend-react",
    raw: "(test)",
    frontmatter: fm,
    scenario: parsed.success ? parsed.data : null,
    schemaError: parsed.success ? null : parsed.error.issues.map((i) => i.message).join("; "),
    sections: {},
    files: { ...baseFiles(), ...overrides.files },
  };
}

/** A bundle with a fully valid preview/ folder (stories + config included). */
function withValidPreview(fileOverrides: Record<string, string> = {}): AuthoredBundle {
  return bundle({
    files: {
      "preview/Preview.tsx": VALID_PREVIEW,
      "preview/providers.tsx": VALID_PROVIDERS,
      "preview/stories.ts": VALID_STORIES,
      "preview/preview.config.ts": VALID_CONFIG,
      ...fileOverrides,
    },
  });
}

const codes = (ds: Diagnostic[]) => ds.map((d) => d.code);
const errors = (ds: Diagnostic[]) => ds.filter((d) => d.level === "error");
const suggestions = (ds: Diagnostic[]) => ds.filter((d) => d.level === "suggestion");

describe("preview validation — no preview/ folder", () => {
  it("is a no-op when the scenario has no preview/ folder (P1)", () => {
    expect(validatePreview(bundle())).toEqual([]);
  });
});

describe("preview validation — a fully valid preview", () => {
  it("reports zero errors for a well-formed preview/ folder", () => {
    expect(errors(validatePreview(withValidPreview()))).toEqual([]);
  });
});

describe("preview validation — folder / entry", () => {
  it("errors when preview/ exists but Preview.tsx is missing", () => {
    const b = bundle({ files: { "preview/stories.ts": VALID_STORIES } });
    expect(codes(validatePreview(b))).toContain("preview/missing-entry");
  });

  it("does not require providers.tsx, stories.ts, or preview.config.ts", () => {
    const b = bundle({ files: { "preview/Preview.tsx": VALID_PREVIEW } });
    expect(errors(validatePreview(b))).toEqual([]);
  });
});

describe("preview validation — Preview.tsx / providers.tsx source", () => {
  it("reports a syntax error with a file:line:column location", () => {
    const b = bundle({ files: { "preview/Preview.tsx": "export default function Preview() { return <div>(" } });
    const ds = validatePreview(b);
    expect(codes(ds)).toContain("preview/syntax-error");
    const syntaxError = ds.find((d) => d.code === "preview/syntax-error")!;
    expect(syntaxError.location).toMatch(/preview\/Preview\.tsx:\d+:\d+/);
  });

  it("errors when Preview.tsx has no default export", () => {
    const b = bundle({ files: { "preview/Preview.tsx": "export function Preview() { return null; }" } });
    expect(codes(validatePreview(b))).toContain("preview/no-default-export");
  });

  it("errors when Preview.tsx's default export isn't component-shaped", () => {
    const b = bundle({ files: { "preview/Preview.tsx": "export default { not: \"a component\" };" } });
    expect(codes(validatePreview(b))).toContain("preview/default-export-not-component");
  });

  it("accepts an arrow-function default export", () => {
    const b = bundle({ files: { "preview/Preview.tsx": "export default () => null;" } });
    expect(errors(validatePreview(b))).toEqual([]);
  });

  it("accepts a named-then-default-exported identifier", () => {
    const b = bundle({
      files: { "preview/Preview.tsx": "function Preview() { return null; }\nexport default Preview;" },
    });
    expect(errors(validatePreview(b))).toEqual([]);
  });

  it("errors on an unsupported (non-relative, non-React) import", () => {
    const b = bundle({
      files: {
        "preview/Preview.tsx": 'import { debounce } from "lodash";\nexport default function Preview() { return null; }',
      },
    });
    expect(codes(validatePreview(b))).toContain("preview/unsupported-import");
  });

  it("allows importing React and the virtual scenario:entry specifier", () => {
    const b = bundle({
      files: {
        "preview/Preview.tsx":
          'import CandidateEntry from "scenario:entry";\nimport { useState } from "react";\nexport default function Preview() { useState(0); return CandidateEntry; }',
      },
    });
    expect(errors(validatePreview(b))).toEqual([]);
  });

  it("errors on an unresolved relative import", () => {
    const b = bundle({
      files: {
        "preview/Preview.tsx":
          'import { Wrapper } from "./providers";\nexport default function Preview() { return Wrapper; }',
      },
    });
    expect(codes(validatePreview(b))).toContain("preview/unresolved-import");
  });

  it("resolves a relative import to providers.tsx when it exists", () => {
    const b = bundle({
      files: {
        "preview/Preview.tsx":
          'import { Wrapper } from "./providers";\nexport default function Preview() { return Wrapper; }',
        "preview/providers.tsx": VALID_PROVIDERS,
      },
    });
    expect(codes(validatePreview(b))).not.toContain("preview/unresolved-import");
  });

  it("does not require providers.tsx to have a default export", () => {
    const b = withValidPreview({ "preview/providers.tsx": "export function Wrapper() { return null; }" });
    expect(errors(validatePreview(b))).toEqual([]);
  });
});

describe("preview validation — stories.ts", () => {
  it("errors on duplicate story ids", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A" }, { id: "a", label: "A again" }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/duplicate-story-id");
  });

  it("errors on a story missing an id or label", () => {
    const missingId = withValidPreview({ "preview/stories.ts": `export const stories = [{ label: "No id" }];` });
    expect(codes(validatePreview(missingId))).toContain("preview/story-missing-id");

    const missingLabel = withValidPreview({ "preview/stories.ts": `export const stories = [{ id: "a" }];` });
    expect(codes(validatePreview(missingLabel))).toContain("preview/story-missing-label");
  });

  it("errors on an invalid viewport value", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A", viewport: "tablet-ish" }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/invalid-story-viewport");
  });

  it("accepts a valid custom {width,height} viewport", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "default", label: "A", viewport: { width: 320, height: 480 } }];`,
    });
    expect(errors(validatePreview(b))).toEqual([]);
  });

  it("errors on an invalid theme value", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A", theme: "midnight" }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/invalid-story-theme");
  });

  it("errors when story props aren't serializable", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A", props: { onClick: () => {} } }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/story-props-not-serializable");
  });

  it("errors when stories.ts tries to import something", () => {
    const b = withValidPreview({
      "preview/stories.ts": `import { data } from "./data";\nexport const stories = [{ id: "a", label: "A", props: data }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/unresolved-import");
  });

  it("errors when stories.ts doesn't export an array", () => {
    const b = withValidPreview({ "preview/stories.ts": `export const stories = "not an array";` });
    expect(codes(validatePreview(b))).toContain("preview/stories-not-array");
  });
});

describe("preview validation — preview.config.ts", () => {
  it("errors on an unsupported kind", () => {
    const b = withValidPreview({ "preview/preview.config.ts": `export const config = { kind: "sql" };` });
    expect(codes(validatePreview(b))).toContain("preview/unsupported-kind");
  });

  it("errors when defaultStoryId doesn't match any story", () => {
    const b = withValidPreview({
      "preview/preview.config.ts": `export const config = { kind: "component", defaultStoryId: "nope" };`,
    });
    expect(codes(validatePreview(b))).toContain("preview/default-story-not-found");
  });

  it("warns (not errors) on an unknown config property", () => {
    const b = withValidPreview({
      "preview/preview.config.ts": `export const config = { kind: "component", banana: true };`,
    });
    const ds = validatePreview(b);
    const warning = ds.find((d) => d.code === "preview/config-unknown-property");
    expect(warning).toBeDefined();
    expect(warning!.level).toBe("warning");
  });
});

describe("preview validation — backend API config", () => {
  function apiScenario(fileOverrides: Record<string, string> = {}): AuthoredBundle {
    return bundle({
      frontmatter: {
        category: "backend-node",
        jobRoles: ["backend"],
        tags: ["framework:express", "database:sqlite"],
        stack: { languages: ["typescript"], harness: "node-vm" },
        language: { primary: "typescript" },
        runtime: "node",
        framework: "express",
        verification: { engine: "node" },
        database: { engine: "sqlite" },
        workspace: {
          files: [
            { path: "app.ts", role: "edit" },
            { path: "db.ts", role: "readonly" },
          ],
          entry: "app.ts",
        },
      },
      files: {
        "workspace/app.ts": 'import express from "express";\nconst app = express();\nexport default app;',
        "workspace/db.ts": 'export { db } from "@ace/db";',
        "database/schema.sql": "CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT);",
        "tests/build.test.ts": 'test("x", () => {});',
        ...fileOverrides,
      },
    });
  }

  const validApiConfig = `
    export const config = { title: "Notes API", defaultExampleId: "list-notes" };
    export const apiExamples = [
      { id: "list-notes", label: "List notes", method: "GET", path: "/notes" },
      { id: "create-note", label: "Create note", method: "POST", path: "/notes", body: { title: "A" } },
    ];
  `;

  it("accepts a valid API preview config without requiring Preview.tsx", () => {
    const ds = validatePreview(apiScenario({ "preview/api.config.ts": validApiConfig }));
    expect(errors(ds)).toEqual([]);
  });

  it("validates API examples", () => {
    expect(
      codes(
        validatePreview(
          apiScenario({
            "preview/api.config.ts": `export const apiExamples = [{ id: "x", label: "X", method: "TRACE", path: "/x" }];`,
          }),
        ),
      ),
    ).toContain("preview/api-example-invalid-method");

    expect(
      codes(
        validatePreview(
          apiScenario({
            "preview/api.config.ts": `export const apiExamples = [{ id: "x", label: "X", method: "GET", path: "notes" }];`,
          }),
        ),
      ),
    ).toContain("preview/api-example-invalid-path");
  });

  it("rejects duplicate ids, non-serializable bodies, missing defaults, and imports", () => {
    const duplicate = validatePreview(
      apiScenario({
        "preview/api.config.ts": `export const apiExamples = [{ id: "x", label: "X", method: "GET", path: "/x" }, { id: "x", label: "Again", method: "GET", path: "/x" }];`,
      }),
    );
    expect(codes(duplicate)).toContain("preview/api-example-duplicate-id");

    const body = validatePreview(
      apiScenario({
        "preview/api.config.ts": `export const apiExamples = [{ id: "x", label: "X", method: "POST", path: "/x", body: { make: () => 1 } }];`,
      }),
    );
    expect(codes(body)).toContain("preview/api-example-body-not-serializable");

    const missingDefault = validatePreview(
      apiScenario({
        "preview/api.config.ts": `export const config = { defaultExampleId: "missing" }; export const apiExamples = [{ id: "x", label: "X", method: "GET", path: "/x" }];`,
      }),
    );
    expect(codes(missingDefault)).toContain("preview/api-default-example-not-found");

    const imports = validatePreview(
      apiScenario({
        "preview/api.config.ts": `import { x } from "./x"; export const apiExamples = [{ id: "x", label: "X", method: "GET", path: "/x" }];`,
      }),
    );
    expect(codes(imports)).toContain("preview/api-config-unsupported-import");
  });
});

describe("preview validation — cross-validation", () => {
  it("catches an invalid defaultStoryId set against real authored stories", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "only-one", label: "Only" }];`,
      "preview/preview.config.ts": `export const config = { defaultStoryId: "missing" };`,
    });
    expect(codes(validatePreview(b))).toContain("preview/default-story-not-found");
  });
});

describe("preview validation — best-practice suggestions", () => {
  it("suggests adding stories when there are none", () => {
    const b = bundle({ files: { "preview/Preview.tsx": VALID_PREVIEW } });
    expect(codes(validatePreview(b))).toContain("preview/no-stories");
  });

  it("suggests more stories when only one is authored", () => {
    const b = withValidPreview({ "preview/stories.ts": `export const stories = [{ id: "only", label: "Only" }];` });
    expect(codes(validatePreview(b))).toContain("preview/single-story");
  });

  it("suggests an edge-case story when none of the ids/labels suggest one", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A" }, { id: "b", label: "B" }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/no-edge-case-story");
  });

  it("does not suggest an edge-case story when one already exists", () => {
    const ds = validatePreview(withValidPreview());
    expect(codes(ds)).not.toContain("preview/no-edge-case-story");
  });

  it("suggests a responsive story when none pins a narrow viewport", () => {
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "empty", label: "Empty state" }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/no-responsive-story");
  });

  it("suggests trimming very large story props", () => {
    const big = "x".repeat(3000);
    const b = withValidPreview({
      "preview/stories.ts": `export const stories = [{ id: "a", label: "A", props: { blob: "${big}" } }];`,
    });
    expect(codes(validatePreview(b))).toContain("preview/large-story-props");
  });

  it("suggests a title when preview.config.ts doesn't set one", () => {
    const b = withValidPreview({ "preview/preview.config.ts": `export const config = { kind: "component" };` });
    expect(codes(validatePreview(b))).toContain("preview/missing-title");
  });

  it("suggests accessibility notes when interactive markup has no aria attributes", () => {
    const b = withValidPreview({
      "preview/Preview.tsx": "export default function Preview() { return <button>Click</button>; }",
    });
    expect(codes(validatePreview(b))).toContain("preview/missing-accessibility-notes");
  });

  it("does not suggest accessibility notes when aria attributes are present", () => {
    const b = withValidPreview({
      "preview/Preview.tsx":
        'export default function Preview() { return <button aria-label="Click me">Click</button>; }',
    });
    expect(codes(validatePreview(b))).not.toContain("preview/missing-accessibility-notes");
  });

  it("every suggestion is still a non-blocking diagnostic (never an error)", () => {
    const b = bundle({ files: { "preview/Preview.tsx": VALID_PREVIEW } });
    const ds = suggestions(validatePreview(b));
    expect(ds.length).toBeGreaterThan(0);
    expect(errors(ds)).toEqual([]);
  });
});

describe("preview validation — CLI integration (validateScenario)", () => {
  it("folds preview diagnostics into the scenario's overall report", async () => {
    const b = bundle({ files: { "preview/Preview.tsx": "export default { bad: true };" } });
    const report = await validateScenario(b);
    expect(report.ok).toBe(false);
    expect(report.diagnostics.map((d) => d.code)).toContain("preview/default-export-not-component");
  });

  it("a scenario without preview/ is unaffected", async () => {
    const report = await validateScenario(bundle());
    expect(report.diagnostics.some((d) => d.code.startsWith("preview/"))).toBe(false);
  });
});

describe("preview validation — every error includes a fix", () => {
  it("errors always carry an actionable fix", () => {
    const samples = [
      validatePreview(bundle({ files: { "preview/stories.ts": VALID_STORIES } })), // missing entry
      validatePreview(withValidPreview({ "preview/preview.config.ts": `export const config = { kind: "sql" };` })),
      validatePreview(
        withValidPreview({
          "preview/stories.ts": `export const stories = [{ id: "a", label: "A" }, { id: "a", label: "B" }];`,
        }),
      ),
    ].flat();
    for (const d of samples.filter((x) => x.level === "error")) {
      expect(d.fix, `${d.code} must have a fix`).toBeTruthy();
    }
  });
});
