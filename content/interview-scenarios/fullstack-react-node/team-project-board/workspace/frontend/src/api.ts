import type { BoardSummary, Member, Project, Task, TaskPriority, TaskStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface BoardResponse {
  projects: Project[];
  members: Member[];
  tasks: Task[];
}

interface SummaryResponse {
  summary: BoardSummary;
}

interface TaskResponse {
  task: Task;
}

export interface BoardQuery {
  projectId?: number | "all";
  assigneeId?: number | "all";
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

function queryParams(query: BoardQuery): string {
  const params = new URLSearchParams();
  if (query.projectId !== undefined && query.projectId !== "all") params.set("project_id", String(query.projectId));
  if (query.assigneeId !== undefined && query.assigneeId !== "all")
    params.set("assignee_id", String(query.assigneeId));
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export async function fetchBoard(query: BoardQuery = {}): Promise<BoardResponse> {
  return parseJson<BoardResponse>(await fetch(`${API_BASE_URL}/board${queryParams(query)}`));
}

export async function fetchBoardSummary(query: BoardQuery = {}): Promise<BoardSummary> {
  const data = await parseJson<SummaryResponse>(await fetch(`${API_BASE_URL}/board/summary${queryParams(query)}`));
  return data.summary;
}

export async function createTask(payload: {
  project_id: number;
  assignee_id: number | null;
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
}): Promise<Task> {
  const data = await parseJson<TaskResponse>(
    await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.task;
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const data = await parseJson<TaskResponse>(
    await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
  return data.task;
}
