export const FEEDBACK_STATUSES = ["new", "reviewing", "resolved"] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
