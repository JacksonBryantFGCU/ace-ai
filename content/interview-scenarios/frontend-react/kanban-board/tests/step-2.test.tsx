import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { KanbanBoard } from "../workspace/KanbanBoard";

// Step 2's graded contract: reordering a card WITHIN its own column must land
// it in the exact intended slot in both directions, not one position off.
// This asserts the observable order only, so any indexing fix (recomputing
// against the post-removal list, adjusting the index by one, etc.) satisfies
// it equally.
afterEach(cleanup);

function makeDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (key: string, value: string) => {
      data[key] = value;
    },
    getData: (key: string) => data[key] ?? "",
  };
}

function dragCardOnto(cardTitle: string, target: HTMLElement) {
  const dataTransfer = makeDataTransfer();
  const source = screen.getByText(cardTitle).closest("li")!;
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
}

function cardOrder(columnName: string): string[] {
  const region = screen.getByRole("region", { name: columnName });
  return within(region)
    .getAllByRole("listitem")
    .map((li) => li.getAttribute("aria-label") ?? "");
}

test("dragging a card downward within the same column drops it in the right slot", () => {
  render(<KanbanBoard />);

  // Todo starts as: Design empty states, Write onboarding copy, Audit color
  // contrast, Spec the settings page. Drag the first card down onto the last
  // one — it should land immediately before it, not after.
  const before = cardOrder("Todo");
  const target = screen.getByText("Spec the settings page").closest("li")!;
  dragCardOnto("Design empty states", target);

  const after = cardOrder("Todo");
  expect(after).toHaveLength(before.length);
  expect(after).toEqual([
    "Write onboarding copy",
    "Audit color contrast",
    "Design empty states",
    "Spec the settings page",
  ]);
});

test("dragging a card upward within the same column still works", () => {
  render(<KanbanBoard />);

  const target = screen.getByText("Design empty states").closest("li")!;
  dragCardOnto("Spec the settings page", target);

  expect(cardOrder("Todo")).toEqual([
    "Spec the settings page",
    "Design empty states",
    "Write onboarding copy",
    "Audit color contrast",
  ]);
});
