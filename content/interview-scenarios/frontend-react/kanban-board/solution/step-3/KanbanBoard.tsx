import { useState } from "react";
import type { ColumnId } from "../../workspace/types";
import { useKanbanBoard } from "./useKanbanBoard";

// Step 3 reference solution: KanbanBoard now only renders the board and wires
// up events; all state transitions (add, delete, move) live in
// useKanbanBoard. Rendered output — and every Step 1/2 behavior — is
// unchanged.
export function KanbanBoard() {
  const { columns, addCard, deleteCard, moveCard } = useKanbanBoard();

  function handleDrop(e: React.DragEvent, targetColumnId: ColumnId, targetCardId: string | null) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) moveCard(cardId, targetColumnId, targetCardId);
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {columns.map((column) => (
        <section
          key={column.id}
          aria-label={column.title}
          style={{ minWidth: 220 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, column.id, null)}
        >
          <h2>{column.title}</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {column.cards.map((card) => (
              <li
                key={card.id}
                aria-label={card.title}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, column.id, card.id);
                }}
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
