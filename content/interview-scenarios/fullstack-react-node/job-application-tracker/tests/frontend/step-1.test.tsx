import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded applications from the API", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading applications");

    const list = screen.getByLabelText("Applications");
    expect(await within(list).findByText("Stripe")).toBeTruthy();
    expect(within(list).getByText("Amazon")).toBeTruthy();
    expect(within(list).getByText("Meta")).toBeTruthy();
    expect(within(list).getByText("Google")).toBeTruthy();
    expect(within(list).getByText("Notion")).toBeTruthy();
    expect(within(list).getByText("Airbnb")).toBeTruthy();
    expect(within(list).getByText("Linear")).toBeTruthy();
    expect(within(list).getByText("Figma")).toBeTruthy();
  });
});
