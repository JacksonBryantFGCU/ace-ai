"use server";

import { revalidateTag } from "next/cache";
import { requireUser } from "@/server/auth";
import { createAdminClient } from "@/server/db/admin";
import { roleSchema } from "@/lib/validation/interview";

export type UpdateRoleResult = { ok: true } | { ok: false; error: string };

/**
 * Set the authenticated user's engineering role. Validates against the role
 * allow-list, writes via the admin client (scoped to the user's own row), and
 * revalidates the profile cache.
 */
export async function updateRole(role: string): Promise<UpdateRoleResult> {
  const user = await requireUser();

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) {
    return { ok: false, error: "Invalid role" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: parsed.data }).eq("id", user.id);

  if (error) {
    console.error("updateRole failed:", error.message);
    return { ok: false, error: "Failed to update role" };
  }

  revalidateTag(`profile:${user.id}`, "max");
  return { ok: true };
}
