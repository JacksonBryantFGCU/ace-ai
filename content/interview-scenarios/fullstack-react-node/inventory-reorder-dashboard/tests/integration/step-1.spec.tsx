import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded products from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Inventory Reorder Dashboard");

    render(<App />);
    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
    expect(screen.getByText("Illustrated Cookbook")).toBeTruthy();
  });
});
