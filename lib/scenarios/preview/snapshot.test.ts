import { describe, expect, it } from "vitest";
import { createPreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import type { Scenario } from "@/lib/scenarios/schema";
import type { SessionFile } from "@/lib/scenarios/types";

// Minimal shape — only the fields `createPreviewSnapshot` reads.
const SCENARIO = { workspace: { entry: "UserSearch.tsx" } } as unknown as Scenario;

const FILES: SessionFile[] = [
  { id: "1", path: "UserSearch.tsx", content: "// entry", role: "edit", origin: "authored" },
  { id: "2", path: "api.ts", content: "// api", role: "readonly", origin: "authored" },
];

describe("createPreviewSnapshot", () => {
  it("defaults activeFile to the scenario's workspace entry when omitted", () => {
    const snap = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    expect(snap.activeFile).toBe("UserSearch.tsx");
  });

  it("uses the provided activeFile when given", () => {
    const snap = createPreviewSnapshot({ scenario: SCENARIO, files: FILES, activeFile: "api.ts" });
    expect(snap.activeFile).toBe("api.ts");
  });

  it("carries label through unchanged (undefined when omitted)", () => {
    expect(createPreviewSnapshot({ scenario: SCENARIO, files: FILES }).label).toBeUndefined();
    expect(createPreviewSnapshot({ scenario: SCENARIO, files: FILES, label: "Live" }).label).toBe("Live");
  });

  it("carries the files through", () => {
    const snap = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    expect(snap.files.map((f) => f.path)).toEqual(["UserSearch.tsx", "api.ts"]);
  });

  it("freezes the snapshot, its file list, and each file (isolation)", () => {
    const snap = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.files)).toBe(true);
    expect(Object.isFrozen(snap.files[0])).toBe(true);
    expect(() => {
      (snap.files[0] as { content: string }).content = "hacked";
    }).toThrow();
  });

  it("copies files rather than aliasing the live session's objects", () => {
    const snap = createPreviewSnapshot({ scenario: SCENARIO, files: FILES });
    expect(snap.files[0]).not.toBe(FILES[0]);
    // The original, unfrozen file is untouched and still mutable.
    expect(Object.isFrozen(FILES[0])).toBe(false);
  });

  it("produces an identical shape whether given live session files or a hand-built fixture", () => {
    const live = createPreviewSnapshot({ scenario: SCENARIO, files: FILES, label: "Live" });
    const checkpointFiles: SessionFile[] = [
      { id: "c1", path: "UserSearch.tsx", content: "// checkpoint", role: "edit", origin: "created" },
    ];
    const checkpoint = createPreviewSnapshot({
      scenario: SCENARIO,
      files: checkpointFiles,
      label: "Checkpoint: step 1",
    });
    expect(Object.keys(live).sort()).toEqual(Object.keys(checkpoint).sort());
  });
});
