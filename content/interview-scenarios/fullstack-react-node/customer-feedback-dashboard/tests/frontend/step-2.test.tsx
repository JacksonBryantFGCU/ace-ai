import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters feedback through the backend API", async () => {
    render(<App />);

    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "reviewing");
    await waitFor(() => expect(screen.queryByText("Alex Rivera")).toBeNull());
    expect(await screen.findByText("Sam Carter")).toBeTruthy();
  });
});
