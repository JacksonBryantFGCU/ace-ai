import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("moves a task through a valid transition and updates its column", async () => {
    render(<App />);
    const board = screen.getByLabelText("Board");
    const cardHeading = await within(board).findByText("Design onboarding screen");
    const card = cardHeading.closest("article")!;

    await userEvent.selectOptions(
      within(card).getByLabelText("Move status for Design onboarding screen"),
      "in_progress",
    );
    await userEvent.click(within(card).getByRole("button", { name: /move/i }));

    const inProgressColumn = screen.getByLabelText("In Progress column");
    expect(await within(inProgressColumn).findByText("Design onboarding screen")).toBeTruthy();
    const todoColumn = screen.getByLabelText("To Do column");
    expect(within(todoColumn).queryByText("Design onboarding screen")).toBeNull();
  });

  it("shows a backend error for a transition from a terminal state", async () => {
    // Uses a task independent of the previous test's mutation (that test's frontend
    // and this test's frontend share one backend instance for the whole file, reset
    // only once before the file runs — not before each `it`).
    render(<App />);
    const board = screen.getByLabelText("Board");
    const cardHeading = await within(board).findByText("Fix flaky auth test");
    const card = cardHeading.closest("article")!;

    await userEvent.selectOptions(within(card).getByLabelText("Move status for Fix flaky auth test"), "todo");
    await userEvent.click(within(card).getByRole("button", { name: /move/i }));

    expect(await within(card).findByText(/invalid status transition/i)).toBeTruthy();
  });
});
