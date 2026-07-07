import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { ShoppingCart } from "../workspace/ShoppingCart";

// Step 2's graded contract: each cart line shows a subtotal, quantity can be
// increased/decreased (reaching 0 removes the line), an explicit Remove
// button also works, the total is always price × quantity summed across
// lines, and the empty state re-appears once the cart is emptied. Rapid,
// same-tick quantity changes are exercised separately in Step 3.
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

test("each cart line shows a subtotal for price times quantity", () => {
  render(<ShoppingCart />);

  fireEvent.click(addButtonFor("Wireless Mouse")); // $24.99 x1
  fireEvent.click(addButtonFor("Wireless Mouse")); // x2 = $49.98

  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("49.98");
});

test("increasing and decreasing quantity updates the line and its subtotal", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Wireless Mouse"));

  const row = cartRowFor("Wireless Mouse");
  fireEvent.click(within(row).getByRole("button", { name: /increase quantity of wireless mouse/i }));
  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("2");
  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("49.98");

  fireEvent.click(within(cartRowFor("Wireless Mouse")).getByRole("button", { name: /decrease quantity of wireless mouse/i }));
  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("1");
  expect(cartRowFor("Wireless Mouse")).toHaveTextContent("24.99");
});

test("decreasing quantity to 0 removes the line", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Wireless Mouse"));

  fireEvent.click(within(cartRowFor("Wireless Mouse")).getByRole("button", { name: /decrease quantity of wireless mouse/i }));

  expect(within(cart()).queryByText("Wireless Mouse")).not.toBeInTheDocument();
  expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
});

test("the explicit Remove button removes the line regardless of quantity", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Mechanical Keyboard"));
  fireEvent.click(addButtonFor("Mechanical Keyboard"));

  fireEvent.click(within(cartRowFor("Mechanical Keyboard")).getByRole("button", { name: /remove mechanical keyboard/i }));

  expect(within(cart()).queryByText("Mechanical Keyboard")).not.toBeInTheDocument();
});

test("the total is the sum of price times quantity across all lines", () => {
  render(<ShoppingCart />);
  fireEvent.click(addButtonFor("Wireless Mouse")); // 24.99
  fireEvent.click(addButtonFor("USB-C Hub")); // 34.00
  fireEvent.click(addButtonFor("USB-C Hub")); // 34.00 x2 = 68.00

  // 24.99 + 68.00 = 92.99
  expect(screen.getByText(/92\.99/)).toBeInTheDocument();
});

test("the empty cart message shows before adding anything and after removing everything", () => {
  render(<ShoppingCart />);
  expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();

  fireEvent.click(addButtonFor("Webcam 1080p"));
  expect(screen.queryByText("Your cart is empty.")).not.toBeInTheDocument();

  fireEvent.click(within(cartRowFor("Webcam 1080p")).getByRole("button", { name: /remove webcam 1080p/i }));
  expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
});
