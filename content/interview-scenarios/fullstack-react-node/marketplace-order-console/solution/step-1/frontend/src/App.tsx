import { useEffect, useState } from "react";
import { fetchOrderDetail, fetchOrderOptions, fetchOrders } from "./api";
import type { Order, OrderDetail } from "./types";
import "./styles.css";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOrders()
      .then((data) => {
        if (cancelled) return;
        setOrders(data);
        if (data.length > 0) setSelectedOrderId(data[0]!.id);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchOrderOptions().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedOrderId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    fetchOrderDetail(selectedOrderId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setDetailError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedOrderId]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Operations</p>
        <h1>Marketplace Order Console</h1>
      </header>

      {loading ? <p role="status">Loading orders...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!loading && !error && orders.length === 0 ? <p>No orders yet.</p> : null}

      <section className="layout">
        <div className="order-list" aria-label="Orders">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className={order.id === selectedOrderId ? "order-card selected" : "order-card"}
              aria-label={`Order ${order.id}`}
              onClick={() => setSelectedOrderId(order.id)}
            >
              <h3>{`Order #${order.id} · ${order.customer.name}`}</h3>
              <p className="order-meta">{`${order.item_count} item(s) · ${order.seller_count} seller(s) · ${formatCents(order.subtotal_cents)}`}</p>
              <div className="badge-row">
                <span className={`badge status-${order.status}`}>{statusLabel(order.status)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="order-detail" aria-label="Order details">
          {detailError ? (
            <p role="alert" className="error">
              {detailError}
            </p>
          ) : null}
          {!detail ? <p className="muted">Select an order to view its details.</p> : null}
          {detail ? (
            <>
              <h2>{`Order #${detail.order.id}`}</h2>
              <p className="muted">{`${detail.order.customer.name} (${detail.order.customer.email})`}</p>
              <div className="order-items">
                {detail.items.map((item) => (
                  <div className="order-item-row" key={item.id}>
                    <span>{`${item.product.name} (${item.product.sku}) x${item.quantity} — ${item.seller.name}`}</span>
                    <span>{formatCents(item.line_total_cents)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
