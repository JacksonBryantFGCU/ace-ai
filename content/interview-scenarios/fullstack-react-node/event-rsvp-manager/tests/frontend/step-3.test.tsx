import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("moves a cancelled RSVP to going and updates the spots remaining count", async () => {
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    await userEvent.click(await within(eventList).findByRole("button", { name: /React Meetup/i }));

    const detailPanel = screen.getByLabelText("Event details");
    const priyaRow = (await within(detailPanel).findByText("Priya Shah")).closest("li")!;
    expect(within(detailPanel).getByText(/3 spots remaining/i)).toBeTruthy();

    await userEvent.selectOptions(within(priyaRow).getByLabelText("Update status for Priya Shah"), "going");
    await userEvent.click(within(priyaRow).getByRole("button", { name: /update/i }));

    expect(await within(priyaRow).findByText("Going", { selector: ".status" })).toBeTruthy();
    expect(within(detailPanel).getByText(/2 spots remaining/i)).toBeTruthy();
  });

  it("shows a backend error when moving a waitlisted RSVP to going on a full event", async () => {
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    await userEvent.click(await within(eventList).findByRole("button", { name: /Design Workshop/i }));

    const detailPanel = screen.getByLabelText("Event details");
    const caseyRow = (await within(detailPanel).findByText("Casey Kim")).closest("li")!;

    await userEvent.selectOptions(within(caseyRow).getByLabelText("Update status for Casey Kim"), "going");
    await userEvent.click(within(caseyRow).getByRole("button", { name: /update/i }));

    expect(await within(caseyRow).findByText(/event is full/i)).toBeTruthy();
    expect(within(caseyRow).getByText("Waitlisted", { selector: ".status" })).toBeTruthy();
  });
});
