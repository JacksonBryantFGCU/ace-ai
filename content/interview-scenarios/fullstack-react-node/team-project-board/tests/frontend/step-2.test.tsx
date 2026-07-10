import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters the board by project", async () => {
    render(<App />);
    const board = screen.getByLabelText("Board");
    expect(await within(board).findByText("Define rate limit policy")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Project"), "1");
    await waitFor(() => expect(within(board).queryByText("Define rate limit policy")).toBeNull());
    expect(within(board).getByText("Design onboarding screen")).toBeTruthy();
  });

  it("shows the summary panel and creates a task through the backend", async () => {
    render(<App />);
    const board = screen.getByLabelText("Board");
    await within(board).findByText("Design onboarding screen");

    const summary = screen.getByLabelText("Board summary");
    expect(summary.textContent).toContain("Total 8");

    const createForm = screen.getByLabelText("Create task");
    await userEvent.selectOptions(within(createForm).getByLabelText("Task project"), "1");
    await userEvent.type(within(createForm).getByLabelText("Title"), "Polish empty states");
    await userEvent.click(within(createForm).getByRole("button", { name: /add task/i }));

    const todoColumn = screen.getByLabelText("To Do column");
    expect(await within(todoColumn).findByText("Polish empty states")).toBeTruthy();
    await waitFor(() => expect(summary.textContent).toContain("Total 9"));
  });
});
