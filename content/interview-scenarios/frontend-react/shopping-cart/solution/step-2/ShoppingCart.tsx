import { useState } from "react";
import type { CartLine } from "../../workspace/types";
import { PRODUCTS } from "../../workspace/data";

// Step 2 reference solution: per-line subtotals, quantity +/- controls,
// explicit remove, and a cart total derived from `cart` at render time (not
// stored separately).
//
// The quantity controls read `cart` from the closure and compute the next
// array from it directly, rather than from the updater-callback's previous
// value. That's correct for clicks spaced apart by a render, but if two
// clicks land in the same update (a fast double-click), both compute from
// the SAME starting `cart` and the second overwrites the first instead of
// building on it — only one of the two clicks ends up counting. Step 3 fixes
// this the same way Step 1's add-to-cart was already written: with the
// functional `setCart` form.
export function ShoppingCart() {
  const [cart, setCart] = useState<CartLine[]>([]);

  function handleAddToCart(productId: string) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const existing = prev.find((line) => line.id === productId);
      if (existing) {
        return prev.map((line) => (line.id === productId ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function increment(id: string) {
    setCart(cart.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line)));
  }

  function decrement(id: string) {
    setCart(
      cart
        .map((line) => (line.id === id ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(id: string) {
    setCart(cart.filter((line) => line.id !== id));
  }

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

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
          <>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {cart.map((line) => (
                <li key={line.id}>
                  <span>{line.name}</span>
                  <button onClick={() => decrement(line.id)} aria-label={`Decrease quantity of ${line.name}`}>
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => increment(line.id)} aria-label={`Increase quantity of ${line.name}`}>
                    +
                  </button>
                  <span>${(line.price * line.quantity).toFixed(2)}</span>
                  <button onClick={() => removeLine(line.id)} aria-label={`Remove ${line.name}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <p>Total: ${total.toFixed(2)}</p>
          </>
        )}
      </section>
    </div>
  );
}
