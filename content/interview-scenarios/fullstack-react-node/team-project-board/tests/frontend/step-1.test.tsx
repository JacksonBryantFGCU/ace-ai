import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 1", () => {
  it("renders loading and seeded tasks into their status columns", async () => {
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain("Loading board");

    const todoColumn = screen.getByLabelText("To Do column");
    expect(await within(todoColumn).findByText("Design onboarding screen")).toBeTruthy();
    expect(within(todoColumn).getByText("Write onboarding copy")).toBeTruthy();

    const inProgressColumn = screen.getByLabelText("In Progress column");
    expect(within(inProgressColumn).getByText("Implement settings route")).toBeTruthy();
    expect(within(inProgressColumn).getByText("Audit accessibility on nav")).toBeTruthy();

    const reviewColumn = screen.getByLabelText("Review column");
    expect(within(reviewColumn).getByText("Define rate limit policy")).toBeTruthy();

    const doneColumn = screen.getByLabelText("Done column");
    expect(within(doneColumn).getByText("Add pagination to list endpoint")).toBeTruthy();
    expect(within(doneColumn).getByText("Fix flaky auth test")).toBeTruthy();
    expect(within(doneColumn).getByText("Archive old dashboards")).toBeTruthy();
  });
});
