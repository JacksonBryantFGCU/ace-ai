import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Cloud,
  Code,
  Cpu,
  Database,
  Globe,
  Shield,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { ROLE_META, asRole, type EngineerRole } from "@/lib/constants";
import { SetupForm } from "@/components/setup/setup-form";

export const metadata: Metadata = {
  title: "New interview",
};

const ROLE_ICONS: Record<EngineerRole, LucideIcon> = {
  frontend: Globe,
  backend: Database,
  fullstack: Code,
  ml: Brain,
  mobile: Smartphone,
  devops: Cloud,
  security: Shield,
  systems: Cpu,
};

/**
 * Unified "New Interview" workflow (`/new`). Server-first and search-param
 * driven: without a `?role=` it shows role selection; once a role is chosen it
 * shows the configuration form. Submitting the form continues into the live
 * interview. `/roles` and `/setup` are temporary redirect aliases into this page.
 */
export default async function NewInterviewPage(props: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await props.searchParams;
  const selectedRole = asRole(role);

  // Step 2 — configuration for the chosen role.
  if (selectedRole) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 py-2">
        <div className="space-y-1">
          <Link href="/new" className="text-sm text-gray-500 transition-colors hover:text-gray-700">
            ← Back to roles
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configure Your Interview</h1>
        </div>
        <SetupForm initialRole={selectedRole} />
      </div>
    );
  }

  // Step 1 — role selection. Each card hands off to step 2 via the `?role=` param.
  return (
    <div className="mx-auto max-w-6xl py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Explore Software Engineering Roles
        </h1>
        <p className="mt-3 text-lg text-gray-600">Choose a role to start your interview preparation</p>
      </header>

      <ul className="grid gap-6 md:grid-cols-2">
        {ROLE_META.map((roleMeta) => {
          const Icon = ROLE_ICONS[roleMeta.id];
          return (
            <li key={roleMeta.id}>
              <Link
                href={`/new?role=${roleMeta.id}`}
                className="glass-card group flex h-full items-start gap-4 p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <span className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-3 transition-transform group-hover:scale-110">
                  <Icon className="size-6 text-white" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{roleMeta.label}</h2>
                  <p className="mt-1 text-gray-600">{roleMeta.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
