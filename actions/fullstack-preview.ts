"use server";

import { requireUser } from "@/server/auth";
import {
  getFullstackPreviewLogsOnServer,
  startFullstackPreviewOnServer,
  stopFullstackPreviewOnServer,
} from "@/server/scenarios/fullstack-preview-service";
import type { FullstackPreviewInfo, FullstackPreviewResult } from "@/lib/scenarios/fullstack-preview";
import type { SnapshotFile } from "@/lib/scenarios/verification";

export async function startFullstackPreview(input: {
  scenarioSlug: string;
  files: SnapshotFile[];
}): Promise<FullstackPreviewResult> {
  if (process.env.NODE_ENV === "production") {
    await requireUser();
  }
  return startFullstackPreviewOnServer(input);
}

export async function stopFullstackPreview(runtimeId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    await requireUser();
  }
  return stopFullstackPreviewOnServer(runtimeId);
}

export async function getFullstackPreviewLogs(runtimeId: string): Promise<FullstackPreviewInfo | null> {
  if (process.env.NODE_ENV === "production") {
    await requireUser();
  }
  return getFullstackPreviewLogsOnServer(runtimeId);
}
