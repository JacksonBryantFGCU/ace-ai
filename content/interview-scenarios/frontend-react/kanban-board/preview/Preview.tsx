import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.KanbanBoard;

type Mode = "default" | "empty" | "large-dataset";
type ColumnId = "todo" | "in-progress" | "done";

interface PreviewCard {
  id: string;
  title: string;
}
interface PreviewColumn {
  id: ColumnId;
  title: string;
  cards: PreviewCard[];
}

const COLUMN_TITLES: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "Todo" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

// "default"/"mobile" render the ACTUAL live candidate code — the starter
// already ships add/delete and ten seed cards. "empty"/"large-dataset"
// illustrate board states the fixed seed data can't reach on its own: a
// self-contained, deterministic, read-only mock (never the candidate's
// real drag state).
const LARGE_TITLES = [
  "Design empty states", "Write onboarding copy", "Audit color contrast", "Spec the settings page",
  "Build the notifications drawer", "Wire up the billing webhook", "Fix Safari flexbox bug",
  "Set up CI pipeline", "Migrate to the new logo", "Ship dark mode", "Draft the Q3 roadmap",
  "Localize error messages",
];

function largeColumns(): PreviewColumn[] {
  return COLUMN_TITLES.map((col, colIndex) => ({
    ...col,
    cards: Array.from({ length: 12 }, (_, i) => ({
      id: `${col.id}-${i}`,
      title: `${LARGE_TITLES[(i + colIndex * 4) % LARGE_TITLES.length]} (${i + 1})`,
    })),
  }));
}

function emptyColumns(): PreviewColumn[] {
  return COLUMN_TITLES.map((col) => ({ ...col, cards: [] }));
}

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeBoard columns={mode === "empty" ? emptyColumns() : largeColumns()} />
      )}
    </Frame>
  );
}

function IllustrativeBoard({ columns }: { columns: PreviewColumn[] }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {columns.map((column) => (
        <section key={column.id} aria-label={column.title} style={{ minWidth: 220 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
            {column.title} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({column.cards.length})</span>
          </h2>
          {column.cards.length === 0 ? (
            <div
              style={{
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: "24px 8px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              No cards yet
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 480, overflowY: "auto" }}>
              {column.cards.map((card) => (
                <li
                  key={card.id}
                  aria-label={card.title}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, marginBottom: 8 }}
                >
                  {card.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
