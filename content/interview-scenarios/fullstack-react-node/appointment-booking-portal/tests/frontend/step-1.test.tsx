import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded appointments with service/staff details", async () => {
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain("Loading appointments");

    const list = screen.getByLabelText("Appointments");
    expect(await within(list).findByText("Morgan Diaz")).toBeTruthy();
    expect(within(list).getByText("Taylor Brooks")).toBeTruthy();
    // Alex Rivera and Initial Consultation both appear on more than one card,
    // so assert on their presence rather than a single unique match.
    expect(within(list).getAllByText("Alex Rivera").length).toBeGreaterThan(0);
    expect(within(list).getAllByText("Initial Consultation").length).toBeGreaterThan(0);
  });
});
