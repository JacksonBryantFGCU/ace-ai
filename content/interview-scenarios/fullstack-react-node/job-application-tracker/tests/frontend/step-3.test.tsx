import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 3", () => {
  it("updates an application's status and shows it in the badge", async () => {
    render(<App />);
    const list = screen.getByLabelText("Applications");
    const amazonHeading = await within(list).findByText("Amazon");
    const amazonCard = amazonHeading.closest("article")!;

    await userEvent.selectOptions(within(amazonCard).getByLabelText("Update status for Amazon"), "applied");
    await userEvent.click(within(amazonCard).getByRole("button", { name: /save changes/i }));

    expect(await within(amazonCard).findByText("Applied", { selector: ".status" })).toBeTruthy();
  });

  it("updates notes successfully and shows a backend error for notes that are too long", async () => {
    render(<App />);
    const list = screen.getByLabelText("Applications");
    const stripeHeading = await within(list).findByText("Stripe");
    const stripeCard = stripeHeading.closest("article")!;

    const notesField = within(stripeCard).getByLabelText("Update notes for Stripe");
    fireEvent.change(notesField, { target: { value: "x".repeat(501) } });
    await userEvent.click(within(stripeCard).getByRole("button", { name: /save changes/i }));
    expect(await within(stripeCard).findByText(/notes are too long/i)).toBeTruthy();

    fireEvent.change(notesField, { target: { value: "Recruiter call scheduled." } });
    await userEvent.click(within(stripeCard).getByRole("button", { name: /save changes/i }));

    expect(
      await within(stripeCard).findByText("Recruiter call scheduled.", { selector: ".notes-display" }),
    ).toBeTruthy();
    expect(within(stripeCard).queryByText(/notes are too long/i)).toBeNull();
  });
});
