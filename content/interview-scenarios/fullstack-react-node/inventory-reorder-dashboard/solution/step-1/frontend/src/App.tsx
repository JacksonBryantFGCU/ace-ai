import { useEffect, useState } from "react";
import { fetchProducts } from "./api";
import type { Product } from "./types";
import "./styles.css";

function statusLabel(status: Product["reorder_status"]) {
  return status[0]!.toUpperCase() + status.slice(1);
}

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProducts()
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
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Inventory Reorder Dashboard</h1>
        </div>
      </header>

      {loading ? <p role="status">Loading inventory...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && products.length === 0 ? <p>No products found.</p> : null}

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
