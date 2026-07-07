import { useState } from "react";
import type { FormData } from "./types";

const DEFAULT_FORM_DATA: FormData = {
  fullName: "",
  email: "",
  companyName: "",
  teamSize: "",
  planType: "",
  billingEmail: "",
};

// A four-step onboarding wizard: Account, Workspace, Plan, Review. Only the
// Account step renders so far — there's no second step, no navigation, and
// no validation yet.
//
// TODO (Step 1): add the Workspace step and Next/Back navigation between it
// and Account, blocking Next until the current step passes validation (see
// `validation.ts`).
export function FormWizard() {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h2>Account</h2>
      <label>
        Full name
        <input
          value={formData.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          aria-label="Full name"
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          aria-label="Email"
        />
      </label>
    </div>
  );
}
