import { useState } from "react";
import type { Todo } from "./types";
import { INITIAL_TODOS } from "./data";

let nextId = 100;

// A todo list. Adding and deleting aren't wired up yet — this just renders
// the seeded list. The input below is already controlled.
//
// TODO (Step 1): submit the form to add a new todo, and wire up the Delete
// button on each row.
export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo"
        />
        <button type="submit">Add</button>
      </form>

      {todos.length === 0 ? (
        <p>Nothing here yet — add your first todo above.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => {}}
                aria-label={`Mark ${todo.text} complete`}
              />
              <span>{todo.text}</span>
              <button onClick={() => {}} aria-label={`Delete ${todo.text}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
