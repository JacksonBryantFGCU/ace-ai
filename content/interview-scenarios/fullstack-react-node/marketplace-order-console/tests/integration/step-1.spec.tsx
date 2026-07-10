import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders seeded orders from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Marketplace Order Console");

    render(<App />);
    const orderList = await screen.findByLabelText("Orders");
    expect(await within(orderList).findByLabelText("Order 4")).toBeTruthy();
    expect(within(orderList).getByLabelText("Order 1")).toBeTruthy();

    const detail = screen.getByLabelText("Order details");
    expect(await within(detail).findByText(/Order #/)).toBeTruthy();
  });
});
