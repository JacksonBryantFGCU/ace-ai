import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded events from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Event RSVP Manager");

    render(<App />);
    const eventList = screen.getByLabelText("Events");
    expect(await within(eventList).findByText("React Meetup")).toBeTruthy();
    expect(within(eventList).getByText("Book Club")).toBeTruthy();
  });
});
