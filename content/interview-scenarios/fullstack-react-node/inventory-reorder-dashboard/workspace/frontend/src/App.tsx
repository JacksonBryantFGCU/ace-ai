import { useEffect, useState } from "react";
import { fetchProducts } from "./api";
import type { Product } from "./types";
import "./styles.css";

function statusLabel(status: Product["reorder_status"]) {
  return status[0]!.toUpperCase() + status.slice(1);
}

export function App() {
  // TODO (Step 1): track products, loading, and error state, and fetch products on
  // mount (see fetchProducts in ./api). Guard against setting state after unmount.

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Inventory Reorder Dashboard</h1>
        </div>
      </header>

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"), and
          empty states here. */}

      {/* TODO (Step 1): render the product list here (a <section aria-label="Products">
          containing one card per product). Each card should show the product name,
          SKU, category, stock, reorder level, reorder status (use statusLabel above),
          and a low-stock indicator when needs_reorder is true. */}

      {/* TODO (Step 2): add category and low-stock filter controls, and a summary
          panel, above the product list. */}

      {/* TODO (Step 3): add a per-product update form (stock + reorder status) to
          each card, and display backend validation errors from failed updates. */}
    </main>
  );
}

export default App;
