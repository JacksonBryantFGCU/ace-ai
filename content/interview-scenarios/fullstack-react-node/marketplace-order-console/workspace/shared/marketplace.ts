export const SELLER_STATUSES = ["active", "suspended"] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const ORDER_STATUSES = ["pending", "fulfilled", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
