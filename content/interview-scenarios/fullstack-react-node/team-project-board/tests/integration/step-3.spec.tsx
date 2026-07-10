import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 3", () => {
  it("moves a task and persists the change across reloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    const board = screen.getByLabelText("Board");
    const cardHeading = await within(board).findByText("Design onboarding screen");
    const card = cardHeading.closest("article")!;

    await user.selectOptions(within(card).getByLabelText("Move status for Design onboarding screen"), "in_progress");
    await user.click(within(card).getByRole("button", { name: /move/i }));

    const inProgressColumn = screen.getByLabelText("In Progress column");
    await waitFor(() => expect(within(inProgressColumn).getByText("Design onboarding screen")).toBeTruthy());

    cleanup();
    render(<App />);
    const reloadedInProgress = screen.getByLabelText("In Progress column");
    expect(await within(reloadedInProgress).findByText("Design onboarding screen")).toBeTruthy();
    const reloadedTodo = screen.getByLabelText("To Do column");
    expect(within(reloadedTodo).queryByText("Design onboarding screen")).toBeNull();
  });
});
