import { describe, expect, it } from "vitest";
import {
  PREVIEW_SOURCE_PATH,
  PROVIDERS_SOURCE_PATH,
  buildVfs,
  dirname,
  normalize,
  resolveRelative,
} from "@/lib/scenarios/preview/renderers/component/vfs";

describe("normalize", () => {
  it("collapses '.' and '..' segments", () => {
    expect(normalize("a/./b/../c")).toBe("a/c");
    expect(normalize("a/b")).toBe("a/b");
  });
});

describe("dirname", () => {
  it("returns the parent directory, or '' at the root", () => {
    expect(dirname("a/b/c.ts")).toBe("a/b");
    expect(dirname("c.ts")).toBe("");
  });
});

describe("resolveRelative", () => {
  const vfs = new Map<string, string>([
    ["UserSearch.tsx", "// entry"],
    ["hooks/useSearch.ts", "// hook"],
  ]);

  it("resolves a sibling relative import, trying extensions", () => {
    expect(resolveRelative("hooks/useSearch.ts", "../UserSearch", vfs)).toBe("UserSearch.tsx");
  });

  it("resolves a nested relative import", () => {
    expect(resolveRelative("UserSearch.tsx", "./hooks/useSearch", vfs)).toBe("hooks/useSearch.ts");
  });

  it("falls back to the extensionless base when nothing matches (used as a miss key)", () => {
    expect(resolveRelative("UserSearch.tsx", "./missing", vfs)).toBe("missing");
  });
});

describe("buildVfs", () => {
  it("places candidate files at their own paths and preview source at fixed paths", () => {
    const vfs = buildVfs({
      files: [{ path: "UserSearch.tsx", content: "// entry" }],
      previewSource: "// preview",
      providersSource: "// providers",
    });
    expect(vfs.get("UserSearch.tsx")).toBe("// entry");
    expect(vfs.get(PREVIEW_SOURCE_PATH)).toBe("// preview");
    expect(vfs.get(PROVIDERS_SOURCE_PATH)).toBe("// providers");
  });

  it("omits providers when not given", () => {
    const vfs = buildVfs({ files: [], previewSource: "// preview" });
    expect(vfs.has(PROVIDERS_SOURCE_PATH)).toBe(false);
  });
});
