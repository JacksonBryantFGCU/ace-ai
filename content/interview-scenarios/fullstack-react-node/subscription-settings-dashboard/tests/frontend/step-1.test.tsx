import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading, then the customer, current plan, and available plans", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading subscription");

    const customer = await screen.findByLabelText("Customer");
    expect(within(customer).getByText("Alex Rivera")).toBeTruthy();
    expect(within(customer).getByText("alex@example.com")).toBeTruthy();

    const current = screen.getByLabelText("Current subscription");
    expect(within(current).getByText("Pro")).toBeTruthy();

    const plans = screen.getByLabelText("Available plans");
    expect(within(plans).getByText("Starter")).toBeTruthy();
    expect(within(plans).getByText("Pro")).toBeTruthy();
    expect(within(plans).getByText("Business")).toBeTruthy();
  });
});
