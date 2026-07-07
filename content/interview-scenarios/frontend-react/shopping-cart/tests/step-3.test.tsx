import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, act, cleanup } from "@testing-library/react";
import { ShoppingCart } from "../workspace/ShoppingCart";

// Step 3's graded contract: quantity updates must be correct even when two
// clicks land in the same update batch (e.g. a fast double-click) — not just
// when they're spaced out with a render in between. Wrapping both clicks in
// one `act(...)` call defers React's flush until after both handlers have
// run, which is exactly what a fast double-click does in the browser.
afterEach(cleanup);

function cart() {
  return screen.getByRole("region", { name: "Cart" });
}

function addButtonFor(productName: string) {
  const products = screen.getByRole("region", { name: "Products" });
  const row = within(products).getByText(productName).closest("li")!;
  return within(row).getByRole("button", { name: /add to cart/i });
}

function cartRowFor(productName: string) {
  return within(cart()).getByText(productName).closest("li")!;
}

test("two rapid increment clicks in the same update both count", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Wireless Mouse"));

  const increment = within(cartRowFor("Wireless Mouse")).getByRole("button", {
    name: /increase quantity of wireless mouse/i,
  });

  act(() => {
    fireEvent.click(increment);
    fireEvent.click(increment);
  });

  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("3");
});

test("two rapid decrement clicks in the same update both count", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Mechanical Keyboard"));
  fireEvent.click(addButtonFor("Mechanical Keyboard"));
  fireEvent.click(addButtonFor("Mechanical Keyboard"));
  fireEvent.click(addButtonFor("Mechanical Keyboard"));

  const decrement = within(cartRowFor("Mechanical Keyboard")).getByRole("button", {
    name: /decrease quantity of mechanical keyboard/i,
  });

  act(() => {
    fireEvent.click(decrement);
    fireEvent.click(decrement);
  });

  expect(cartRowFor("Mechanical Keyboard")).toHaveTextContent("2");
});
