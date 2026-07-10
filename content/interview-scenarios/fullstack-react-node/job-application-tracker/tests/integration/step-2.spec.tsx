import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters applications and creates one through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByLabelText("Applications");
    expect(await within(list).findByText("Stripe")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Source"), "referral");
    await waitFor(() => expect(within(list).queryByText("Stripe")).toBeNull());
    expect(within(list).getByText("Google")).toBeTruthy();
    expect(within(list).getByText("Notion")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Source"), "all");
    await within(list).findByText("Stripe");

    const createForm = screen.getByLabelText("Create application");
    await user.type(within(createForm).getByLabelText("Company"), "Vercel");
    await user.type(within(createForm).getByLabelText("Role"), "Platform Intern");
    await user.type(within(createForm).getByLabelText("Location"), "Remote");
    await user.click(within(createForm).getByRole("button", { name: /add application/i }));

    expect(await within(list).findByText("Vercel")).toBeTruthy();
  });
});
