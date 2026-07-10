import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded appointments from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Appointment Booking Portal");

    render(<App />);
    const list = screen.getByLabelText("Appointments");
    expect(await within(list).findByText("Morgan Diaz")).toBeTruthy();
    expect(within(list).getAllByText("Initial Consultation").length).toBeGreaterThan(0);
  });
});
