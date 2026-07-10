// @vitest-environment jsdom

import { createElement } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataPreviewTab } from "@/components/scenario/shell/data-preview-tab";
import { fetchMlDataPreview, listMlScenarioDataFiles } from "@/actions/scenario";
import type { MlDataPreview } from "@/lib/scenarios/machine-learning-data-preview";

vi.mock("@/actions/scenario", () => ({
  listMlScenarioDataFiles: vi.fn(),
  fetchMlDataPreview: vi.fn(),
}));

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** A deferred promise — lets a test control exactly when a mocked fetch resolves. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function preview(fileName: string, overrides: Partial<MlDataPreview> = {}): MlDataPreview {
  return {
    fileName,
    columns: ["a", "b"],
    rows: [{ a: "1", b: "2" }],
    rowCount: 1,
    truncated: false,
    ...overrides,
  };
}

describe("DataPreviewTab", () => {
  afterEach(() => {
    cleanup();
    // `resetAllMocks` (not `clearAllMocks`) — clearing only wipes call
    // history, leaving a prior test's `mockImplementation`/queued
    // `mockResolvedValueOnce` values to leak into the next test once its own
    // queue is exhausted.
    vi.resetAllMocks();
  });

  it("lists dataset files and auto-selects + previews the first one", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/test.csv", "data/train.csv"]);
    vi.mocked(fetchMlDataPreview).mockResolvedValue(preview("data/test.csv"));

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();

    expect(screen.getByText("data/test.csv")).toBeTruthy();
    expect(screen.getByText("data/train.csv")).toBeTruthy();
    expect(fetchMlDataPreview).toHaveBeenCalledWith("iris-species-classifier", "data/test.csv");
    expect(await screen.findByText("a")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("only ever renders the exact files the server returned — never adds or leaks any others", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/train.csv"]);
    vi.mocked(fetchMlDataPreview).mockResolvedValue(preview("data/train.csv"));

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBe(1);
    expect(items[0]!.textContent).toContain("data/train.csv");
    // Never a hidden tests/ or solution/ path, even if a future server bug
    // returned one — the component just renders whatever it's given, and
    // this asserts it doesn't fabricate or merge in anything extra either.
    expect(screen.queryByText(/tests\//)).toBeNull();
    expect(screen.queryByText(/solution\//)).toBeNull();
  });

  it("shows an empty state (no files) without crashing, and renders no Preview section", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue([]);

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();

    expect(screen.getByText("No data files found for this scenario.")).toBeTruthy();
    expect(screen.queryByText("Preview")).toBeNull();
    expect(fetchMlDataPreview).not.toHaveBeenCalled();
  });

  it("switches preview content when a different file is selected, replacing the old file's rows", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/test.csv", "data/train.csv"]);
    vi.mocked(fetchMlDataPreview).mockImplementation(async (_slug, file) =>
      file === "data/test.csv"
        ? preview("data/test.csv", { columns: ["a"], rows: [{ a: "test-row" }] })
        : preview("data/train.csv", { columns: ["a"], rows: [{ a: "train-row" }] }),
    );

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();
    expect(await screen.findByText("test-row")).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByText("data/train.csv"));
    await flush();

    expect(await screen.findByText("train-row")).toBeTruthy();
    expect(screen.queryByText("test-row")).toBeNull();
  });

  it("never flashes the previous file's stale rows while a new selection's fetch is still in flight", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/test.csv", "data/train.csv"]);
    vi.mocked(fetchMlDataPreview).mockResolvedValueOnce(
      preview("data/test.csv", { columns: ["a"], rows: [{ a: "test-row" }] }),
    );

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();
    expect(await screen.findByText("test-row")).toBeTruthy();

    // The second fetch (for train.csv) never resolves during this test —
    // proves the component doesn't keep showing test.csv's rows while
    // waiting, it falls back to the loading state instead.
    const pending = deferred<MlDataPreview>();
    vi.mocked(fetchMlDataPreview).mockReturnValueOnce(pending.promise);

    const user = userEvent.setup();
    await user.click(screen.getByText("data/train.csv"));
    await flush();

    expect(screen.queryByText("test-row")).toBeNull();
    expect(screen.getByText("Loading preview...")).toBeTruthy();

    pending.resolve(preview("data/train.csv", { columns: ["a"], rows: [{ a: "train-row" }] }));
    await flush();
    expect(await screen.findByText("train-row")).toBeTruthy();
  });

  it("resets file list and preview when the scenarioSlug prop changes — no stale content from the previous scenario", async () => {
    // Keyed by (scenarioSlug, file) rather than call order/count: switching
    // `scenarioSlug` legitimately triggers an intermediate fetch for the OLD
    // `selected` file under the NEW slug (both effects share `scenarioSlug`
    // in their deps, and `selected` only updates after the file-list effect
    // resolves) before settling on the new scenario's file — a keyed mock
    // doesn't need to predict that exact call sequence.
    vi.mocked(listMlScenarioDataFiles).mockImplementation(async (slug) =>
      slug === "iris-species-classifier" ? ["data/iris.csv"] : ["data/houses.csv"],
    );
    vi.mocked(fetchMlDataPreview).mockImplementation(async (_slug, file) =>
      file === "data/iris.csv"
        ? preview("data/iris.csv", { columns: ["species"], rows: [{ species: "setosa" }] })
        : preview("data/houses.csv", { columns: ["price"], rows: [{ price: "300000" }] }),
    );

    const view = render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();
    expect(await screen.findByText("setosa")).toBeTruthy();

    view.rerender(createElement(DataPreviewTab, { scenarioSlug: "house-price-regression" }));
    await flush();

    expect(await screen.findByText("300000")).toBeTruthy();
    expect(screen.queryByText("setosa")).toBeNull();
    expect(screen.queryByText("data/iris.csv")).toBeNull();
    expect(screen.getByText("data/houses.csv")).toBeTruthy();
  });

  it("shows a preview error without crashing, and clears it once a valid selection loads", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/broken.csv", "data/ok.csv"]);
    vi.mocked(fetchMlDataPreview).mockImplementation(async (_slug, file) => {
      if (file === "data/broken.csv") throw new Error("Failed to load data preview.");
      return preview("data/ok.csv", { columns: ["a"], rows: [{ a: "ok-row" }] });
    });

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();
    expect(await screen.findByText("Failed to load data preview.")).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByText("data/ok.csv"));
    await flush();

    expect(await screen.findByText("ok-row")).toBeTruthy();
    expect(screen.queryByText("Failed to load data preview.")).toBeNull();
  });

  it("handles an empty (header-only) CSV preview without crashing", async () => {
    vi.mocked(listMlScenarioDataFiles).mockResolvedValue(["data/empty.csv"]);
    vi.mocked(fetchMlDataPreview).mockResolvedValue(preview("data/empty.csv", { columns: [], rows: [], rowCount: 0 }));

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();

    expect(await screen.findByText("No previewable rows in this file yet.")).toBeTruthy();
  });

  it("shows a files-list error state without crashing", async () => {
    vi.mocked(listMlScenarioDataFiles).mockRejectedValue(new Error("Failed to list data files."));

    render(createElement(DataPreviewTab, { scenarioSlug: "iris-species-classifier" }));
    await flush();

    expect(await screen.findByText("Failed to list data files.")).toBeTruthy();
    expect(fetchMlDataPreview).not.toHaveBeenCalled();
  });
});
