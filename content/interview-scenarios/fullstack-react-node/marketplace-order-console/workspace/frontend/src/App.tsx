import { useEffect, useState } from "react";
import { fetchOrderOptions, fetchOrders } from "./api";
import type { Order } from "./types";
import "./styles.css";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

export function App() {
  // TODO (Step 1): track orders, loading, and error state, and fetch orders
  // and order options on mount (see fetchOrders and fetchOrderOptions in
  // ./api). Also track the selected order id and fetch its detail
  // (fetchOrderDetail) when it changes.

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Operations</p>
        <h1>Marketplace Order Console</h1>
      </header>

      {/* TODO (Step 2): render a summary panel (aria-label="Order summary")
          using fetchOrderSummary. */}

      {/* TODO (Step 2): render status/customer/seller filter controls
          (aria-label="Order filters") that refetch orders when changed. */}

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      <section className="layout">
        <div className="order-list" aria-label="Orders">
          {/* TODO (Step 1): render one order card per order (a <button> with
              aria-label naming the order), showing customer, status,
              subtotal, item count, and seller count. Selecting a card should
              load that order's detail. */}
        </div>

        <div className="order-detail" aria-label="Order details">
          {/* TODO (Step 1): render the selected order's items (product,
              seller, quantity, unit price, line total). */}

          {/* TODO (Step 3): add fulfill and cancel actions here, display
              backend validation errors, and update the order/detail/summary
              from the saved response. */}
        </div>
      </section>

      {/* TODO (Step 2): add a create-order form (aria-label="Create order")
          with a customer select and product/quantity line items, showing
          backend validation errors and updating the orders list, summary,
          and options after a successful create. */}
    </main>
  );
}

export default App;
