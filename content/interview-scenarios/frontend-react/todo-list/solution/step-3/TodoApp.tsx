import { useState } from "react";
import type { Filter, Todo } from "../../workspace/types";
import { INITIAL_TODOS } from "../../workspace/data";

let nextId = 100;

// Step 3 reference solution: delete now removes a todo by its id, the same
// way toggle and edit already did — so it's correct no matter which filtered
// list it was clicked from.
export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const visibleTodos =
    filter === "all" ? todos : todos.filter((t) => (filter === "active" ? !t.completed : t.completed));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos((prev) => [...prev, { id: `t${nextId++}`, text: trimmed, completed: false }]);
    setText("");
  }

  function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function handleToggle(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  function commitEdit(id: string) {
    const trimmed = editingText.trim();
    if (trimmed) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)));
    }
    setEditingId(null);
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
  ];

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

      <div role="tablist" aria-label="Filter todos">
        {filters.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {visibleTodos.length === 0 ? (
        <p>{todos.length === 0 ? "Nothing here yet — add your first todo above." : `No ${filter} todos.`}</p>
      ) : (
        <ul>
          {visibleTodos.map((todo) => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo.id)}
                aria-label={`Mark ${todo.text} complete`}
              />
              {editingId === todo.id ? (
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => commitEdit(todo.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(todo.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  aria-label={`Edit ${todo.text}`}
                  autoFocus
                />
              ) : (
                <span onDoubleClick={() => startEdit(todo)}>{todo.text}</span>
              )}
              <button onClick={() => handleDelete(todo.id)} aria-label={`Delete ${todo.text}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
