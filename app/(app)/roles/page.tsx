import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Cloud, Code, Cpu, Database, Globe, Shield, Smartphone, type LucideIcon } from "lucide-react";
import { ROLE_META, type EngineerRole } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Choose a role",
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
 * Step 1 of the setup flow: role selection (recreated from the legacy
 * `RoleSelection`). Pure Server Component — each glass card links to step 2 via
 * the `?role=` query param (a server-safe handoff).
 */
export default function RolesPage() {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Explore Software Engineering Roles
        </h1>
        <p className="mt-3 text-lg text-gray-600">Choose a role to start your interview preparation</p>
      </header>

      <ul className="grid gap-6 md:grid-cols-2">
        {ROLE_META.map((role) => {
          const Icon = ROLE_ICONS[role.id];
          return (
            <li key={role.id}>
              <Link
                href={`/setup?role=${role.id}`}
                className="glass-card group flex h-full items-start gap-4 p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <span className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-3 transition-transform group-hover:scale-110">
                  <Icon className="size-6 text-white" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{role.label}</h2>
                  <p className="mt-1 text-gray-600">{role.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
