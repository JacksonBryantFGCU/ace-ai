import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.TodoApp;

type Mode = "default" | "empty" | "large-dataset";

interface PreviewTodo {
  id: string;
  text: string;
  completed: boolean;
}

// "default" and "mobile" render the ACTUAL live candidate code — the starter
// already seeds a realistic five-todo list, so that's a fine "typical" state
// on its own. "empty"/"large-dataset" illustrate states the fixed seed data
// can't reach by itself: this is authored, read-only, deterministic mock UI
// (never the candidate's real state), built to match the same visual shape.
const LARGE_DATASET: PreviewTodo[] = Array.from({ length: 24 }, (_, i) => ({
  id: `t${i}`,
  text:
    [
      "Write project README",
      "Set up CI pipeline",
      "Fix login redirect bug",
      "Add dark mode toggle",
      "Review pull request #42",
      "Migrate to the new logo",
      "Audit color contrast",
      "Ship the onboarding flow",
      "Fix Safari flexbox bug",
      "Update dependency versions",
      "Write API docs",
      "Triage backlog",
    ][i % 12] + (i >= 12 ? ` (${Math.floor(i / 12) + 1})` : ""),
  completed: i % 3 === 0,
}));

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeTodoApp todos={mode === "empty" ? [] : LARGE_DATASET} />
      )}
    </Frame>
  );
}

function IllustrativeTodoApp({ todos }: { todos: PreviewTodo[] }) {
  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()}>
        <input value="" onChange={() => {}} placeholder="What needs doing?" aria-label="New todo" readOnly />
        <button type="submit">Add</button>
      </form>

      {todos.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
          Nothing here yet — add your first todo above.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, maxHeight: 420, overflowY: "auto" }}>
          {todos.map((todo) => (
            <li key={todo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <input type="checkbox" checked={todo.completed} readOnly aria-label={`Mark ${todo.text} complete`} />
              <span
                style={{
                  flex: 1,
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? "#9ca3af" : "inherit",
                }}
              >
                {todo.text}
              </span>
              <button aria-label={`Delete ${todo.text}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
