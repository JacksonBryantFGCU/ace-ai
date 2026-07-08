"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Info, Loader2, Monitor, ScrollText } from "lucide-react";
import {
  getFullstackPreviewLogs,
  startFullstackPreview,
  stopFullstackPreview,
} from "@/actions/fullstack-preview";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { FullstackPreviewInfo } from "@/lib/scenarios/fullstack-preview";
import type { SnapshotFile } from "@/lib/scenarios/verification";

type Tab = "app" | "api" | "logs";

export function FullstackPreviewFrame({
  scenarioSlug,
  files,
}: {
  scenarioSlug: string;
  files: SnapshotFile[];
}) {
  const [preview, setPreview] = useState<FullstackPreviewInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("app");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    let runtimeId: string | null = null;

    startTransition(async () => {
      const result = await startFullstackPreview({ scenarioSlug, files });
      if (!active) {
        if (result.ok) await stopFullstackPreview(result.preview.runtimeId);
        return;
      }
      if (result.ok) {
        runtimeId = result.preview.runtimeId;
        setPreview(result.preview);
      } else {
        setError(result.error.stage ? `${result.error.stage}: ${result.error.message}` : result.error.message);
      }
    });

    return () => {
      active = false;
      if (runtimeId) void stopFullstackPreview(runtimeId);
    };
  }, [scenarioSlug, files]);

  function refreshLogs() {
    if (!preview) return;
    startTransition(async () => {
      const next = await getFullstackPreviewLogs(preview.runtimeId);
      if (next) setPreview(next);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#10151d] text-gray-100">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Fullstack Preview</p>
          <p className="truncate text-[11px] text-gray-500">
            {preview ? preview.previewUrl : "Starting frontend and backend runtime..."}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <StatusBadge tone={preview ? "success" : error ? "danger" : "neutral"}>
            {preview ? "Live" : error ? "Error" : "Starting"}
          </StatusBadge>
          {preview ? (
            <a
              href={preview.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10"
              aria-label="Open app preview in a new tab"
            >
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex border-b border-white/10 px-2 py-1.5">
        <TabButton active={tab === "app"} onClick={() => setTab("app")} icon={<Monitor className="size-3.5" />}>
          App Preview
        </TabButton>
        <TabButton active={tab === "api"} onClick={() => setTab("api")} icon={<Info className="size-3.5" />}>
          API Info
        </TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")} icon={<ScrollText className="size-3.5" />}>
          Logs
        </TabButton>
      </div>

      <div className="min-h-0 flex-1">
        {error ? (
          <div role="alert" className="m-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" />
              <p>{error}</p>
            </div>
          </div>
        ) : !preview || pending ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <Loader2 className="size-5 animate-spin" />
            Starting fullstack runtime...
          </div>
        ) : tab === "app" ? (
          <iframe
            title="Fullstack app preview"
            src={preview.previewUrl}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          />
        ) : tab === "api" ? (
          <ApiInfo preview={preview} />
        ) : (
          <Logs preview={preview} onRefresh={refreshLogs} pending={pending} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-gray-100",
        active && "bg-white/10 text-white",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ApiInfo({ preview }: { preview: FullstackPreviewInfo }) {
  return (
    <div className="grid gap-3 p-3 text-sm">
      <InfoRow label="Preview URL" value={preview.previewUrl} />
      <InfoRow label="API Base URL" value={preview.backendUrl} />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-gray-500">Frontend</p>
          <StatusBadge tone="success">{preview.frontendStatus}</StatusBadge>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-gray-500">Backend</p>
          <StatusBadge tone="success">{preview.backendStatus}</StatusBadge>
        </div>
      </div>
      <p className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-100">
        The frontend receives this API URL through <code>VITE_API_BASE_URL</code> and calls the real backend runtime.
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-gray-200">{value}</p>
    </div>
  );
}

function Logs({
  preview,
  onRefresh,
  pending,
}: {
  preview: FullstackPreviewInfo;
  onRefresh: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Runtime logs</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/10"
          onClick={onRefresh}
          disabled={pending}
        >
          Refresh
        </Button>
      </div>
      <div className="api-preview-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg bg-black/35 p-2 font-mono text-xs text-gray-300">
        {preview.logs.length === 0 ? (
          <p className="text-gray-500">No logs yet.</p>
        ) : (
          preview.logs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="border-b border-white/5 py-1 last:border-b-0">
              <span className="text-gray-500">{log.timestamp}</span>{" "}
              <span className={log.source === "backend" ? "text-emerald-300" : "text-sky-300"}>{log.source}</span>{" "}
              <span className="text-gray-500">{log.stream}</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-words text-gray-300">{log.message.trim()}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
