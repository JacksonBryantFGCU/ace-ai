import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asRole } from "@/lib/constants";
import { SetupForm } from "@/components/setup/setup-form";

export const metadata: Metadata = {
  title: "New interview",
};

/**
 * Step 2 of the Practice flow: interview configuration. The role is chosen in
 * step 1 (`/roles`) and arrives via the `?role=` query param — role selection is
 * intentionally **not** part of this page. Without a valid role we send the user
 * back to role selection. Submitting writes the draft cookie and routes to the
 * interview.
 */
export default async function SetupPage(props: PageProps<"/setup">) {
  const { role } = await props.searchParams;
  const selectedRole = asRole(typeof role === "string" ? role : undefined);
  if (!selectedRole) redirect("/roles");

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      <div className="space-y-1">
        <Link href="/roles" className="text-sm text-gray-500 transition-colors hover:text-gray-700">
          ← Back to roles
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configure Your Interview</h1>
      </div>
      <SetupForm initialRole={selectedRole} />
    </div>
  );
}
