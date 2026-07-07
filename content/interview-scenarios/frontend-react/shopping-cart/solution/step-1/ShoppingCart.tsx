import { useState } from "react";
import type { CartLine } from "../../workspace/types";
import { PRODUCTS } from "../../workspace/data";

// Step 1 reference solution: adding a product appends a new cart line, or
// increments the existing line's quantity if that product is already in the
// cart — using the functional `setCart` form so it stays correct even if two
// adds land in the same batch.
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
