import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("frontend step 2", () => {
  it("filters appointments by staff", async () => {
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    expect(await within(list).findByText("Morgan Diaz")).toBeTruthy();

    const staffFilter = screen.getByLabelText("Staff");
    await within(staffFilter).findByRole("option", { name: "Alex Rivera" });
    await userEvent.selectOptions(staffFilter, "1");

    await waitFor(() => expect(within(list).queryByText("Taylor Brooks")).toBeNull());
    expect(within(list).getByText("Morgan Diaz")).toBeTruthy();
  });

  it("books an appointment and shows a conflict error", async () => {
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    await within(list).findByText("Morgan Diaz");

    const createForm = screen.getByLabelText("Book appointment");
    await within(createForm).findByRole("option", { name: "Initial Consultation" });

    await userEvent.selectOptions(within(createForm).getByLabelText("Service"), "1");
    await userEvent.selectOptions(within(createForm).getByLabelText("Staff member"), "1");
    await userEvent.type(within(createForm).getByLabelText("Customer name"), "New Customer");
    await userEvent.type(within(createForm).getByLabelText("Customer email"), "newcustomer@example.com");
    await userEvent.type(within(createForm).getByLabelText("Start time"), "2025-02-10T15:30:00.000Z");
    await userEvent.click(within(createForm).getByRole("button", { name: /book appointment/i }));

    expect(await within(createForm).findByText(/conflicts with existing booking/i)).toBeTruthy();

    await userEvent.clear(within(createForm).getByLabelText("Start time"));
    await userEvent.type(within(createForm).getByLabelText("Start time"), "2025-02-20T09:00:00.000Z");
    await userEvent.click(within(createForm).getByRole("button", { name: /book appointment/i }));

    expect(await within(list).findByText("New Customer")).toBeTruthy();
  });
});
