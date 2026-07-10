import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading, then the campaign list", async () => {
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain("Loading campaigns");

    const list = screen.getByLabelText("Campaigns");
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(8));
  });

  it("shows the selected campaign's KPIs and daily metrics from the backend", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const springLaunch = await within(list).findByLabelText("Campaign Spring Launch");

    const user = userEvent.setup();
    await user.click(springLaunch);

    const detail = screen.getByLabelText("Campaign details");
    expect(await within(detail).findByText("Spring Launch")).toBeTruthy();
    expect(within(detail).getByText("12000")).toBeTruthy();
    expect(within(detail).getByText("7.00%")).toBeTruthy();
    expect(within(detail).getByText("2025-02-01")).toBeTruthy();
  });
});
