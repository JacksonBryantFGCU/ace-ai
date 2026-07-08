"use client";

import { usePathname } from "next/navigation";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { cn } from "@/lib/utils";

export function InterviewShell({
  name,
  email,
  children,
}: {
  name: string;
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isScenarioPicker = pathname === "/interview/scenario-picker";
  const surface = isScenarioPicker ? "surface-light text-gray-900" : "dark surface-dark text-foreground";

  return (
    <div className={cn("flex min-h-dvh flex-col", surface)}>
      <DashboardNavbar name={name} email={email} variant={isScenarioPicker ? "light" : "dark"} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
