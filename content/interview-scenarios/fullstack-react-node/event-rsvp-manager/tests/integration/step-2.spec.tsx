import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters events and creates an RSVP through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);
    const eventList = screen.getByLabelText("Events");
    expect(await within(eventList).findByText("React Meetup")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Availability"), "full");
    await waitFor(() => expect(within(eventList).queryByText("React Meetup")).toBeNull());
    expect(within(eventList).getByText("Design Workshop")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Availability"), "all");
    await user.click(await within(eventList).findByRole("button", { name: /React Meetup/i }));

    const detailPanel = screen.getByLabelText("Event details");
    await within(detailPanel).findByText("Alex Rivera");

    await user.type(within(detailPanel).getByLabelText("Attendee name"), "Riley Park");
    await user.type(within(detailPanel).getByLabelText("Attendee email"), "riley.park@example.com");
    await user.click(within(detailPanel).getByRole("button", { name: /add rsvp/i }));

    expect(await within(detailPanel).findByText("Riley Park")).toBeTruthy();
  });
});
