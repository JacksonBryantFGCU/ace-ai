import type { FullstackRuntimeLog } from "@/lib/scenarios/fullstack-runtime";

export interface FullstackPreviewInfo {
  mode: "fullstack";
  runtimeId: string;
  frontendUrl: string;
  backendUrl: string;
  previewUrl: string;
  frontendStatus: "healthy";
  backendStatus: "healthy";
  logs: FullstackRuntimeLog[];
}

export type FullstackPreviewResult =
  | { ok: true; preview: FullstackPreviewInfo }
  | { ok: false; error: { message: string; stage?: string; logs?: FullstackRuntimeLog[] } };
