import { describe, expect, it } from "vitest";
import { checkpointTargetPath, normalizeSolutionImports } from "@/lib/scenarios/checkpoints";

describe("checkpointTargetPath", () => {
  it("strips the solution/<step-dir>/ prefix", () => {
    expect(checkpointTargetPath("solution/step-1/UserSearch.tsx")).toBe("UserSearch.tsx");
    expect(checkpointTargetPath("solution/step-3/hooks/useSearch.ts")).toBe("hooks/useSearch.ts");
  });

  it("returns paths that don't start with solution/ unchanged", () => {
    expect(checkpointTargetPath("workspace/UserSearch.tsx")).toBe("workspace/UserSearch.tsx");
  });

  it("normalizes backslashes before stripping the prefix", () => {
    expect(checkpointTargetPath("solution\\step-1\\UserSearch.tsx")).toBe("UserSearch.tsx");
  });
});

describe("normalizeSolutionImports", () => {
  it("rewrites ../../workspace/ imports to ./ (a solution file overlaid at the workspace root)", () => {
    const raw = 'import { searchUsers } from "../../workspace/api";\nimport type { User } from "../../workspace/types";';
    expect(normalizeSolutionImports(raw)).toBe('import { searchUsers } from "./api";\nimport type { User } from "./types";');
  });

  it("leaves content with no such imports unchanged", () => {
    const raw = 'import { useState } from "react";\nexport function Widget() { return null; }';
    expect(normalizeSolutionImports(raw)).toBe(raw);
  });

  it("rewrites every occurrence, not just the first", () => {
    const raw = 'import "../../workspace/a";\nimport "../../workspace/b";';
    expect(normalizeSolutionImports(raw)).toBe('import "./a";\nimport "./b";');
  });
});
