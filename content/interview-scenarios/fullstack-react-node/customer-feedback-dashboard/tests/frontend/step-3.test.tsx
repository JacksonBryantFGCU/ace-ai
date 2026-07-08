import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("shows backend validation errors and applies successful updates", async () => {
    render(<App />);

    await screen.findByText("Alex Rivera");
    await userEvent.selectOptions(screen.getByLabelText("Update status for Alex Rivera"), "resolved");
    await userEvent.click(screen.getAllByRole("button", { name: /save update/i })[0]!);
    expect(await screen.findByText("Response is required for resolved feedback")).toBeTruthy();

    await userEvent.type(
      screen.getByLabelText("Response", { selector: "#response-1" }),
      "Thanks for the report. We improved weekly report loading.",
    );
    await userEvent.click(screen.getAllByRole("button", { name: /save update/i })[0]!);

    await waitFor(() => expect(screen.queryByText("Response is required for resolved feedback")).toBeNull());
    await waitFor(() =>
      expect(screen.getAllByText(/improved weekly report loading/i).length).toBeGreaterThan(0),
    );
  });
});
