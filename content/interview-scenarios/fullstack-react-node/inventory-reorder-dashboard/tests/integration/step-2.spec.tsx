import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters products through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Category"), "books");
    await waitFor(() => expect(screen.queryByText("Wireless Mouse")).toBeNull());
    expect(await screen.findByText("Sci-Fi Novel")).toBeTruthy();
  });
});
