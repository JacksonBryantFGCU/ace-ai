import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("surfaces validation errors and persists successful updates across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Update status for Alex Rivera"), "resolved");
    await user.click(screen.getAllByRole("button", { name: /save update/i })[0]!);
    expect(await screen.findByText("Response is required for resolved feedback")).toBeTruthy();

    await user.type(
      screen.getByLabelText("Response", { selector: "#response-1" }),
      "Thanks for the report. We fixed the slow weekly report path.",
    );
    await user.click(screen.getAllByRole("button", { name: /save update/i })[0]!);
    await waitFor(() => expect(screen.queryByText("Response is required for resolved feedback")).toBeNull());

    cleanup();
    render(<App />);
    await user.selectOptions(await screen.findByLabelText("Status"), "resolved");
    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    expect(screen.getAllByText(/fixed the slow weekly report path/i).length).toBeGreaterThan(0);
  });
});
