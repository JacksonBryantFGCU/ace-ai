export type ColumnId = "todo" | "in-progress" | "done";

export interface CardItem {
  id: string;
  title: string;
}

export interface ColumnData {
  id: ColumnId;
  title: string;
  cards: CardItem[];
}
