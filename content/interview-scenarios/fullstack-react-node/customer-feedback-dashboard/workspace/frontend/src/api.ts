import type { FeedbackItem, FeedbackStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface FeedbackResponse {
  feedback: FeedbackItem[];
}

interface SingleFeedbackResponse {
  feedback: FeedbackItem;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchFeedback(status: FeedbackStatus | "all"): Promise<FeedbackItem[]> {
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const data = await parseJson<FeedbackResponse>(await fetch(`${API_BASE_URL}/feedback${query}`));
  return data.feedback;
}

export async function updateFeedback(
  id: number,
  payload: { status: FeedbackStatus; response?: string },
): Promise<FeedbackItem> {
  const data = await parseJson<SingleFeedbackResponse>(
    await fetch(`${API_BASE_URL}/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.feedback;
}
