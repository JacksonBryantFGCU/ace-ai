import type { FormData } from "./types";

export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value.trim());
}

export function validateAccountStep(data: FormData): string | null {
  if (!isRequired(data.fullName)) return "Full name is required.";
  if (!isValidEmail(data.email)) return "Enter a valid email address.";
  return null;
}

export function validateWorkspaceStep(data: FormData): string | null {
  if (!isRequired(data.companyName)) return "Company name is required.";
  if (!isPositiveInteger(data.teamSize)) return "Team size must be a positive number.";
  return null;
}

// The Enterprise plan requires a billing contact, and that contact can't just
// be a copy of the account email from the Account step — a genuine
// cross-field, cross-step dependency.
export function validatePlanStep(data: FormData): string | null {
  if (!isRequired(data.planType)) return "Choose a plan to continue.";
  if (data.planType === "enterprise") {
    if (!isValidEmail(data.billingEmail)) return "Enterprise plans need a valid billing contact email.";
    if (data.billingEmail.trim().toLowerCase() === data.email.trim().toLowerCase()) {
      return "Billing contact email must be different from the account email.";
    }
  }
  return null;
}
