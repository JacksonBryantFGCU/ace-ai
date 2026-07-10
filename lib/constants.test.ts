import { describe, expect, it } from "vitest";
import { ROLE_LABELS, ROLE_META, VALID_ROLES, asRole } from "@/lib/constants";

describe("Machine Learning track in role selection (Phase 5)", () => {
  it("includes ml in the role allow-list", () => {
    expect(VALID_ROLES).toContain("ml");
  });

  it("has a setup/role-selection card for Machine Learning", () => {
    const ml = ROLE_META.find((r) => r.id === "ml");
    expect(ml).toBeDefined();
    expect(ml?.label).toContain("Machine Learning");
    expect(ml?.description).toBeTruthy();
  });

  it("exposes a Machine Learning display label", () => {
    expect(ROLE_LABELS.ml).toContain("Machine Learning");
  });

  it("narrows a valid ml role string via asRole", () => {
    expect(asRole("ml")).toBe("ml");
    expect(asRole("not-a-role")).toBeUndefined();
  });
});
