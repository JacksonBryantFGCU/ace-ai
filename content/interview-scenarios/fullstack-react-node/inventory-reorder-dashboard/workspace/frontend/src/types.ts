export type Category = "apparel" | "electronics" | "home" | "books";
export type ReorderStatus = "none" | "needed" | "ordered";

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: Category;
  stock: number;
  reorder_level: number;
  reorder_status: ReorderStatus;
  needs_reorder: boolean;
  updated_at: string;
}

export interface InventorySummary {
  total_products: number;
  low_stock: number;
  ordered: number;
}
