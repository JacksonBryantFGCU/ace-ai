import { ScenarioWorkspaceSkeleton } from "@/components/scenario/ui/workspace-skeleton";

/** Shown while the route loads the scenario for the interview. */
export default function TechnicalInterviewLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScenarioWorkspaceSkeleton />
    </div>
  );
}
