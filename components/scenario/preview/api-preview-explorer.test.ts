// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runApiPreview } from "@/actions/api-preview";
import { ApiPreviewExplorer } from "@/components/scenario/preview/api-preview-explorer";
import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";

vi.mock("@/actions/api-preview", () => ({
  runApiPreview: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(runApiPreview).mockReset();
});

const snapshot = {
  scenario: { id: "notes-rest-api", workspace: { entry: "app.ts" } },
  files: [
    { id: "app", path: "app.ts", content: "export default app;", role: "edit", origin: "authored" },
    { id: "db", path: "db.ts", content: "export {};", role: "readonly", origin: "authored" },
  ],
  activeFile: "app.ts",
} as unknown as PreviewSnapshot;

describe("ApiPreviewExplorer", () => {
  it("renders successful backend preview results", async () => {
    vi.mocked(runApiPreview).mockResolvedValue({
      ok: true,
      durationMs: 12,
      reset: true,
      response: {
        status: 200,
        statusCode: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        type: "application/json",
        text: '{"ok":true}',
        body: { ok: true },
      },
    });

    render(
      createElement(ApiPreviewExplorer, {
        snapshot,
        config: {
          title: "Notes API Explorer",
          defaultExampleId: "list-notes",
          examples: [{ id: "list-notes", label: "List notes", method: "GET", path: "/notes" }],
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    expect(await screen.findByText("200")).toBeTruthy();
    expect(screen.getByText("12 ms")).toBeTruthy();
    expect(screen.getByText(/"ok": true/)).toBeTruthy();
    expect(screen.getByText(/content-type/)).toBeTruthy();
    expect(runApiPreview).toHaveBeenCalledWith({
      scenarioSlug: "notes-rest-api",
      files: [
        { path: "app.ts", content: "export default app;", role: "edit" },
        { path: "db.ts", content: "export {};", role: "readonly" },
      ],
      request: { method: "GET", path: "/notes", bodyText: "" },
    });
  });

  it("wraps long response content instead of allowing horizontal scrolling", async () => {
    vi.mocked(runApiPreview).mockResolvedValue({
      ok: true,
      durationMs: 8,
      reset: true,
      response: {
        status: 200,
        statusCode: 200,
        headers: {
          "x-debug-token": "a".repeat(120),
          "content-type": "application/json; charset=utf-8",
        },
        type: "application/json",
        text: "",
        body: { token: "b".repeat(160) },
      },
    });

    render(
      createElement(ApiPreviewExplorer, {
        snapshot,
        config: {
          title: "Notes API Explorer",
          examples: [{ id: "list-notes", label: "List notes", method: "GET", path: "/notes" }],
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    const body = await screen.findByTestId("api-preview-response-body");
    const headers = screen.getByTestId("api-preview-response-headers");
    expect(body).toHaveClass("api-preview-scrollbar", "overflow-x-hidden", "whitespace-pre-wrap");
    expect(body.className).toContain("[overflow-wrap:anywhere]");
    expect(headers).toHaveClass("api-preview-scrollbar", "overflow-x-hidden");
    expect(screen.getByText("x-debug-token")).toBeTruthy();
  });

  it("renders structured backend preview errors", async () => {
    vi.mocked(runApiPreview).mockResolvedValue({
      ok: false,
      durationMs: 2,
      reset: true,
      error: { kind: "invalid-json", message: "Request body is not valid JSON" },
    });

    render(
      createElement(ApiPreviewExplorer, {
        snapshot,
        config: {
          examples: [{ id: "create-note", label: "Create note", method: "POST", path: "/notes", body: { title: "A" } }],
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    expect(await screen.findByText("Error")).toBeTruthy();
    expect(screen.getByText("Request body is not valid JSON")).toBeTruthy();
    expect(screen.getByText("invalid-json")).toBeTruthy();
  });
});
