import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { ShoppingCart } from "../workspace/ShoppingCart";

// Step 1's graded contract: adding a product puts it in the cart, and adding
// the SAME product again increments its quantity instead of creating a
// second row. Asserts observable cart contents only, so any state shape
// (array of lines, map keyed by id, etc.) that produces this passes.
afterEach(cleanup);

function cart() {
  return screen.getByRole("region", { name: "Cart" });
}

function addButtonFor(productName: string) {
  const products = screen.getByRole("region", { name: "Products" });
  const row = within(products).getByText(productName).closest("li")!;
  return within(row).getByRole("button", { name: /add to cart/i });
}

test("adding a product puts it in the cart", () => {
  render(<ShoppingCart />);

  fireEvent.click(addButtonFor("Wireless Mouse"));

  expect(within(cart()).getByText("Wireless Mouse")).toBeInTheDocument();
});

test("adding the same product twice increments its quantity instead of duplicating the row", () => {
  render(<ShoppingCart />);

  fireEvent.click(addButtonFor("Wireless Mouse"));
  fireEvent.click(addButtonFor("Wireless Mouse"));

  const cartRows = within(cart()).getAllByRole("listitem");
  const mouseCartRows = cartRows.filter((row) => row.textContent?.includes("Wireless Mouse"));
  expect(mouseCartRows).toHaveLength(1);
  expect(mouseCartRows[0]).toHaveTextContent("2");
});

test("adding two different products creates two separate cart rows", () => {
  render(<ShoppingCart />);

  fireEvent.click(addButtonFor("Wireless Mouse"));
  fireEvent.click(addButtonFor("Mechanical Keyboard"));

  expect(within(cart()).getByText("Wireless Mouse")).toBeInTheDocument();
  expect(within(cart()).getByText("Mechanical Keyboard")).toBeInTheDocument();
  expect(within(cart()).getAllByRole("listitem")).toHaveLength(2);
});
