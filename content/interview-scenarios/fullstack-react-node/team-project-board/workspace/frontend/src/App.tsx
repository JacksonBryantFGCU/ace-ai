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
  // TODO (Step 1): track tasks, loading, and error state, and fetch the board on
  // mount (see fetchBoard in ./api).

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Team Workspace</p>
        <h1>Team Project Board</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      <section className="board" aria-label="Board">
        {/* TODO (Step 1): render one column per entry in COLUMNS above (a
            <div aria-label="{label} column"> with an <h2> heading), each
            containing the tasks whose status matches that column. Each task
            card should show title, assignee (or "Unassigned"), due date (use
            formatDueDate above), project name, and priority (use
            priorityLabel above). */}
      </section>

      {/* TODO (Step 2): add project/assignee filter controls, a summary
          panel, and a task creation form. */}

      {/* TODO (Step 3): add a status move control to each task card, and
          display backend validation errors from invalid transitions. */}
    </main>
  );
}

export default App;
