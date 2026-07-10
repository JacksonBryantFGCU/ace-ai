import { FormEvent, useEffect, useState } from "react";
import { fetchProducts, fetchSummary, updateProduct } from "./api";
import type { Category, InventorySummary, Product, ReorderStatus } from "./types";
import "./styles.css";

const CATEGORY_OPTIONS: Array<Category | "all"> = ["all", "apparel", "electronics", "home", "books"];
const REORDER_STATUS_OPTIONS: ReorderStatus[] = ["none", "needed", "ordered"];

function statusLabel(status: Product["reorder_status"]) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function categoryLabel(category: Category | "all") {
  return category === "all" ? "All" : category[0]!.toUpperCase() + category.slice(1);
}

export function App() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [draftStock, setDraftStock] = useState<Record<number, string>>({});
  const [draftStatus, setDraftStatus] = useState<Record<number, ReorderStatus>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  function loadSummary() {
    return fetchSummary()
      .then((next) => setSummary(next))
      .catch(() => setSummary(null));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProducts({ category, lowStock: lowStockOnly })
      .then((items) => {
        if (cancelled) return;
        setProducts(items);
        setDraftStock(Object.fromEntries(items.map((item) => [item.id, String(item.stock)])));
        setDraftStatus(Object.fromEntries(items.map((item) => [item.id, item.reorder_status])));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, lowStockOnly]);

  useEffect(() => {
    let cancelled = false;
    fetchSummary()
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    setSavingId(product.id);
    setItemErrors((current) => ({ ...current, [product.id]: "" }));

    const rawStock = draftStock[product.id] ?? String(product.stock);
    const stock = Number(rawStock);
    if (!Number.isInteger(stock) || stock < 0) {
      setItemErrors((current) => ({ ...current, [product.id]: "Stock must be a non-negative whole number." }));
      setSavingId(null);
      return;
    }

    try {
      const updated = await updateProduct(product.id, {
        stock,
        reorder_status: draftStatus[product.id] ?? product.reorder_status,
      });
      setProducts((items) => items.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      setDraftStock((current) => ({ ...current, [updated.id]: String(updated.stock) }));
      setDraftStatus((current) => ({ ...current, [updated.id]: updated.reorder_status }));
      await loadSummary();
    } catch (err) {
      setItemErrors((current) => ({ ...current, [product.id]: (err as Error).message }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Inventory Reorder Dashboard</h1>
        </div>
      </header>

      {summary ? (
        <section className="summary-panel" aria-label="Inventory summary">
          <span>{`Total ${summary.total_products}`}</span>
          <span>{`Low stock ${summary.low_stock}`}</span>
          <span>{`Ordered ${summary.ordered}`}</span>
        </section>
      ) : null}

      <section className="toolbar" aria-label="Product filters">
        <label htmlFor="category-filter">Category</label>
        <select
          id="category-filter"
          value={category}
          onChange={(event) => setCategory(event.target.value as Category | "all")}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {categoryLabel(option)}
            </option>
          ))}
        </select>

        <span className="checkbox-field">
          <input
            id="low-stock-filter"
            type="checkbox"
            checked={lowStockOnly}
            onChange={(event) => setLowStockOnly(event.target.checked)}
          />
          <label htmlFor="low-stock-filter">Low stock only</label>
        </span>
      </section>

      {loading ? <p role="status">Loading inventory...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && products.length === 0 ? <p>No products match these filters.</p> : null}

      <section className="product-list" aria-label="Products">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="card-header">
              <div>
                <h2>{product.name}</h2>
                <p className="sku">{product.sku}</p>
              </div>
              <span className={`status status-${product.reorder_status}`}>
                {statusLabel(product.reorder_status)}
              </span>
            </div>

            <dl className="product-meta">
              <div>
                <dt>Category</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>{product.stock}</dd>
              </div>
              <div>
                <dt>Reorder level</dt>
                <dd>{product.reorder_level}</dd>
              </div>
            </dl>

            {product.needs_reorder ? (
              <p className="low-stock" role="note">Reorder needed</p>
            ) : (
              <p className="muted">Stock is healthy.</p>
            )}

            <form onSubmit={(event) => handleSubmit(event, product)} className="update-form">
              <div className="field-row">
                <div className="field">
                  <label htmlFor={`stock-${product.id}`}>Update stock for {product.name}</label>
                  <input
                    id={`stock-${product.id}`}
                    type="number"
                    value={draftStock[product.id] ?? String(product.stock)}
                    onChange={(event) =>
                      setDraftStock((current) => ({ ...current, [product.id]: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor={`reorder-status-${product.id}`}>Update reorder status for {product.name}</label>
                  <select
                    id={`reorder-status-${product.id}`}
                    value={draftStatus[product.id] ?? product.reorder_status}
                    onChange={(event) =>
                      setDraftStatus((current) => ({
                        ...current,
                        [product.id]: event.target.value as ReorderStatus,
                      }))
                    }
                  >
                    {REORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {itemErrors[product.id] ? (
                <p role="alert" className="error">{itemErrors[product.id]}</p>
              ) : null}

              <button type="submit" disabled={savingId === product.id}>
                {savingId === product.id ? "Saving..." : "Save update"}
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
