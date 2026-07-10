import { describe, expect, it } from "vitest";
import { buildCsvPreview, listMlCsvFiles } from "@/lib/scenarios/machine-learning-data-preview";

describe("listMlCsvFiles", () => {
  it("lists only CSV files under workspace/data/", () => {
    const files = [
      { path: "main.py" },
      { path: "data/train.csv" },
      { path: "data/test.csv" },
      { path: "data/notes.txt" },
      { path: "src/util.py" },
    ];
    expect(listMlCsvFiles(files)).toEqual(["data/test.csv", "data/train.csv"]);
  });

  it("returns an empty list when there are no data files", () => {
    expect(listMlCsvFiles([{ path: "main.py" }])).toEqual([]);
  });
});

describe("buildCsvPreview", () => {
  it("returns the first 5 rows by default", () => {
    const content = "a,b\n1,2\n3,4\n5,6\n7,8\n9,10\n11,12\n";
    const preview = buildCsvPreview("data/train.csv", content);
    expect(preview.columns).toEqual(["a", "b"]);
    expect(preview.rows).toHaveLength(5);
    expect(preview.rows[0]).toEqual({ a: "1", b: "2" });
    expect(preview.rowCount).toBe(6);
    expect(preview.truncated).toBe(true);
  });

  it("is not truncated when the file has 5 or fewer data rows", () => {
    const content = "a,b\n1,2\n3,4\n";
    const preview = buildCsvPreview("data/train.csv", content);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rowCount).toBe(2);
    expect(preview.truncated).toBe(false);
  });

  it("handles an empty CSV (no content at all)", () => {
    const preview = buildCsvPreview("data/empty.csv", "");
    expect(preview.columns).toEqual([]);
    expect(preview.rows).toEqual([]);
    expect(preview.rowCount).toBe(0);
    expect(preview.truncated).toBe(false);
  });

  it("handles a header-only CSV (no data rows)", () => {
    const preview = buildCsvPreview("data/empty.csv", "a,b,c\n");
    expect(preview.columns).toEqual(["a", "b", "c"]);
    expect(preview.rows).toEqual([]);
    expect(preview.rowCount).toBe(0);
    expect(preview.truncated).toBe(false);
  });

  it("respects quoted fields containing commas", () => {
    const content = 'name,note\n"Doe, Jane","says ""hi"""\n';
    const preview = buildCsvPreview("data/train.csv", content);
    expect(preview.rows[0]).toEqual({ name: "Doe, Jane", note: 'says "hi"' });
  });

  it("respects a custom row limit", () => {
    const content = "a\n1\n2\n3\n";
    const preview = buildCsvPreview("data/train.csv", content, 2);
    expect(preview.rows).toHaveLength(2);
    expect(preview.truncated).toBe(true);
  });
});
