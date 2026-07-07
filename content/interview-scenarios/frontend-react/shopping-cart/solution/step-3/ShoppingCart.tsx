import { useState } from "react";
import type { CartLine } from "../../workspace/types";
import { PRODUCTS } from "../../workspace/data";

// Step 3 reference solution: increment, decrement, and remove all use the
// functional `setCart` form — the same pattern add-to-cart already used —
// so each update builds on the PREVIOUS state at the moment it actually
// applies, instead of a snapshot captured when the handler was created. Two
// clicks in the same update batch now both take effect.
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
    setCart((prev) => prev.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line)));
  }

  function decrement(id: string) {
    setCart((prev) =>
      prev
        .map((line) => (line.id === id ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((line) => line.id !== id));
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
