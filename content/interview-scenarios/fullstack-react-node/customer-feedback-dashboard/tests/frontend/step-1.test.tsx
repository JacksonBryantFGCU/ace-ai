import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded feedback from the API", async () => {
    render(<App />);

    expect(screen.getByRole("status").textContent).toContain("Loading feedback");
    expect(await screen.findByText("Alex Rivera")).toBeTruthy();
    expect(screen.getByText("Sam Carter")).toBeTruthy();
  });
});
