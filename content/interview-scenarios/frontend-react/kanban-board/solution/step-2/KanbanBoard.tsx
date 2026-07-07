import { useState } from "react";
import type { ColumnData, ColumnId } from "../../workspace/types";
import { INITIAL_COLUMNS } from "../../workspace/data";

let nextId = 100;

// Step 2 reference solution: same-column reordering is fixed by computing the
// insertion index against the list AFTER the dragged card has been removed
// from it, instead of the list that still contained it. Cross-column moves
// are unaffected — the index there was always independent of the source
// column's removal.
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

  function handleDrop(e: React.DragEvent, targetColumnId: ColumnId, targetCardId: string | null) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;

    setColumns((prev) => {
      const sourceColumn = prev.find((col) => col.cards.some((c) => c.id === cardId));
      const card = sourceColumn?.cards.find((c) => c.id === cardId);
      if (!sourceColumn || !card) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumn.id && col.id === targetColumnId) {
          // Same column: remove the card first, THEN find the target's index
          // in what's left, so the shift caused by removal is already
          // accounted for.
          const withoutCard = col.cards.filter((c) => c.id !== cardId);
          const insertAt = targetCardId ? withoutCard.findIndex((c) => c.id === targetCardId) : withoutCard.length;
          const cards = [...withoutCard];
          cards.splice(insertAt === -1 ? withoutCard.length : insertAt, 0, card);
          return { ...col, cards };
        }
        if (col.id === sourceColumn.id) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        if (col.id === targetColumnId) {
          const insertAt = targetCardId ? col.cards.findIndex((c) => c.id === targetCardId) : col.cards.length;
          const cards = [...col.cards];
          cards.splice(insertAt === -1 ? col.cards.length : insertAt, 0, card);
          return { ...col, cards };
        }
        return col;
      });
    });
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
