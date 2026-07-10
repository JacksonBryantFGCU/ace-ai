import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters applications by status and source", async () => {
    render(<App />);
    const list = screen.getByLabelText("Applications");
    expect(await within(list).findByText("Stripe")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "interviewing");
    await waitFor(() => expect(within(list).queryByText("Stripe")).toBeNull());
    expect(within(list).getByText("Google")).toBeTruthy();
    expect(within(list).getByText("Figma")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");
    await userEvent.selectOptions(screen.getByLabelText("Source"), "linkedin");
    await waitFor(() => expect(within(list).queryByText("Google")).toBeNull());
    expect(await within(list).findByText("Meta")).toBeTruthy();
    expect(within(list).getByText("Linear")).toBeTruthy();
  });

  it("shows the summary panel and creates an application through the backend", async () => {
    render(<App />);
    const list = screen.getByLabelText("Applications");
    await within(list).findByText("Stripe");

    const summary = screen.getByLabelText("Application summary");
    expect(summary.textContent).toContain("Total 8");

    const createForm = screen.getByLabelText("Create application");
    await userEvent.type(within(createForm).getByLabelText("Company"), "Vercel");
    await userEvent.type(within(createForm).getByLabelText("Role"), "Platform Intern");
    await userEvent.type(within(createForm).getByLabelText("Location"), "Remote");
    await userEvent.click(within(createForm).getByRole("button", { name: /add application/i }));

    expect(await within(list).findByText("Vercel")).toBeTruthy();
    await waitFor(() => expect(summary.textContent).toContain("Total 9"));
  });
});
