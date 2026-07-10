export const CATEGORIES = ["apparel", "electronics", "home", "books"] as const;

export type Category = (typeof CATEGORIES)[number];

export const REORDER_STATUSES = ["none", "needed", "ordered"] as const;

export type ReorderStatus = (typeof REORDER_STATUSES)[number];
