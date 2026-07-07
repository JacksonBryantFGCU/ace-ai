import { useState } from "react";
import type { ColumnData, ColumnId } from "../../workspace/types";
import { INITIAL_COLUMNS } from "../../workspace/data";

let nextId = 100;

// Step 1 reference solution: cards can be dragged between columns and
// dropped onto a specific card to be inserted right before it.
//
// This version has a latent bug when reordering DOWNWARD within the SAME
// column: `targetIndex` is read from the column's current card list (which
// still includes the card being dragged), then used to splice into the list
// AFTER that card has been removed — so once the dragged card sat before the
// target, everything shifted left by one and the card lands one slot too far
// right. Step 2 fixes it; these Step 1 tests never exercise the same-column
// case, so this naive version still passes them.
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

      const destColumn = prev.find((col) => col.id === targetColumnId)!;
      const targetIndex = targetCardId
        ? destColumn.cards.findIndex((c) => c.id === targetCardId)
        : destColumn.cards.length;

      return prev.map((col) => {
        if (col.id === sourceColumn.id && col.id === targetColumnId) {
          const withoutCard = col.cards.filter((c) => c.id !== cardId);
          const cards = [...withoutCard];
          cards.splice(targetIndex, 0, card);
          return { ...col, cards };
        }
        if (col.id === sourceColumn.id) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        if (col.id === targetColumnId) {
          const cards = [...col.cards];
          cards.splice(targetIndex, 0, card);
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
