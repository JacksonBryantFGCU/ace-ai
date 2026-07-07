export type TransactionStatus = "paid" | "pending" | "overdue";

export interface Transaction {
  id: string;
  customer: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Amount in dollars. */
  amount: number;
  status: TransactionStatus;
}
