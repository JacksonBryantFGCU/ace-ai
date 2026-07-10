import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded campaigns from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Analytics Campaign Dashboard");

    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const springLaunch = await within(list).findByLabelText("Campaign Spring Launch");
    expect(within(list).getByLabelText("Campaign Flash Sale")).toBeTruthy();

    const user = userEvent.setup();
    await user.click(springLaunch);

    const detail = screen.getByLabelText("Campaign details");
    await waitFor(() => expect(within(detail).getAllByText(/impr/).length).toBeGreaterThan(0));
  });
});
