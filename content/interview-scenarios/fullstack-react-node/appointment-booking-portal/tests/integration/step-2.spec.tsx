import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(() => cleanup());

describe("integration step 2", () => {
  it("filters appointments and books one through the live frontend and backend runtime", async () => {
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByLabelText("Appointments");
    await within(list).findByText("Morgan Diaz");

    const staffFilter = screen.getByLabelText("Staff");
    await within(staffFilter).findByRole("option", { name: "Priya Shah" });
    await user.selectOptions(staffFilter, "2");
    await waitFor(() => expect(within(list).queryByText("Morgan Diaz")).toBeNull());
    expect(within(list).getByText("Taylor Brooks")).toBeTruthy();

    await user.selectOptions(staffFilter, "all");
    await within(list).findByText("Morgan Diaz");

    const createForm = screen.getByLabelText("Book appointment");
    await user.selectOptions(within(createForm).getByLabelText("Service"), "3");
    await user.selectOptions(within(createForm).getByLabelText("Staff member"), "3");
    await user.type(within(createForm).getByLabelText("Customer name"), "Casey Nguyen");
    await user.type(within(createForm).getByLabelText("Customer email"), "casey.nguyen@example.com");
    await user.type(within(createForm).getByLabelText("Start time"), "2025-02-20T09:00:00.000Z");
    await user.click(within(createForm).getByRole("button", { name: /book appointment/i }));

    expect(await within(list).findByText("Casey Nguyen")).toBeTruthy();
  });
});
