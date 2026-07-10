import { useEffect, useState } from "react";
import { fetchProducts, fetchSummary } from "./api";
import type { Category, InventorySummary, Product } from "./types";
import "./styles.css";

const CATEGORY_OPTIONS: Array<Category | "all"> = ["all", "apparel", "electronics", "home", "books"];

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProducts({ category, lowStock: lowStockOnly })
      .then((items) => {
        if (cancelled) return;
        setProducts(items);
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
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
