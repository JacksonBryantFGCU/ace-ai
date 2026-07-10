export type SellerStatus = "active" | "suspended";
export type OrderStatus = "pending" | "fulfilled" | "cancelled";

export interface Customer {
  id: number;
  name: string;
  email: string;
}

export interface Seller {
  id: number;
  name: string;
  email: string;
  status: SellerStatus;
}

export interface Product {
  id: number;
  seller_id: number;
  name: string;
  sku: string;
  price_cents: number;
  inventory_count: number;
}

export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
}

export interface Order {
  id: number;
  customer: OrderCustomer;
  status: OrderStatus;
  subtotal_cents: number;
  item_count: number;
  seller_count: number;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

export interface OrderItemProduct {
  id: number;
  name: string;
  sku: string;
}

export interface OrderItemSeller {
  id: number;
  name: string;
}

export interface OrderItem {
  id: number;
  product: OrderItemProduct;
  seller: OrderItemSeller;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

export interface OrderSummary {
  total_orders: number;
  pending: number;
  fulfilled: number;
  cancelled: number;
  gross_revenue_cents: number;
  pending_revenue_cents: number;
}
