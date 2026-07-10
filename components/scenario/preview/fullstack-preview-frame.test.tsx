// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FullstackPreviewFrame } from "@/components/scenario/preview/fullstack-preview-frame";
import { getFullstackPreviewLogs, startFullstackPreview, stopFullstackPreview } from "@/actions/fullstack-preview";

vi.mock("@/actions/fullstack-preview", () => ({
  startFullstackPreview: vi.fn(),
  stopFullstackPreview: vi.fn(),
  getFullstackPreviewLogs: vi.fn(),
}));

const files = [{ path: "frontend/src/App.tsx", content: "export default function App() { return null; }", role: "edit" as const }];

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("FullstackPreviewFrame", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts the initial preview immediately", async () => {
    vi.mocked(startFullstackPreview).mockResolvedValue({
      ok: true,
      preview: {
        mode: "fullstack",
        runtimeId: "runtime-1",
        frontendUrl: "http://localhost:5173",
        backendUrl: "http://localhost:4310",
        previewUrl: "http://localhost:5173",
        frontendStatus: "healthy",
        backendStatus: "healthy",
        logs: [],
      },
    });

    render(<FullstackPreviewFrame scenarioSlug="customer-feedback-dashboard" files={files} />);
    await flush();

    expect(startFullstackPreview).toHaveBeenCalledTimes(1);
    expect(await screen.findByTitle("Fullstack app preview")).toHaveAttribute("src", "http://localhost:5173");
  });

  it("debounces file-change refreshes and keeps the existing preview mounted until replacement is ready", async () => {
    vi.useFakeTimers();
    vi.mocked(getFullstackPreviewLogs).mockResolvedValue(null);
    vi.mocked(startFullstackPreview)
      .mockResolvedValueOnce({
        ok: true,
        preview: {
          mode: "fullstack",
          runtimeId: "runtime-1",
          frontendUrl: "http://localhost:5173",
          backendUrl: "http://localhost:4310",
          previewUrl: "http://localhost:5173",
          frontendStatus: "healthy",
          backendStatus: "healthy",
          logs: [],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        preview: {
          mode: "fullstack",
          runtimeId: "runtime-2",
          frontendUrl: "http://localhost:5273",
          backendUrl: "http://localhost:4410",
          previewUrl: "http://localhost:5273",
          frontendStatus: "healthy",
          backendStatus: "healthy",
          logs: [],
        },
      });

    const view = render(<FullstackPreviewFrame scenarioSlug="customer-feedback-dashboard" files={files} />);
    await flush();
    expect(await screen.findByTitle("Fullstack app preview")).toHaveAttribute("src", "http://localhost:5173");

    view.rerender(
      <FullstackPreviewFrame
        scenarioSlug="customer-feedback-dashboard"
        files={[{ ...files[0], content: "export default function App() { return <div>Updated</div>; }" }]}
      />,
    );

    expect(startFullstackPreview).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle("Fullstack app preview")).toHaveAttribute("src", "http://localhost:5173");

    await act(async () => {
      vi.advanceTimersByTime(249);
    });
    expect(startFullstackPreview).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await flush();

    expect(startFullstackPreview).toHaveBeenCalledTimes(2);
    expect(await screen.findByTitle("Fullstack app preview")).toHaveAttribute("src", "http://localhost:5273");
    expect(stopFullstackPreview).toHaveBeenCalledWith("runtime-1");
  });
});
