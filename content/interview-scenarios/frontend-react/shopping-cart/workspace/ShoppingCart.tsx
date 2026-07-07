import { useState } from "react";
import type { CartLine } from "./types";
import { PRODUCTS } from "./data";

// A shopping cart. The product list renders; nothing is wired up yet.
//
// TODO (Step 1): make "Add to Cart" add the product to the cart. Clicking
// Add on a product that's already in the cart should increase its quantity
// instead of adding a second row for the same product.
export function ShoppingCart() {
  const [cart, setCart] = useState<CartLine[]>([]);

  function handleAddToCart(productId: string) {
    // TODO: add a new line for `productId`, or increment its quantity if
    // it's already in the cart.
    void productId;
  }

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <section aria-label="Products">
        <h2>Products</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {PRODUCTS.map((product) => (
            <li key={product.id}>
              <span>{product.name}</span>
              <span> — ${product.price.toFixed(2)}</span>
              <button onClick={() => handleAddToCart(product.id)}>Add to Cart</button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Cart">
        <h2>Cart</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.map((line) => (
              <li key={line.id}>
                <span>{line.name}</span>
                <span> × {line.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
