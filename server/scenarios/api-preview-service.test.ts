import { describe, expect, it } from "vitest";
import { checkpointSource } from "@/server/scenarios/checkpoint-source";
import { loadScenario } from "@/server/scenarios/load";
import { runApiPreviewOnServer } from "@/server/scenarios/api-preview-service";
import { applyCheckpoint } from "@/lib/scenarios/session";
import type { ApiPreviewResult } from "@/lib/scenarios/preview/api";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

const SLUG = "notes-rest-api";

async function finalNotesWorkspace(): Promise<SnapshotFile[]> {
  const loaded = await loadScenario(SLUG, { includeAuthorOnly: false });
  const checkpointFiles = await checkpointSource.resolve(SLUG, "delete-notes");
  const session = applyCheckpoint(loaded.files, loaded.entry, checkpointFiles);
  return snapshot(session.files);
}

function snapshot(files: LoadedScenario["files"]): SnapshotFile[] {
  return files.map((file) => ({ path: file.path, content: file.content, role: file.role }));
}

function expectOk(result: ApiPreviewResult): asserts result is Extract<ApiPreviewResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function expectError(result: ApiPreviewResult): asserts result is Extract<ApiPreviewResult, { ok: false }> {
  expect(result.ok).toBe(false);
}

describe("backend API preview service", () => {
  it("executes GET requests against the candidate Express app through the execution platform", async () => {
    const result = await runApiPreviewOnServer({
      scenarioSlug: SLUG,
      files: await finalNotesWorkspace(),
      request: { method: "GET", path: "/notes" },
    });

    expectOk(result);
    expect(result.reset).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body).toEqual([
      expect.objectContaining({ id: 1, title: "Release checklist" }),
      expect.objectContaining({ id: 2, title: "Interview prep" }),
    ]);
    expect(String(result.response.headers["content-type"])).toContain("application/json");
  });

  it("executes POST JSON requests and returns the JSON response", async () => {
    const result = await runApiPreviewOnServer({
      scenarioSlug: SLUG,
      files: await finalNotesWorkspace(),
      request: {
        method: "POST",
        path: "/notes",
        bodyText: JSON.stringify({ title: "Planning notes", content: "Write backend scenario prompts" }),
      },
    });

    expectOk(result);
    expect(result.response.status).toBe(201);
    expect(result.response.body).toEqual(
      expect.objectContaining({
        id: 3,
        title: "Planning notes",
        content: "Write backend scenario prompts",
      }),
    );
  });

  it("executes DELETE requests and preserves HTTP response details", async () => {
    const result = await runApiPreviewOnServer({
      scenarioSlug: SLUG,
      files: await finalNotesWorkspace(),
      request: { method: "DELETE", path: "/notes/1" },
    });

    expectOk(result);
    expect(result.response.status).toBe(204);
    expect(result.response.text).toBe("");
  });

  it("returns a structured UI error for invalid JSON before execution", async () => {
    const result = await runApiPreviewOnServer({
      scenarioSlug: SLUG,
      files: await finalNotesWorkspace(),
      request: { method: "POST", path: "/notes", bodyText: "{" },
    });

    expectError(result);
    expect(result.error.kind).toBe("invalid-json");
    expect(result.error.message).toContain("not valid JSON");
  });

  it("returns a structured error when the candidate app export is missing", async () => {
    const files = (await finalNotesWorkspace()).map((file) =>
      file.path === "app.ts" ? { ...file, content: 'import express from "express";\nexport const app = express();' } : file,
    );
    const result = await runApiPreviewOnServer({
      scenarioSlug: SLUG,
      files,
      request: { method: "GET", path: "/notes" },
    });

    expectError(result);
    expect(result.error.kind).toBe("runtime");
    expect(result.error.message).toMatch(/default|export|module|request/i);
  });

  it("uses a fresh SQLite database for each preview request", async () => {
    const files = await finalNotesWorkspace();
    const request = {
      method: "POST" as const,
      path: "/notes",
      bodyText: JSON.stringify({ title: "Fresh state", content: "Preview database reset check" }),
    };

    const first = await runApiPreviewOnServer({ scenarioSlug: SLUG, files, request });
    const second = await runApiPreviewOnServer({ scenarioSlug: SLUG, files, request });

    expectOk(first);
    expectOk(second);
    expect(first.response.body).toEqual(expect.objectContaining({ id: 3 }));
    expect(second.response.body).toEqual(expect.objectContaining({ id: 3 }));
  });
});
