const PERF_DEBUG_ENABLED = process.env.ACE_PERF_DEBUG === "1";

function formatDetails(details: Record<string, unknown> | undefined): string {
  if (!details) return "";
  const entries = Object.entries(details).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return "";
  return ` ${entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(" ")}`;
}

export function perfEnabled(): boolean {
  return PERF_DEBUG_ENABLED;
}

export function logPerf(label: string, durationMs: number, details?: Record<string, unknown>): void {
  if (!PERF_DEBUG_ENABLED) return;
  console.info(`[ace-perf] ${label} ${Math.round(durationMs)}ms${formatDetails(details)}`);
}

export async function timePerf<T>(
  label: string,
  fn: () => Promise<T>,
  details?: Record<string, unknown>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    logPerf(label, Date.now() - startedAt, details);
  }
}

export function startPerfSpan(label: string, details?: Record<string, unknown>): () => void {
  const startedAt = Date.now();
  return () => logPerf(label, Date.now() - startedAt, details);
}
