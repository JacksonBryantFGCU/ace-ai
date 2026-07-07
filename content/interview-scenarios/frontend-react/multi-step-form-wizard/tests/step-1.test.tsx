import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FormWizard } from "../workspace/FormWizard";

// Step 1's graded contract: Next is blocked until the current step's
// required fields are valid, Next/Back move between Account and Workspace,
// and data survives that round trip. Asserts observable behavior only (what
// renders, what's blocked), so any state shape passes.
afterEach(cleanup);

function fillAccount(name: string, email: string) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
}

test("Next is blocked on the Account step until the fields are valid", () => {
  render(<FormWizard />);

  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toBeInTheDocument();

  fillAccount("Ada Lovelace", "not-an-email");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
});

test("valid Account data advances to Workspace, and Back returns without losing it", () => {
  render(<FormWizard />);

  fillAccount("Ada Lovelace", "ada@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
  expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
  expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
});

test("Back is disabled on the first step", () => {
  render(<FormWizard />);
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
});

test("Next is blocked on the Workspace step until team size is a positive number", () => {
  render(<FormWizard />);
  fillAccount("Ada Lovelace", "ada@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Analytical Engines Inc" } });
  fireEvent.change(screen.getByLabelText("Team size"), { target: { value: "not-a-number" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
