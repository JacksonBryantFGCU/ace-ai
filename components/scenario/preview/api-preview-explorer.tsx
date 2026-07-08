"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Database, Play, RotateCcw } from "lucide-react";
import { runApiPreview } from "@/actions/api-preview";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { ApiPreviewConfig, ApiPreviewExample, ApiPreviewMethod, ApiPreviewResult } from "@/lib/scenarios/preview/api";
import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";

const METHODS: ApiPreviewMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function ApiPreviewExplorer({
  snapshot,
  config,
}: {
  snapshot: PreviewSnapshot;
  config: ApiPreviewConfig;
}) {
  const defaultExample = useMemo(() => {
    return (
      config.examples.find((example) => example.id === config.defaultExampleId) ??
      config.examples[0] ??
      null
    );
  }, [config.defaultExampleId, config.examples]);

  const [exampleId, setExampleId] = useState(defaultExample?.id ?? "");
  const selected = config.examples.find((example) => example.id === exampleId) ?? defaultExample;
  const [method, setMethod] = useState<ApiPreviewMethod>(selected?.method ?? "GET");
  const [path, setPath] = useState(selected?.path ?? "/");
  const [bodyText, setBodyText] = useState(formatBody(selected));
  const [result, setResult] = useState<ApiPreviewResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function chooseExample(id: string) {
    const next = config.examples.find((example) => example.id === id);
    if (!next) return;
    setExampleId(id);
    setMethod(next.method);
    setPath(next.path);
    setBodyText(formatBody(next));
    setResult(null);
  }

  function send() {
    startTransition(async () => {
      const response = await runApiPreview({
        scenarioSlug: snapshot.scenario.id,
        files: snapshot.files.map((file) => ({
          path: file.path,
          content: file.content,
          role: file.role,
        })),
        request: { method, path, bodyText },
      });
      setResult(response);
    });
  }

  function resetDb() {
    setResult(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#10151d] text-gray-100">
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{config.title ?? "API Explorer"}</p>
            <p className="text-[11px] text-gray-500">Fresh SQLite seed on every request</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/10"
            onClick={resetDb}
          >
            <RotateCcw className="size-3.5" />
            Reset DB
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <label className="grid gap-1.5 text-xs text-gray-400">
          Endpoint
          <select
            value={exampleId}
            onChange={(event) => chooseExample(event.target.value)}
            className="h-8 rounded-md border border-white/10 bg-black/30 px-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-blue-400/60"
          >
            {config.examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[6.75rem_1fr] gap-2">
          <label className="grid gap-1.5 text-xs text-gray-400">
            Method
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as ApiPreviewMethod)}
              className={cn(
                "h-8 rounded-md border border-white/10 bg-black/30 px-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-400/60",
                methodTone(method),
              )}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-gray-400">
            Path
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              className="h-8 rounded-md border border-white/10 bg-black/30 px-2 font-mono text-sm text-gray-100 outline-none focus:ring-2 focus:ring-blue-400/60"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-xs text-gray-400">
          JSON body
          <textarea
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            spellCheck={false}
            rows={7}
            className="api-preview-scrollbar min-h-28 resize-y rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs leading-relaxed text-gray-100 outline-none focus:ring-2 focus:ring-blue-400/60"
            placeholder={method === "GET" || method === "DELETE" ? "No body for this example" : '{\n  "title": "..." \n}'}
          />
        </label>

        <Button type="button" variant="brand" onClick={send} disabled={isPending}>
          <Play className="size-4" />
          {isPending ? "Sending..." : "Send request"}
        </Button>

        <div className="rounded-md border border-white/10 bg-black/25">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Response</span>
            {result?.ok ? (
              <>
                <StatusBadge tone={result.response.status >= 400 ? "danger" : "success"}>
                  {result.response.status}
                </StatusBadge>
                <span className="ml-auto text-xs text-gray-500">{result.durationMs} ms</span>
              </>
            ) : result ? (
              <>
                <StatusBadge tone="danger">Error</StatusBadge>
                <span className="ml-auto text-xs text-gray-500">{result.durationMs} ms</span>
              </>
            ) : (
              <span className="ml-auto text-xs text-gray-600">No request sent</span>
            )}
          </div>

          {result ? (
            result.ok ? (
              <div className="grid min-w-0 gap-3 p-3">
                <section className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Body
                  </p>
                  <pre
                    data-testid="api-preview-response-body"
                    className="api-preview-scrollbar max-h-72 max-w-full overflow-y-auto overflow-x-hidden rounded-md bg-black/35 p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-200 break-words [overflow-wrap:anywhere]"
                  >
                    {formatResponseBody(result.response.body, result.response.text)}
                  </pre>
                </section>
                <section className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Headers
                  </p>
                  <HeaderList headers={result.response.headers} />
                </section>
              </div>
            ) : (
              <div className="grid gap-2 p-3">
                <div className="flex gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-2 text-sm text-red-100">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" />
                  <div>
                    <p className="font-medium">{result.error.message}</p>
                    <p className="mt-1 text-xs text-red-200/70">{result.error.kind}</p>
                  </div>
                </div>
                {result.error.details ? (
                  <details className="rounded-md bg-black/35 p-2 text-xs text-gray-300">
                    <summary className="cursor-pointer text-gray-400">Details</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-mono">{result.error.details}</pre>
                  </details>
                ) : null}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-gray-500">
              <Database className="size-5" />
              Choose an example and send a request.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBody(example: ApiPreviewExample | null | undefined): string {
  if (!example || example.body === undefined) return "";
  return JSON.stringify(example.body, null, 2);
}

function formatResponseBody(body: unknown, text: string): string {
  if (body === "" && text === "") return "(empty)";
  if (typeof body === "string") return body;
  return JSON.stringify(body, null, 2);
}

function HeaderList({ headers }: { headers: Record<string, string | string[]> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return (
      <div className="rounded-md bg-black/35 p-2 font-mono text-xs text-gray-500">
        (none)
      </div>
    );
  }

  return (
    <dl
      data-testid="api-preview-response-headers"
      className="api-preview-scrollbar max-h-40 max-w-full overflow-y-auto overflow-x-hidden rounded-md bg-black/35 p-2 font-mono text-xs leading-relaxed text-gray-300"
    >
      {entries.map(([key, value]) => (
        <div key={key} className="grid min-w-0 gap-0.5 border-b border-white/5 py-1.5 last:border-b-0 first:pt-0 last:pb-0">
          <dt className="min-w-0 text-[11px] font-semibold text-gray-500 break-words [overflow-wrap:anywhere]">
            {key}
          </dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {Array.isArray(value) ? value.join(", ") : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function methodTone(method: ApiPreviewMethod): string {
  if (method === "GET") return "text-sky-300";
  if (method === "POST") return "text-emerald-300";
  if (method === "DELETE") return "text-red-300";
  return "text-amber-300";
}
