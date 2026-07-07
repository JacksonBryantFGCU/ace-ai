import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ShieldCheck, ListChecks, FolderTree, Play } from "lucide-react";

/** The detail-view tabs of the Authoring Studio. */
export type StudioTab = "dashboard" | "validation" | "steps" | "workspace" | "preview";

export const STUDIO_TABS: { id: StudioTab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "validation", label: "Validation", icon: ShieldCheck },
  { id: "steps", label: "Steps", icon: ListChecks },
  { id: "workspace", label: "Workspace", icon: FolderTree },
  { id: "preview", label: "Preview", icon: Play },
];
