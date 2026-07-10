import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded events, and shows the default event's RSVP list", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading events");

    const eventList = screen.getByLabelText("Events");
    expect(await within(eventList).findByText("React Meetup")).toBeTruthy();
    expect(within(eventList).getByText("Design Workshop")).toBeTruthy();
    expect(within(eventList).getByText("Volunteer Cleanup")).toBeTruthy();
    expect(within(eventList).getByText("Book Club")).toBeTruthy();

    // Book Club (earliest starts_at) is selected by default.
    const detailPanel = screen.getByLabelText("Event details");
    expect(await within(detailPanel).findByText("Taylor Brooks")).toBeTruthy();
    expect(within(detailPanel).getByText("Riley Chen")).toBeTruthy();
  });
});
