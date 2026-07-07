import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.ShoppingCart;

type Mode = "default" | "empty" | "large-dataset";

interface PreviewLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// "default"/"mobile" render the ACTUAL live candidate code — a full product
// catalog with an empty cart (add-to-cart isn't wired up yet, so that's the
// starter's honest starting state). "empty" illustrates a catalog with
// nothing to sell; "large-dataset" illustrates a full cart with several
// line items and quantities — a state the starter can't reach until
// add-to-cart is implemented. Both are self-contained, deterministic,
// read-only mock UI.
const LARGE_CART: PreviewLine[] = [
  { id: "p1", name: "Wireless Mouse", price: 24.99, quantity: 2 },
  { id: "p2", name: "Mechanical Keyboard", price: 89.5, quantity: 1 },
  { id: "p3", name: "USB-C Hub", price: 34.0, quantity: 3 },
  { id: "p4", name: "Laptop Stand", price: 45.25, quantity: 1 },
  { id: "p5", name: "Webcam 1080p", price: 59.99, quantity: 1 },
  { id: "p6", name: "Noise-Cancelling Headphones", price: 129.99, quantity: 2 },
];

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : mode === "empty" ? (
        <IllustrativeCart products={[]} cart={[]} />
      ) : (
        <IllustrativeCart
          products={LARGE_CART.map(({ id, name, price }) => ({ id, name, price }))}
          cart={LARGE_CART}
        />
      )}
    </Frame>
  );
}

function IllustrativeCart({
  products,
  cart,
}: {
  products: { id: string; name: string; price: number }[];
  cart: PreviewLine[];
}) {
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return (
    <div style={{ display: "flex", gap: 24 }}>
      <section aria-label="Products">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Products</h2>
        {products.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No products available right now.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {products.map((product) => (
              <li key={product.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                <span style={{ flex: 1 }}>{product.name}</span>
                <span style={{ color: "#6b7280" }}>${product.price.toFixed(2)}</span>
                <button>Add to Cart</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Cart">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Cart</h2>
        {cart.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Your cart is empty.</p>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {cart.map((line) => (
                <li key={line.id} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                  <span style={{ flex: 1 }}>{line.name}</span>
                  <span style={{ color: "#6b7280" }}>× {line.quantity}</span>
                  <span>${(line.price * line.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontWeight: 600, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
              Subtotal: ${subtotal.toFixed(2)}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
