import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FormWizard } from "../workspace/FormWizard";

// Step 3's graded contract: switching away from Enterprise and back to it on
// the Plan step must NOT lose a billing email the candidate already typed.
// The billing field is only relevant, validated, and shown for Enterprise —
// there's no need to actively clear it when a different plan is selected.
afterEach(cleanup);

function reachPlanStep() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Lovelace" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Analytical Engines Inc" } });
  fireEvent.change(screen.getByLabelText("Team size"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

test("switching away from Enterprise and back preserves the typed billing email", () => {
  render(<FormWizard />);
  reachPlanStep();

  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));
  fireEvent.change(screen.getByLabelText("Billing contact email"), { target: { value: "billing@example.com" } });

  fireEvent.click(screen.getByRole("radio", { name: "Team" }));
  expect(screen.queryByLabelText("Billing contact email")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));
  expect(screen.getByLabelText("Billing contact email")).toHaveValue("billing@example.com");
});

test("the preserved billing email still advances past validation", () => {
  render(<FormWizard />);
  reachPlanStep();

  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));
  fireEvent.change(screen.getByLabelText("Billing contact email"), { target: { value: "billing@example.com" } });
  fireEvent.click(screen.getByRole("radio", { name: "Starter" }));
  fireEvent.click(screen.getByRole("radio", { name: "Enterprise" }));

  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
});
