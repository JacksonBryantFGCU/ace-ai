import { useState } from "react";
import type { CardItem, ColumnData, ColumnId } from "../../workspace/types";
import { INITIAL_COLUMNS } from "../../workspace/data";

let nextId = 100;

export interface UseKanbanBoard {
  columns: ColumnData[];
  addCard: (columnId: ColumnId, title: string) => void;
  deleteCard: (columnId: ColumnId, cardId: string) => void;
  moveCard: (cardId: string, targetColumnId: ColumnId, targetCardId: string | null) => void;
}

// Step 3 reference solution: the board's state transitions (add, delete,
// move) are extracted into a reusable hook so another screen could drive the
// same board logic without copy-pasting it. Behavior — including the Step 2
// same-column reorder fix — is unchanged; this is one valid reusable
// boundary, graded on the boundary itself rather than this exact shape.
export function useKanbanBoard(): UseKanbanBoard {
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

  function moveCard(cardId: string, targetColumnId: ColumnId, targetCardId: string | null) {
    setColumns((prev) => {
      const sourceColumn = prev.find((col) => col.cards.some((c) => c.id === cardId));
      const card: CardItem | undefined = sourceColumn?.cards.find((c) => c.id === cardId);
      if (!sourceColumn || !card) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumn.id && col.id === targetColumnId) {
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

  return { columns, addCard, deleteCard, moveCard };
}
