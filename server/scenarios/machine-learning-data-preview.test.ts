import { describe, expect, it } from "vitest";
import { mlDataFilesOf, mlDataPreviewOf, MlDataPreviewError } from "@/server/scenarios/machine-learning-data-preview";
import type { LoadedScenario } from "@/lib/scenarios/types";

/**
 * `loaded.files` is the SAME candidate-facing allowlist every panel (editor,
 * explorer, preview) already trusts — it never contains `tests/`/`solution/`
 * paths (server/scenarios/load.ts strips those at the serving boundary). These
 * tests use an internal fixture (never public content) that mirrors exactly
 * what a real ML `LoadedScenario` looks like, including a couple of paths that
 * would be traversal/authored-only attempts if the resolver ever touched fs
 * directly — it doesn't, so they simply aren't in the list.
 */
function loaded(): LoadedScenario {
  return {
    slug: "ml-fixture",
    category: "machine-learning-python",
    scenario: {} as LoadedScenario["scenario"],
    sections: {},
    entry: "main.py",
    files: [
      { path: "main.py", role: "edit", content: "print('starter')" },
      { path: "data/train.csv", role: "readonly", content: "a,b\n1,2\n3,4\n5,6\n7,8\n9,10\n11,12\n" },
      { path: "data/test.csv", role: "readonly", content: "a,b\n" },
    ],
  } as LoadedScenario;
}

describe("mlDataFilesOf", () => {
  it("lists CSV files from workspace/data/", () => {
    expect(mlDataFilesOf(loaded())).toEqual(["data/test.csv", "data/train.csv"]);
  });

  it("returns an empty list when the scenario has no data files", () => {
    const noData = loaded();
    noData.files = noData.files.filter((f) => !f.path.startsWith("data/"));
    expect(mlDataFilesOf(noData)).toEqual([]);
  });
});

describe("mlDataPreviewOf", () => {
  it("returns the first 5 rows of the requested file", () => {
    const preview = mlDataPreviewOf(loaded(), "data/train.csv");
    expect(preview.columns).toEqual(["a", "b"]);
    expect(preview.rows).toHaveLength(5);
    expect(preview.rowCount).toBe(6);
    expect(preview.truncated).toBe(true);
  });

  it("handles an empty (header-only) CSV", () => {
    const preview = mlDataPreviewOf(loaded(), "data/test.csv");
    expect(preview.columns).toEqual(["a", "b"]);
    expect(preview.rows).toEqual([]);
    expect(preview.rowCount).toBe(0);
  });

  it("rejects a path-traversal attempt as not found", () => {
    expect(() => mlDataPreviewOf(loaded(), "../../../etc/passwd")).toThrow(MlDataPreviewError);
    expect(() => mlDataPreviewOf(loaded(), "data/../../../secrets.csv")).toThrow(MlDataPreviewError);
  });

  it("never exposes authored tests/ content, even if requested by path", () => {
    expect(() => mlDataPreviewOf(loaded(), "tests/step-1.test.py")).toThrow(/not found/);
  });

  it("never exposes authored solution/ content, even if requested by path", () => {
    expect(() => mlDataPreviewOf(loaded(), "solution/step-1/main.py")).toThrow(/not found/);
  });

  it("rejects a non-CSV file even if it's a real candidate file", () => {
    expect(() => mlDataPreviewOf(loaded(), "main.py")).toThrow(/Unsupported data file/);
  });
});
