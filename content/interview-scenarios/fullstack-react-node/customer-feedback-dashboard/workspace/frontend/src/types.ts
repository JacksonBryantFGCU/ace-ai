export type FeedbackStatus = "new" | "reviewing" | "resolved";

export interface FeedbackItem {
  id: number;
  customer_name: string;
  message: string;
  status: FeedbackStatus;
  response: string | null;
  created_at: string;
  updated_at: string;
}
