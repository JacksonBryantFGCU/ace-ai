import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { KanbanBoard } from "../workspace/KanbanBoard";

// Step 1's graded contract: a card can be dragged out of its column and
// dropped into another — appended to the end when dropped on the column
// itself, or inserted right before a specific card when dropped on it.
// Same-column reordering is exercised in Step 2, where it has a subtler bug.
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

test("dragging a card onto another column moves it there", () => {
  render(<KanbanBoard />);

  expect(cardOrder("Todo")).toContain("Design empty states");
  expect(cardOrder("In Progress")).not.toContain("Design empty states");

  const destination = screen.getByRole("region", { name: "In Progress" });
  dragCardOnto("Design empty states", destination);

  expect(cardOrder("Todo")).not.toContain("Design empty states");
  const inProgress = cardOrder("In Progress");
  expect(inProgress[inProgress.length - 1]).toBe("Design empty states");
});

test("dropping a card onto another card inserts it right before that card", () => {
  render(<KanbanBoard />);

  const target = screen.getByText("Set up CI pipeline").closest("li")!;
  dragCardOnto("Write onboarding copy", target);

  expect(cardOrder("Todo")).not.toContain("Write onboarding copy");
  const done = cardOrder("Done");
  const movedIndex = done.indexOf("Write onboarding copy");
  const targetIndex = done.indexOf("Set up CI pipeline");
  expect(movedIndex).toBeGreaterThanOrEqual(0);
  expect(movedIndex).toBe(targetIndex - 1);
});
