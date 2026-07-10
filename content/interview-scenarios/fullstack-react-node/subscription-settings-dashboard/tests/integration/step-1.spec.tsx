import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("integration step 1", () => {
  it("serves the Vite app and renders the current subscription from the real backend", async () => {
    const frontendResponse = await fetch(process.env.FRONTEND_URL!);
    expect(frontendResponse.status).toBe(200);
    expect(await frontendResponse.text()).toContain("Subscription Settings Dashboard");

    render(<App />);
    const customer = await screen.findByLabelText("Customer");
    expect(within(customer).getByText("Alex Rivera")).toBeTruthy();

    const current = screen.getByLabelText("Current subscription");
    expect(within(current).getByText("Pro")).toBeTruthy();

    const plans = screen.getByLabelText("Available plans");
    expect(within(plans).getByText("Business")).toBeTruthy();
  });
});
