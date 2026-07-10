import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("updates RSVP status and persists the change across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    await user.click(await within(eventList).findByRole("button", { name: /React Meetup/i }));

    const detailPanel = screen.getByLabelText("Event details");
    const priyaRow = (await within(detailPanel).findByText("Priya Shah")).closest("li")!;

    await user.selectOptions(within(priyaRow).getByLabelText("Update status for Priya Shah"), "going");
    await user.click(within(priyaRow).getByRole("button", { name: /update/i }));
    await waitFor(() => expect(within(priyaRow).getByText("Going", { selector: ".status" })).toBeTruthy());

    cleanup();
    render(<App />);
    const reloadedList = screen.getByLabelText("Events");
    await user.click(await within(reloadedList).findByRole("button", { name: /React Meetup/i }));
    const reloadedDetail = screen.getByLabelText("Event details");
    const reloadedRow = (await within(reloadedDetail).findByText("Priya Shah")).closest("li")!;
    expect(within(reloadedRow).getByText("Going", { selector: ".status" })).toBeTruthy();
  });
});
