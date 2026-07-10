import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("completes a scheduled appointment", async () => {
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    const heading = await within(list).findByText("Morgan Diaz");
    const card = heading.closest("article")!;

    await userEvent.click(within(card).getByRole("button", { name: /complete appointment for morgan diaz/i }));

    expect(await within(card).findByText("Completed", { selector: ".status" })).toBeTruthy();
  });

  it("shows a backend error when finalizing an already-finalized appointment", async () => {
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    // Riley Chen (id 3) is seeded as already completed.
    const heading = await within(list).findByText("Riley Chen");
    const card = heading.closest("article")!;

    await userEvent.click(within(card).getByRole("button", { name: /cancel appointment for riley chen/i }));

    expect(await within(card).findByText(/already finalized/i)).toBeTruthy();
    expect(within(card).getByText("Completed", { selector: ".status" })).toBeTruthy();
  });
});
