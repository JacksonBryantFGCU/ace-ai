import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded feedback from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Customer Feedback Dashboard");

    render(<App />);
    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    expect(screen.getByText("Priya Shah")).toBeTruthy();
  });
});
