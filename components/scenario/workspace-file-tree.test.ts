// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceFileTree } from "@/components/scenario/workspace-file-tree";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";
import type { SessionFile, WorkspaceSession } from "@/lib/scenarios/types";

function file(id: string, path: string, role: SessionFile["role"]): SessionFile {
  return { id, path, role, content: "", origin: "authored" };
}

function api(files: SessionFile[], activeFileId = files[0]?.id ?? null): ScenarioSessionApi {
  const session: WorkspaceSession = {
    files,
    activeFileId,
    openFileIds: activeFileId ? [activeFileId] : [],
  };
  return {
    session,
    active: files.find((item) => item.id === activeFileId) ?? null,
    error: null,
    edit: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    create: vi.fn(() => true),
    rename: vi.fn(() => true),
    remove: vi.fn(() => true),
    applyCheckpoint: vi.fn(),
    clearError: vi.fn(),
  };
}

describe("WorkspaceFileTree", () => {
  afterEach(() => cleanup());

  it("prioritizes editable fullstack files and collapses readonly reference files", async () => {
    const user = userEvent.setup();
    render(
      createElement(WorkspaceFileTree, {
        api: api([
          file("backend-app", "backend/src/app.ts", "edit"),
          file("frontend-app", "frontend/src/App.tsx", "edit"),
          file("backend-db", "backend/src/db.ts", "readonly"),
          file("frontend-config", "frontend/vite.config.ts", "readonly"),
        ]),
      }),
    );

    expect(screen.getByText("Files to edit")).toBeTruthy();
    expect(screen.getByText("backend/src/app.ts")).toBeTruthy();
    expect(screen.getByText("frontend/src/App.tsx")).toBeTruthy();
    expect(screen.queryByText("backend/src/db.ts")).toBeNull();

    const referenceToggle = screen.getByRole("button", { name: /reference files/i });
    expect(referenceToggle.getAttribute("aria-expanded")).toBe("false");

    await user.click(referenceToggle);

    expect(referenceToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("backend/src/db.ts")).toBeTruthy();
    expect(screen.getByText("frontend/vite.config.ts")).toBeTruthy();
  });

  it("keeps the old flat listing for non-fullstack workspaces", () => {
    render(
      createElement(WorkspaceFileTree, {
        api: api([
          file("app", "app.ts", "edit"),
          file("db", "db.ts", "readonly"),
        ]),
      }),
    );

    expect(screen.queryByText("Files to edit")).toBeNull();
    expect(screen.queryByRole("button", { name: /reference files/i })).toBeNull();
    expect(screen.getByText("app.ts")).toBeTruthy();
    expect(screen.getByText("db.ts")).toBeTruthy();
  });
});
