import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters campaigns by channel and status against the real backend", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(8));

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Channel"), "3");
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(2));
    expect(within(list).getByLabelText("Campaign Retargeting Push")).toBeTruthy();
    expect(within(list).getByLabelText("Campaign Flash Sale")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Channel"), "all");
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(8));

    // Step 1 behavior still works: selecting a campaign shows its real detail.
    const flashSale = await within(list).findByLabelText("Campaign Flash Sale");
    await user.click(flashSale);
    const detail = screen.getByLabelText("Campaign details");
    expect(await within(detail).findByText("Flash Sale")).toBeTruthy();
  });

  it("recomputes KPIs when a date range is applied and rejects an invalid range", async () => {
    render(<App />);
    const list = await screen.findByLabelText("Campaigns");
    const springLaunch = await within(list).findByLabelText("Campaign Spring Launch");

    const user = userEvent.setup();
    await user.click(springLaunch);
    const detail = screen.getByLabelText("Campaign details");
    await within(detail).findByText("Spring Launch");

    await user.type(screen.getByLabelText("Start date"), "2025-02-01");
    await user.type(screen.getByLabelText("End date"), "2025-02-02");
    await waitFor(() => expect(within(detail).getAllByText(/impr/)).toHaveLength(2));

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2025-03-01");
    expect((await screen.findAllByText("Invalid date range")).length).toBeGreaterThan(0);
  });
});
