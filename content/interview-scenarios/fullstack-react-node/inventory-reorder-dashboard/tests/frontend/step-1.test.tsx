import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded products from the API", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading inventory");
    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
    expect(screen.getByText("Mechanical Keyboard")).toBeTruthy();
    expect(screen.getAllByText("Reorder needed").length).toBeGreaterThan(0);
  });
});
