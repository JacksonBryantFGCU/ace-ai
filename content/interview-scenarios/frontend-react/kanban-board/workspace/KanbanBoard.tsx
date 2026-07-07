import { useState } from "react";
import type { ColumnData, ColumnId } from "./types";
import { INITIAL_COLUMNS } from "./data";

let nextId = 100;

// A three-column Kanban board. Adding and deleting cards already works.
//
// TODO (Step 1): let a card be dragged out of its column and dropped into
// another. Dropping directly on a column should append the card to the end;
// dropping on a specific card should insert it right before that card.
export function KanbanBoard() {
  const [columns, setColumns] = useState<ColumnData[]>(INITIAL_COLUMNS);

  function addCard(columnId: ColumnId, title: string) {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, { id: `c${nextId++}`, title }] } : col,
      ),
    );
  }

  function deleteCard(columnId: ColumnId, cardId: string) {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) } : col)),
    );
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {columns.map((column) => (
        <section key={column.id} aria-label={column.title} style={{ minWidth: 220 }}>
          <h2>{column.title}</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {column.cards.map((card) => (
              <li
                key={card.id}
                aria-label={card.title}
                style={{ border: "1px solid #ccc", padding: 8, marginBottom: 8 }}
              >
                <span>{card.title}</span>
                <button onClick={() => deleteCard(column.id, card.id)} aria-label={`Delete ${card.title}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <AddCardForm columnTitle={column.title} onAdd={(title) => addCard(column.id, title)} />
        </section>
      ))}
    </div>
  );
}

function AddCardForm({ columnTitle, onAdd }: { columnTitle: string; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim());
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New card title"
        aria-label={`New card title for ${columnTitle}`}
      />
      <button type="submit">Add</button>
    </form>
  );
}
