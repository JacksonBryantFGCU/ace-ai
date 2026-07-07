import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { FormWizard } from "../workspace/FormWizard";

// Step 2's graded contract: the Plan step's billing-contact field only
// appears for Enterprise, that field must be a valid email different from
// the Account step's email, and Review compiles everything into a visible
// summary that Submit turns into a confirmation. Toggling between plans is
// exercised separately in Step 3.
afterEach(cleanup);

function reachPlanStep(email = "ada@example.com") {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Lovelace" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Analytical Engines Inc" } });
  fireEvent.change(screen.getByLabelText("Team size"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

test("the billing contact field only appears when Enterprise is selected", () => {
  render(<FormWizard />);
  reachPlanStep();

  expect(screen.queryByLabelText("Billing contact email")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));
  expect(screen.getByLabelText("Billing contact email")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "Starter" }));
  expect(screen.queryByLabelText("Billing contact email")).not.toBeInTheDocument();
});

test("Enterprise requires a billing email different from the account email", () => {
  render(<FormWizard />);
  reachPlanStep("ada@example.com");

  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Billing contact email"), { target: { value: "ada@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/different/i);

  fireEvent.change(screen.getByLabelText("Billing contact email"), { target: { value: "billing@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
});

test("a non-Enterprise plan advances without requiring a billing email", () => {
  render(<FormWizard />);
  reachPlanStep();

  fireEvent.click(screen.getByRole("radio", { name: "Starter" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
});

test("Review compiles the full payload, and Submit shows a confirmation", () => {
  render(<FormWizard />);
  reachPlanStep("ada@example.com");

  fireEvent.click(screen.getByRole("radio", { name: "Team" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  const review = screen.getByRole("heading", { name: "Review" }).closest("div")!;
  expect(within(review).getByText("Ada Lovelace")).toBeInTheDocument();
  expect(within(review).getByText("ada@example.com")).toBeInTheDocument();
  expect(within(review).getByText("Analytical Engines Inc")).toBeInTheDocument();
  expect(within(review).getByText("12")).toBeInTheDocument();
  expect(within(review).getByText("Team")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(screen.getByRole("status")).toHaveTextContent(/ada lovelace/i);
});
