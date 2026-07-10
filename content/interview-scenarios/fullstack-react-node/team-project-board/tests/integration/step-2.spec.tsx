import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters the board and creates a task through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);
    const board = screen.getByLabelText("Board");
    expect(await within(board).findByText("Define rate limit policy")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Assignee"), "3");
    await waitFor(() => expect(within(board).queryByText("Design onboarding screen")).toBeNull());
    expect(within(board).getByText("Define rate limit policy")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Assignee"), "all");
    await within(board).findByText("Design onboarding screen");

    const createForm = screen.getByLabelText("Create task");
    await user.selectOptions(within(createForm).getByLabelText("Task project"), "2");
    await user.type(within(createForm).getByLabelText("Title"), "Ship v2 rate limiter");
    await user.click(within(createForm).getByRole("button", { name: /add task/i }));

    const todoColumn = screen.getByLabelText("To Do column");
    expect(await within(todoColumn).findByText("Ship v2 rate limiter")).toBeTruthy();
  });
});
