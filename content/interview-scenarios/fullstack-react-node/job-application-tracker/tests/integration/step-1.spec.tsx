import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded applications from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Job Application Tracker");

    render(<App />);
    const list = screen.getByLabelText("Applications");
    expect(await within(list).findByText("Stripe")).toBeTruthy();
    expect(within(list).getByText("Figma")).toBeTruthy();
  });
});
