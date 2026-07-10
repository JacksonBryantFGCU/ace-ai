import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters products by category through the backend API", async () => {
    render(<App />);

    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Category"), "apparel");
    await waitFor(() => expect(screen.queryByText("Wireless Mouse")).toBeNull());
    expect(await screen.findByText("Cotton T-Shirt")).toBeTruthy();
  });

  it("filters to low-stock products and shows the summary panel", async () => {
    render(<App />);

    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
    expect((await screen.findByLabelText("Inventory summary")).textContent).toContain("Total 8");

    await userEvent.click(screen.getByLabelText("Low stock only"));
    await waitFor(() => expect(screen.queryByText("Mechanical Keyboard")).toBeNull());
    expect(await screen.findByText("Wireless Mouse")).toBeTruthy();
  });
});
