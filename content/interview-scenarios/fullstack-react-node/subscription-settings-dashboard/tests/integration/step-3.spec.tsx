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

describe("integration step 3", () => {
  it("cancels the subscription and persists the scheduled cancellation across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);

    const cancellation = await screen.findByLabelText("Cancellation");
    await user.click(within(cancellation).getByRole("button", { name: /cancel subscription/i }));

    await waitFor(() => {
      const current = screen.getByLabelText("Current subscription");
      expect(current.textContent).toContain("Cancellation scheduled");
    });

    cleanup();
    render(<App />);
    const reloadedCurrent = await screen.findByLabelText("Current subscription");
    expect(reloadedCurrent.textContent).toContain("Cancellation scheduled");
    const reloadedCancellation = screen.getByLabelText("Cancellation");
    expect(within(reloadedCancellation).getByRole("button", { name: /reactivate subscription/i })).toBeTruthy();

    // Step 1 and step 2 controls still work after cancellation is implemented.
    expect(screen.getByLabelText("Available plans")).toBeTruthy();
    expect(screen.getByLabelText("Customer")).toBeTruthy();
  });
});
