import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";

/** Real backend is shared across test files in this layer, so reset it before
 *  each test to stay deterministic regardless of execution order. */
beforeEach(async () => {
  await fetch(`${process.env.BACKEND_URL}/__test/reset`, { method: "POST" });
});
afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("renders update controls and applies a valid plan change", async () => {
    const user = userEvent.setup();
    render(<App />);

    const form = await screen.findByLabelText("Update subscription");
    await user.click(within(form).getByLabelText("Select Starter plan"));
    await user.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const current = screen.getByLabelText("Current subscription");
      expect(within(current).getByText("Starter")).toBeTruthy();
    });
  });

  it("shows the backend validation error when seats fall below the new plan's minimum", async () => {
    const user = userEvent.setup();
    render(<App />);

    const form = await screen.findByLabelText("Update subscription");
    // Business requires at least 20 seats; the draft still has the seeded 5.
    await user.click(within(form).getByLabelText("Select Business plan"));
    await user.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(within(form).getByRole("alert").textContent).toContain("Seat count is below plan minimum");
    });
  });
});
