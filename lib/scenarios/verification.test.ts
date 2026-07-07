import { describe, expect, it } from "vitest";
import {
  createVerificationService,
  takeSnapshot,
  type SnapshotFile,
  type VerificationEngine,
  type VerificationResult,
} from "@/lib/scenarios/verification";

const FILES: SnapshotFile[] = [
  { path: "UserSearch.tsx", role: "edit", content: "// code" },
  { path: "api.ts", role: "readonly", content: "// api" },
];

const step = {
  id: "build",
  harness: "component",
  functionName: "UserSearch",
  tests: ["tests/step-1.test.tsx"],
};

describe("takeSnapshot", () => {
  it("deep-copies and freezes the files (isolation)", () => {
    const snap = takeSnapshot(FILES);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.files[0])).toBe(true);
    expect(() => {
      (snap.files[0] as { content: string }).content = "mutated";
    }).toThrow();
    // Original session files are untouched.
    expect(FILES[0]!.content).toBe("// code");
  });
});

describe("createVerificationService", () => {
  it("returns an unsupported result for an unknown harness", async () => {
    const svc = createVerificationService([]);
    const r = await svc.verify({ scenarioSlug: "s", step: { ...step, harness: "docker" }, files: FILES });
    expect(r.status).toBe("unsupported");
    expect(r.passed).toBe(false);
  });

  it("normalizes an engine throw into a structured errored result", async () => {
    const boom: VerificationEngine = {
      harness: "component",
      verify: () => Promise.reject(new Error("kaboom")),
    };
    const svc = createVerificationService([boom]);
    const r = await svc.verify({ scenarioSlug: "s", step, files: FILES });
    expect(r.status).toBe("errored");
    expect(r.errors[0]?.message).toBe("kaboom");
  });

  it("does not leak state between independent runs (fresh snapshot each time)", async () => {
    let seen: string[] = [];
    const passResult: VerificationResult = {
      engine: "component",
      status: "passed",
      passed: true,
      testResults: [],
      durationMs: 0,
      errors: [],
      finishedAt: 0,
    };
    const spy: VerificationEngine = {
      harness: "component",
      verify: (req) => {
        seen = req.snapshot.files.map((f) => f.content);
        return Promise.resolve(passResult);
      },
    };
    const svc = createVerificationService([spy]);

    const files1: SnapshotFile[] = [{ path: "a.ts", role: "edit", content: "v1" }];
    await svc.verify({ scenarioSlug: "s", step, files: files1 });
    expect(seen).toEqual(["v1"]);

    const files2: SnapshotFile[] = [{ path: "a.ts", role: "edit", content: "v2" }];
    await svc.verify({ scenarioSlug: "s", step, files: files2 });
    expect(seen).toEqual(["v2"]);
  });
});
