import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded incidents from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Incident Management Console");

    const user = userEvent.setup();
    render(<App />);

    const incidents = await screen.findByLabelText("Incidents");
    expect(within(incidents).getByText("Auth service full outage")).toBeTruthy();
    expect(within(incidents).getByText("Elevated API latency")).toBeTruthy();

    await user.click(within(incidents).getByText("Payment webhook delays"));
    const timeline = screen.getByLabelText("Timeline");
    expect(await within(timeline).findByText("Status changed to monitoring.")).toBeTruthy();
  });
});
