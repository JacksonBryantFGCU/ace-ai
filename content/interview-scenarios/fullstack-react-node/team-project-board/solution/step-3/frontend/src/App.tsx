import { FormEvent, useEffect, useState } from "react";
import { createTask, fetchBoard, fetchBoardSummary, updateTaskStatus } from "./api";
import type { BoardSummary, Member, Project, Task, TaskPriority, TaskStatus } from "./types";
import "./styles.css";

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];
const MOVE_STATUS_OPTIONS: Array<{ status: TaskStatus; label: string }> = COLUMNS;

function priorityLabel(priority: string) {
  return priority[0]!.toUpperCase() + priority.slice(1);
}

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";
  return new Date(dueDate).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function initDrafts(items: Task[]): Record<number, TaskStatus> {
  return Object.fromEntries(items.map((item) => [item.id, item.status]));
}

export function App() {
  const [projectFilter, setProjectFilter] = useState<number | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | "all">("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BoardSummary | null>(null);

  const [taskProjectId, setTaskProjectId] = useState<number | "">("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [draftMoveStatus, setDraftMoveStatus] = useState<Record<number, TaskStatus>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [movingId, setMovingId] = useState<number | null>(null);

  function loadSummary(query: { projectId?: number | "all"; assigneeId?: number | "all" }) {
    return fetchBoardSummary(query)
      .then((next) => setSummary(next))
      .catch(() => setSummary(null));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBoard({ projectId: projectFilter, assigneeId: assigneeFilter })
      .then((data) => {
        if (cancelled) return;
        setTasks(data.tasks);
        setProjects(data.projects);
        setMembers(data.members);
        setDraftMoveStatus(initDrafts(data.tasks));
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
  }, [projectFilter, assigneeFilter]);

  useEffect(() => {
    loadSummary({ projectId: projectFilter, assigneeId: assigneeFilter });
  }, [projectFilter, assigneeFilter]);

  const activeProjects = projects.filter((project) => project.status === "active");

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTask({
        project_id: Number(taskProjectId),
        assignee_id: taskAssigneeId === "" ? null : Number(taskAssigneeId),
        title,
        description,
        priority,
        due_date: dueDate || undefined,
      });
      setTasks((current) => [...current, created]);
      setDraftMoveStatus((current) => ({ ...current, [created.id]: created.status }));
      await loadSummary({ projectId: projectFilter, assigneeId: assigneeFilter });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setTaskAssigneeId("");
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleMove(task: Task) {
    const nextStatus = draftMoveStatus[task.id] ?? task.status;
    setMovingId(task.id);
    setItemErrors((current) => ({ ...current, [task.id]: "" }));
    try {
      const updated = await updateTaskStatus(task.id, nextStatus);
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDraftMoveStatus((current) => ({ ...current, [updated.id]: updated.status }));
      await loadSummary({ projectId: projectFilter, assigneeId: assigneeFilter });
    } catch (err) {
      setItemErrors((current) => ({ ...current, [task.id]: (err as Error).message }));
    } finally {
      setMovingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Team Workspace</p>
        <h1>Team Project Board</h1>
      </header>

      {summary ? (
        <section className="summary-panel" aria-label="Board summary">
          <span>{`Total ${summary.total}`}</span>
          <span>{`To Do ${summary.by_status.todo}`}</span>
          <span>{`In Progress ${summary.by_status.in_progress}`}</span>
          <span>{`Review ${summary.by_status.review}`}</span>
          <span>{`Done ${summary.by_status.done}`}</span>
        </section>
      ) : null}

      <section className="toolbar" aria-label="Board filters">
        <label htmlFor="project-filter">Project</label>
        <select
          id="project-filter"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <label htmlFor="assignee-filter">Assignee</label>
        <select
          id="assignee-filter"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p role="status">Loading board...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && tasks.length === 0 ? <p>No tasks match these filters.</p> : null}

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

                  <div className="update-form">
                    <label htmlFor={`move-status-${task.id}`}>Move status for {task.title}</label>
                    <select
                      id={`move-status-${task.id}`}
                      value={draftMoveStatus[task.id] ?? task.status}
                      onChange={(event) =>
                        setDraftMoveStatus((current) => ({
                          ...current,
                          [task.id]: event.target.value as TaskStatus,
                        }))
                      }
                    >
                      {MOVE_STATUS_OPTIONS.map((option) => (
                        <option key={option.status} value={option.status}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {itemErrors[task.id] ? (
                      <p role="alert" className="error">{itemErrors[task.id]}</p>
                    ) : null}

                    <button type="button" disabled={movingId === task.id} onClick={() => handleMove(task)}>
                      {movingId === task.id ? "Moving..." : "Move"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </section>

      <form onSubmit={handleCreateSubmit} className="create-form" aria-label="Create task">
        <h2>Add Task</h2>

        <div className="field-row">
          <div className="field">
            <label htmlFor="create-project">Task project</label>
            <select
              id="create-project"
              value={taskProjectId}
              onChange={(event) => setTaskProjectId(event.target.value === "" ? "" : Number(event.target.value))}
            >
              <option value="">Select a project</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="create-assignee">Task assignee</label>
            <select
              id="create-assignee"
              value={taskAssigneeId}
              onChange={(event) => setTaskAssigneeId(event.target.value === "" ? "" : Number(event.target.value))}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {priorityLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="due-date">Due date</label>
          <input
            id="due-date"
            type="text"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        {createError ? <p role="alert" className="error">{createError}</p> : null}

        <button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Task"}
        </button>
      </form>
    </main>
  );
}

export default App;
