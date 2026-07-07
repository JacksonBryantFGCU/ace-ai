import { useState } from "react";
import type { Todo } from "../../workspace/types";
import { INITIAL_TODOS } from "../../workspace/data";

let nextId = 100;

// Step 1 reference solution: adding and deleting todos. Delete is
// implemented against the todo's position in the rendered list — that's
// correct right now because nothing filters the list yet, but it's the seed
// of the bug Step 3 surfaces once filtering exists.
export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos((prev) => [...prev, { id: `t${nextId++}`, text: trimmed, completed: false }]);
    setText("");
  }

  function handleDelete(index: number) {
    setTodos((prev) => prev.filter((_, i) => i !== index));
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
          {todos.map((todo, index) => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => {}}
                aria-label={`Mark ${todo.text} complete`}
              />
              <span>{todo.text}</span>
              <button onClick={() => handleDelete(index)} aria-label={`Delete ${todo.text}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
