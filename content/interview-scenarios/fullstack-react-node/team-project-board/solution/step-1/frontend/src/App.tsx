import { useEffect, useState } from "react";
import { fetchBoard } from "./api";
import type { Task, TaskStatus } from "./types";
import "./styles.css";

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

function priorityLabel(priority: string) {
  return priority[0]!.toUpperCase() + priority.slice(1);
}

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBoard()
      .then((data) => {
        if (!cancelled) setTasks(data.tasks);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Team Workspace</p>
        <h1>Team Project Board</h1>
      </header>

      {loading ? <p role="status">Loading board...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && tasks.length === 0 ? <p>No tasks yet.</p> : null}

      <section className="board" aria-label="Board">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div className="board-column" key={column.status} aria-label={`${column.label} column`}>
              <h2>{`${column.label} (${columnTasks.length})`}</h2>
              {columnTasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <h3>{task.title}</h3>
                  <p className="task-meta">
                    {task.assignee ? task.assignee.name : "Unassigned"}
                    {task.due_date ? ` · Due ${formatDueDate(task.due_date)}` : " · No due date"}
                  </p>
                  <div className="badge-row">
                    <span className="badge project-badge">{task.project_name}</span>
                    <span className={`badge priority-${task.priority}`}>{priorityLabel(task.priority)}</span>
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </section>
    </main>
  );
}

export default App;
