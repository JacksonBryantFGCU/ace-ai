import type { ColumnData } from "./types";

// Ten seed cards across three columns — enough for reordering and cross-column
// moves to be meaningfully different from a one-or-two-card toy example.
export const INITIAL_COLUMNS: ColumnData[] = [
  {
    id: "todo",
    title: "Todo",
    cards: [
      { id: "c1", title: "Design empty states" },
      { id: "c2", title: "Write onboarding copy" },
      { id: "c3", title: "Audit color contrast" },
      { id: "c4", title: "Spec the settings page" },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    cards: [
      { id: "c5", title: "Build the notifications drawer" },
      { id: "c6", title: "Wire up the billing webhook" },
      { id: "c7", title: "Fix Safari flexbox bug" },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      { id: "c8", title: "Set up CI pipeline" },
      { id: "c9", title: "Migrate to the new logo" },
      { id: "c10", title: "Ship dark mode" },
    ],
  },
];
