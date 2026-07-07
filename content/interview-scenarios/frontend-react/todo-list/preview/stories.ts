// Self-contained, deterministic story data (docs §6) — never imports runtime
// logic or reaches into workspace/. Same four-story pattern used by every
// scenario in this set: default (live), empty, large-dataset, mobile.
export const stories = [
  { id: "default", label: "Default" },
  { id: "empty", label: "Empty state", props: { mode: "empty" } },
  { id: "large-dataset", label: "Large dataset", props: { mode: "large-dataset" } },
  { id: "mobile", label: "Mobile", viewport: "mobile" },
];
