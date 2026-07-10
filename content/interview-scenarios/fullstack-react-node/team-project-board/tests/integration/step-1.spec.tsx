import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded tasks from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Team Project Board");

    render(<App />);
    const board = screen.getByLabelText("Board");
    expect(await within(board).findByText("Design onboarding screen")).toBeTruthy();
    expect(within(board).getByText("Archive old dashboards")).toBeTruthy();
  });
});
