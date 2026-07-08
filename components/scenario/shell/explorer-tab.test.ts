// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExplorerTab } from "@/components/scenario/shell/explorer-tab";
import type { ScenarioSessionApi } from "@/hooks/use-scenario-session";
import type { SessionFile, WorkspaceSession } from "@/lib/scenarios/types";

function file(id: string, path: string, role: SessionFile["role"]): SessionFile {
  return { id, path, role, content: "", origin: role === "readonly" ? "authored" : "created" };
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

describe("ExplorerTab", () => {
  afterEach(() => cleanup());

  it("shows editable work before locked files and keeps locked files collapsed by default", async () => {
    const user = userEvent.setup();
    render(
      createElement(ExplorerTab, {
        api: api([
          file("backend-app", "backend/src/app.ts", "edit"),
          file("frontend-app", "frontend/src/App.tsx", "edit"),
          file("backend-db", "backend/src/db.ts", "readonly"),
          file("frontend-config", "frontend/vite.config.ts", "readonly"),
        ]),
      }),
    );

    expect(screen.getByText("Files to edit")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse backend" })).toBeTruthy();
    expect(screen.queryByText("db.ts")).toBeNull();

    const lockedToggle = screen.getByRole("button", { name: /locked files/i });
    expect(lockedToggle.getAttribute("aria-expanded")).toBe("false");

    await user.click(lockedToggle);

    expect(lockedToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("button", { name: "Collapse backend" }).length).toBeGreaterThan(1);
  });

  it("renders nested folders as collapsible tree nodes", async () => {
    const user = userEvent.setup();
    render(
      createElement(ExplorerTab, {
        api: api(
          [
            file("backend-app", "backend/app.ts", "edit"),
            file("frontend-app", "frontend/src/components/App.tsx", "edit"),
          ],
          "backend-app",
        ),
      }),
    );

    await user.click(screen.getByRole("button", { name: "Expand frontend" }));
    await user.click(screen.getByRole("button", { name: "Expand frontend/src" }));
    await user.click(screen.getByRole("button", { name: "Expand frontend/src/components" }));
    expect(screen.getByText("App.tsx")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Collapse frontend/src/components" }));
    expect(screen.queryByText("App.tsx")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Expand frontend/src/components" }));
    expect(screen.getByText("App.tsx")).toBeTruthy();
  });
});
