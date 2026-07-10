import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters events by status and availability", async () => {
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    expect(await within(eventList).findByText("React Meetup")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "cancelled");
    await waitFor(() => expect(within(eventList).queryByText("React Meetup")).toBeNull());
    expect(within(eventList).getByText("Volunteer Cleanup")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");
    await userEvent.selectOptions(screen.getByLabelText("Availability"), "full");
    await waitFor(() => expect(within(eventList).queryByText("Volunteer Cleanup")).toBeNull());
    expect(await within(eventList).findByText("Design Workshop")).toBeTruthy();
  });

  it("creates an RSVP through the backend and displays validation errors", async () => {
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    await userEvent.click(await within(eventList).findByRole("button", { name: /React Meetup/i }));

    const detailPanel = screen.getByLabelText("Event details");
    await within(detailPanel).findByText("Alex Rivera");
    expect(within(detailPanel).getByText(/3 spots remaining/i)).toBeTruthy();

    await userEvent.type(within(detailPanel).getByLabelText("Attendee name"), "Jamie Fox");
    await userEvent.type(within(detailPanel).getByLabelText("Attendee email"), "not-an-email");
    await userEvent.click(within(detailPanel).getByRole("button", { name: /add rsvp/i }));
    expect(await within(detailPanel).findByText(/invalid attendee email/i)).toBeTruthy();

    await userEvent.clear(within(detailPanel).getByLabelText("Attendee email"));
    await userEvent.type(within(detailPanel).getByLabelText("Attendee email"), "jamie@example.com");
    await userEvent.click(within(detailPanel).getByRole("button", { name: /add rsvp/i }));

    await within(detailPanel).findByText("Jamie Fox");
    expect(within(detailPanel).getByText(/2 spots remaining/i)).toBeTruthy();
  });
});
