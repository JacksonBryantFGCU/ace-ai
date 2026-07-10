import type { Category, InventorySummary, Product, ReorderStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface ProductsResponse {
  products: Product[];
}

interface SingleProductResponse {
  product: Product;
}

interface SummaryResponse {
  summary: InventorySummary;
}

export interface ProductQuery {
  category?: Category | "all";
  lowStock?: boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.lowStock) params.set("low_stock", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await parseJson<ProductsResponse>(await fetch(`${API_BASE_URL}/products${suffix}`));
  return data.products;
}

export async function fetchSummary(): Promise<InventorySummary> {
  const data = await parseJson<SummaryResponse>(await fetch(`${API_BASE_URL}/products/summary`));
  return data.summary;
}

export async function updateProduct(
  id: number,
  payload: { stock?: number; reorder_status?: ReorderStatus },
): Promise<Product> {
  const data = await parseJson<SingleProductResponse>(
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.product;
}
