"use server";

import { requireUser } from "@/server/auth";
import { runApiPreviewOnServer } from "@/server/scenarios/api-preview-service";
import type { ApiPreviewRequestConfig, ApiPreviewResult } from "@/lib/scenarios/preview/api";
import type { SnapshotFile } from "@/lib/scenarios/verification";

export async function runApiPreview(input: {
  scenarioSlug: string;
  files: SnapshotFile[];
  request: ApiPreviewRequestConfig;
}): Promise<ApiPreviewResult> {
  if (process.env.NODE_ENV === "production") {
    await requireUser();
  }
  return runApiPreviewOnServer(input);
}
