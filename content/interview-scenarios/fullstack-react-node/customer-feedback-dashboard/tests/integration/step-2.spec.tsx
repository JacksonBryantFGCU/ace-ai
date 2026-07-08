import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters feedback through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Status"), "new");
    await waitFor(() => expect(screen.queryByText("Priya Shah")).toBeNull());
    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
  });
});
