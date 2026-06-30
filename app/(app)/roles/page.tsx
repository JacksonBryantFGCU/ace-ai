import { redirect } from "next/navigation";

/**
 * Temporary redirect alias. The role-selection step now lives in the unified
 * `/new` workflow; kept here so existing links/bookmarks to `/roles` keep working
 * during the transition.
 */
export default function RolesRedirect() {
  redirect("/new");
}
