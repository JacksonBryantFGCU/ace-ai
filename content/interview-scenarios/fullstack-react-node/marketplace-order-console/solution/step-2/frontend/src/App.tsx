import { FormEvent, useEffect, useState } from "react";
import { createOrder, fetchOrderDetail, fetchOrderOptions, fetchOrderSummary, fetchOrders } from "./api";
import type { Customer, Order, OrderDetail, OrderStatus, OrderSummary, Product, Seller } from "./types";
import "./styles.css";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "fulfilled", "cancelled"];

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

interface DraftItem {
  productId: number | "";
  quantity: number;
}

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [customerFilter, setCustomerFilter] = useState<number | "all">("all");
  const [sellerFilter, setSellerFilter] = useState<number | "all">("all");

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [createCustomerId, setCreateCustomerId] = useState<number | "">("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: "", quantity: 1 }]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function loadOptions() {
    return fetchOrderOptions().then((data) => {
      setCustomers(data.customers);
      setSellers(data.sellers);
      setProducts(data.products);
    });
  }

  function loadSummary() {
    return fetchOrderSummary()
      .then((next) => setSummary(next))
      .catch(() => setSummary(null));
  }

  function loadOrders() {
    setLoading(true);
    setError(null);
    return fetchOrders({ status: statusFilter, customerId: customerFilter, sellerId: sellerFilter })
      .then((data) => {
        setOrders(data);
        if (data.length > 0 && !data.some((order) => order.id === selectedOrderId)) {
          setSelectedOrderId(data[0]!.id);
        } else if (data.length === 0) {
          setSelectedOrderId(null);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOptions().catch(() => undefined);
    loadSummary();
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, customerFilter, sellerFilter]);

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

  function updateDraftItem(index: number, patch: Partial<DraftItem>) {
    setDraftItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function addDraftItem() {
    setDraftItems((current) => [...current, { productId: "", quantity: 1 }]);
  }

  function removeDraftItem(index: number) {
    setDraftItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createOrder({
        customer_id: Number(createCustomerId),
        items: draftItems
          .filter((item) => item.productId !== "")
          .map((item) => ({ product_id: Number(item.productId), quantity: item.quantity })),
      });
      setCreateCustomerId("");
      setDraftItems([{ productId: "", quantity: 1 }]);
      await Promise.all([loadOrders(), loadSummary(), loadOptions()]);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Operations</p>
        <h1>Marketplace Order Console</h1>
      </header>

      {summary ? (
        <section className="summary-panel" aria-label="Order summary">
          <span>{`Total ${summary.total_orders}`}</span>
          <span>{`Pending ${summary.pending}`}</span>
          <span>{`Fulfilled ${summary.fulfilled}`}</span>
          <span>{`Cancelled ${summary.cancelled}`}</span>
          <span>{`Gross revenue ${formatCents(summary.gross_revenue_cents)}`}</span>
          <span>{`Pending revenue ${formatCents(summary.pending_revenue_cents)}`}</span>
        </section>
      ) : null}

      <section className="toolbar" aria-label="Order filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value === "all" ? "all" : (event.target.value as OrderStatus))}
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <label htmlFor="customer-filter">Filter by customer</label>
        <select
          id="customer-filter"
          value={customerFilter}
          onChange={(event) => setCustomerFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <label htmlFor="seller-filter">Seller</label>
        <select
          id="seller-filter"
          value={sellerFilter}
          onChange={(event) => setSellerFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p role="status">Loading orders...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!loading && !error && orders.length === 0 ? <p>No orders match these filters.</p> : null}

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

      <form onSubmit={handleCreateSubmit} className="create-form" aria-label="Create order">
        <h2>New Order</h2>

        <div className="field">
          <label htmlFor="order-customer">Customer</label>
          <select
            id="order-customer"
            value={createCustomerId}
            onChange={(event) => setCreateCustomerId(event.target.value === "" ? "" : Number(event.target.value))}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {draftItems.map((item, index) => (
          <div className="item-row" key={index}>
            <div className="field">
              <label htmlFor={`item-product-${index}`}>Product</label>
              <select
                id={`item-product-${index}`}
                value={item.productId}
                onChange={(event) =>
                  updateDraftItem(index, { productId: event.target.value === "" ? "" : Number(event.target.value) })
                }
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {`${product.name} (${formatCents(product.price_cents)})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`item-quantity-${index}`}>Quantity</label>
              <input
                id={`item-quantity-${index}`}
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => updateDraftItem(index, { quantity: Number(event.target.value) })}
              />
            </div>

            <button type="button" className="secondary" onClick={() => removeDraftItem(index)}>
              Remove
            </button>
          </div>
        ))}

        <button type="button" className="secondary" onClick={addDraftItem}>
          Add item
        </button>

        {createError ? (
          <p role="alert" className="error">
            {createError}
          </p>
        ) : null}

        <button type="submit" disabled={creating}>
          {creating ? "Placing order..." : "Place order"}
        </button>
      </form>
    </main>
  );
}

export default App;
