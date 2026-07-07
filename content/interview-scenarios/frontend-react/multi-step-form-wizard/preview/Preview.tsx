import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.FormWizard;

type Mode = "default" | "empty" | "large-dataset";

// "default"/"mobile" render the ACTUAL live candidate code — only the
// Account step exists so far, with empty fields. The Workspace/Plan/Review
// steps and their navigation don't exist yet, so "empty"/"large-dataset"
// illustrate the target Review step (the scenario's final step) in its two
// edge conditions: nothing filled in yet, and everything filled in. This is
// self-contained, deterministic, read-only mock UI, not the candidate's code.
const FILLED = {
  fullName: "Priya Nair",
  email: "priya@northwind.dev",
  companyName: "Northwind Robotics",
  teamSize: "12",
  planType: "team",
  billingEmail: "billing@northwind.dev",
};

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeReviewStep values={mode === "large-dataset" ? FILLED : undefined} />
      )}
    </Frame>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: value ? 500 : 400, color: value ? "inherit" : "#9ca3af" }}>{value ?? "—"}</span>
    </div>
  );
}

function IllustrativeReviewStep({ values }: { values?: typeof FILLED }) {
  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, fontSize: 12, color: "#9ca3af" }}>
        <span>Account</span>→<span>Workspace</span>→<span>Plan</span>→<strong style={{ color: "inherit" }}>Review</strong>
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Review your details</h2>
      <Row label="Full name" value={values?.fullName} />
      <Row label="Email" value={values?.email} />
      <Row label="Company" value={values?.companyName} />
      <Row label="Team size" value={values?.teamSize} />
      <Row label="Plan" value={values?.planType} />
      <Row label="Billing email" value={values?.billingEmail} />
      {!values ? (
        <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 12 }}>
          Nothing filled in yet — complete the earlier steps to continue.
        </p>
      ) : null}
    </div>
  );
}
