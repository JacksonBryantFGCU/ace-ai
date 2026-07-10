import type { Customer, Order, OrderDetail, OrderStatus, OrderSummary, Product, Seller } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4330";

interface OrdersResponse {
  orders: Order[];
}

interface OrderOptionsResponse {
  customers: Customer[];
  sellers: Seller[];
  products: Product[];
}

interface OrderSummaryResponse {
  summary: OrderSummary;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export interface OrderFilters {
  status?: OrderStatus | "all";
  customerId?: number | "all";
  sellerId?: number | "all";
}

function queryParams(filters: OrderFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== undefined && filters.status !== "all") params.set("status", filters.status);
  if (filters.customerId !== undefined && filters.customerId !== "all")
    params.set("customer_id", String(filters.customerId));
  if (filters.sellerId !== undefined && filters.sellerId !== "all") params.set("seller_id", String(filters.sellerId));
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export async function fetchOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const data = await parseJson<OrdersResponse>(await fetch(`${API_BASE_URL}/orders${queryParams(filters)}`));
  return data.orders;
}

export async function fetchOrderDetail(id: number): Promise<OrderDetail> {
  return parseJson<OrderDetail>(await fetch(`${API_BASE_URL}/orders/${id}`));
}

export async function fetchOrderOptions(): Promise<OrderOptionsResponse> {
  return parseJson<OrderOptionsResponse>(await fetch(`${API_BASE_URL}/order-options`));
}

export async function fetchOrderSummary(): Promise<OrderSummary> {
  const data = await parseJson<OrderSummaryResponse>(await fetch(`${API_BASE_URL}/orders/summary`));
  return data.summary;
}

export async function createOrder(payload: {
  customer_id: number;
  items: Array<{ product_id: number; quantity: number }>;
}): Promise<OrderDetail> {
  return parseJson<OrderDetail>(
    await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fulfillOrder(id: number): Promise<OrderDetail> {
  return parseJson<OrderDetail>(
    await fetch(`${API_BASE_URL}/orders/${id}/fulfill`, { method: "PATCH" }),
  );
}

export async function cancelOrder(id: number): Promise<OrderDetail> {
  return parseJson<OrderDetail>(
    await fetch(`${API_BASE_URL}/orders/${id}/cancel`, { method: "PATCH" }),
  );
}
