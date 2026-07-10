export type MemberRole = "designer" | "engineer" | "manager";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Member {
  id: number;
  name: string;
  email: string;
  role: MemberRole;
}

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_name: string;
  assignee: TaskAssignee | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardSummary {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
}
