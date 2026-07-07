"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PreviewSnapshot } from "@/lib/scenarios/preview/snapshot";
import {
  toRenderRequest,
  type SandboxToHostMessage,
} from "@/lib/scenarios/preview/renderers/component/protocol";
import type { ServedPreviewBundle } from "@/lib/scenarios/preview/types";
import { PreviewToolbar, type PreviewTheme } from "@/components/scenario/preview/preview-toolbar";
import {
  PreviewDisconnected,
  PreviewErrorCard,
  PreviewLoading,
  previewCardClass,
  previewStageClass,
} from "@/components/scenario/preview/preview-chrome";

const SANDBOX_SRC = "/preview-sandbox";
const DEBOUNCE_MS = 300;
/** How long to wait for a sandbox response (initial `sandbox-ready`, or a
 *  reply to a render request) before treating the iframe as disconnected. */
const RESPONSE_TIMEOUT_MS = 8000;

/**
 * `allow-scripts` only (no `allow-same-origin`) gives the sandbox an OPAQUE
 * origin — required in production so candidate code can never read the
 * app's cookies/localStorage/DOM (docs §14, P5). But `next dev`'s own
 * anti-DNS-rebinding guard (`blockCrossSiteDEV`) rejects every `/_next/
 * static/*` chunk request whose `Origin` header is `null`, which an opaque
 * origin always sends — so in dev, NOTHING in the sandbox can load at all,
 * and it never reaches `sandbox-ready` (surfaces as "Preview disconnected").
 * That check only exists in `next dev`; `next start`/production never runs
 * it, so real candidate interviews are unaffected either way. Adding
 * `allow-same-origin` in dev only gives the iframe a real, matching origin
 * (satisfying that dev-only check) with no production security change —
 * it's the local author's own machine and own authored content on both
 * sides of the frame in dev, so there's no isolation boundary being crossed.
 */
export function sandboxAttrsFor(nodeEnv: string | undefined): string {
  return nodeEnv === "production" ? "allow-scripts" : "allow-scripts allow-same-origin";
}

type FrameStatus = "connecting" | "compiling" | "ready" | "compile-error" | "runtime-error" | "disconnected";

interface FrameError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
}


/**
 * The parent-side owner of the sandboxed preview iframe
 * (docs/README.md). Owns the
 * snapshot, the iframe's lifecycle, the postMessage channel, and (Phase 3)
 * the story/viewport/theme/reset controls. It never imports the
 * compile/link/render pipeline (`renderers/component/mount.tsx`); candidate
 * code only ever executes inside the sandboxed document this component
 * embeds.
 */
export function ComponentPreviewFrame({
  snapshot,
  bundle,
}: {
  snapshot: PreviewSnapshot;
  bundle: ServedPreviewBundle;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sandboxReadyRef = useRef(false);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<PreviewSnapshot>(snapshot);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedStoryRef = useRef(false);

  const [status, setStatus] = useState<FrameStatus>("connecting");
  const [error, setError] = useState<FrameError | null>(null);
  const [iframeGeneration, setIframeGeneration] = useState(0);

  const defaultStoryId = bundle.config.defaultStoryId ?? bundle.stories[0]?.id ?? "default";
  const [activeStoryId, setActiveStoryId] = useState(defaultStoryId);
  const [themeOverride, setThemeOverride] = useState<PreviewTheme>("light");

  const activeStory = useMemo(
    () => bundle.stories.find((s) => s.id === activeStoryId) ?? bundle.stories[0],
    [bundle.stories, activeStoryId],
  );

  const pinnedTheme = activeStory?.theme;
  const effectiveTheme = pinnedTheme ?? themeOverride;

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }, []);

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => setStatus("disconnected"), RESPONSE_TIMEOUT_MS);
  }, [clearWatchdog]);

  const send = useCallback(
    (snap: PreviewSnapshot, options: { reset?: boolean } = {}) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      requestIdRef.current += 1;
      const message = toRenderRequest(requestIdRef.current, snap, bundle.source.preview ?? "", bundle.source.providers, {
        css: bundle.source.css,
        storyProps: activeStory?.props,
        theme: effectiveTheme,
        reset: options.reset,
      });
      iframe.contentWindow.postMessage(message, "*");
      setStatus("compiling");
      setError(null);
      armWatchdog();
    },
    [bundle.source.preview, bundle.source.providers, bundle.source.css, activeStory, effectiveTheme, armWatchdog],
  );

  // Sandbox lifecycle + render responses.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as SandboxToHostMessage;
      if (!data || typeof data !== "object") return;

      if (data.type === "sandbox-ready") {
        sandboxReadyRef.current = true;
        clearWatchdog();
        send(pendingRef.current);
        return;
      }
      if (data.requestId !== requestIdRef.current) return; // stale response, ignore
      clearWatchdog();
      if (data.type === "rendered") {
        setStatus("ready");
        setError(null);
      } else if (data.type === "render-error") {
        setStatus(data.phase === "compile" ? "compile-error" : "runtime-error");
        setError({ message: data.message, file: data.file, line: data.line, column: data.column });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send, clearWatchdog]);

  // Candidate edits: debounced re-render whenever the snapshot changes — never
  // per keystroke, and never triggered by an unrelated re-render that hands
  // back the SAME snapshot identity (e.g. switching editor tabs, which
  // `PreviewPanel` deliberately excludes from the snapshot's dependencies).
  useEffect(() => {
    pendingRef.current = snapshot;
    if (!sandboxReadyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => send(snapshot), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [snapshot, send]);

  // Story/theme changes: rerender immediately, never debounced — only the
  // props/theme handed to Preview.tsx change, candidate files are untouched.
  useEffect(() => {
    if (!mountedStoryRef.current) {
      mountedStoryRef.current = true;
      return;
    }
    if (!sandboxReadyRef.current) return;
    send(pendingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryId, effectiveTheme]);

  // Connecting watchdog: catches a sandbox that never announces ready (or
  // never recovers after a reload).
  useEffect(() => {
    armWatchdog();
    return clearWatchdog;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeGeneration]);

  const handleReset = useCallback(() => {
    if (!sandboxReadyRef.current) return;
    send(pendingRef.current, { reset: true });
  }, [send]);

  const handleReload = useCallback(() => {
    sandboxReadyRef.current = false;
    setStatus("connecting");
    setError(null);
    setIframeGeneration((g) => g + 1);
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <PreviewToolbar
        stories={bundle.stories}
        activeStoryId={activeStory?.id ?? activeStoryId}
        onStoryChange={setActiveStoryId}
        theme={effectiveTheme}
        onThemeChange={setThemeOverride}
        themePinned={pinnedTheme !== undefined}
        onReset={handleReset}
      />
      <div className={previewStageClass}>
        <div className={previewCardClass}>
          <iframe
            key={iframeGeneration}
            ref={iframeRef}
            src={SANDBOX_SRC}
            sandbox={sandboxAttrsFor(process.env.NODE_ENV)}
            title="Component preview"
            className="h-full w-full border-0 bg-[var(--preview-canvas)]"
          />
        </div>

        {status === "connecting" ? <PreviewLoading label="Loading preview…" /> : null}
        {status === "compiling" ? <PreviewLoading label="Compiling…" /> : null}
        {status === "disconnected" ? <PreviewDisconnected onReload={handleReload} /> : null}
        {(status === "compile-error" || status === "runtime-error") && error ? (
          <PreviewErrorCard kind={status} error={error} />
        ) : null}
      </div>
    </div>
  );
}
