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

describe("frontend step 3", () => {
  it("cancels, shows the scheduled indicator, and reactivates", async () => {
    const user = userEvent.setup();
    render(<App />);

    const cancellation = await screen.findByLabelText("Cancellation");
    await user.click(within(cancellation).getByRole("button", { name: /cancel subscription/i }));

    await waitFor(() => {
      const current = screen.getByLabelText("Current subscription");
      expect(current.textContent).toContain("Cancellation scheduled");
    });
    expect(within(cancellation).getByRole("button", { name: /reactivate subscription/i })).toBeTruthy();

    await user.click(within(cancellation).getByRole("button", { name: /reactivate subscription/i }));

    await waitFor(() => {
      const current = screen.getByLabelText("Current subscription");
      expect(current.textContent).not.toContain("Cancellation scheduled");
    });
    expect(within(cancellation).getByRole("button", { name: /cancel subscription/i })).toBeTruthy();
  });
});
