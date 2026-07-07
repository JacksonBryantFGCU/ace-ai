"use client";

import { useEffect, useRef } from "react";
import { mountPreview, unmountPreview } from "@/lib/scenarios/preview/renderers/component/mount";
import type {
  HostToSandboxMessage,
  SandboxToHostMessage,
} from "@/lib/scenarios/preview/renderers/component/protocol";

/**
 * The sandboxed preview host (docs/README.md
 * §2-3, §13-15). Loaded ONLY inside `<iframe sandbox="allow-scripts">` (no
 * `allow-same-origin`), so it has an opaque origin: no cookies, no
 * localStorage, no access to the parent's DOM. This is the ONLY place
 * candidate + authored preview code actually executes; it reports back
 * exclusively through `postMessage`.
 *
 * Not gated by NODE_ENV or auth: it does no data fetching and holds no
 * secrets (`Preview.tsx`/`providers.tsx` source is candidate-facing by
 * design, architecture doc §5/§14), unlike the dev-only `/playground`.
 */
export default function PreviewSandboxPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function post(message: SandboxToHostMessage) {
      window.parent.postMessage(message, "*");
    }

    let currentRequestId: number | null = null;

    function reportStrayError(message: string, stack?: string) {
      // Errors from event handlers/effects/timers don't reach the React
      // error boundary in mount.ts — this is the fallback so nothing here
      // fails silently.
      if (currentRequestId === null) return;
      post({ type: "render-error", requestId: currentRequestId, phase: "runtime", message, stack });
    }

    function handleWindowError(event: ErrorEvent) {
      reportStrayError(event.message, event.error?.stack);
    }
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as unknown;
      reportStrayError(
        reason instanceof Error ? reason.message : String(reason),
        reason instanceof Error ? reason.stack : undefined,
      );
    }
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleRejection);

    function onMessage(event: MessageEvent) {
      // Only the embedding parent can drive this sandbox.
      if (event.source !== window.parent) return;
      const data = event.data as HostToSandboxMessage;
      if (!data || data.type !== "render") return;

      const requestId = data.requestId;
      currentRequestId = requestId;
      // Reset Preview: tear down the existing root first so candidate-owned
      // component state doesn't survive into the fresh mount, instead of the
      // usual in-place update. Candidate files and interview state are
      // untouched — this only affects what's inside the iframe.
      if (data.reset) unmountPreview(container!);
      void mountPreview(
        container!,
        {
          files: data.files,
          entryPath: data.entryPath,
          previewSource: data.previewSource,
          providersSource: data.providersSource,
          css: data.css,
          storyProps: data.storyProps,
          theme: data.theme,
        },
        {
          onRendered: () => post({ type: "rendered", requestId }),
          onError: (error) => post({ type: "render-error", requestId, ...error }),
        },
      );
    }
    window.addEventListener("message", onMessage);

    post({ type: "sandbox-ready" });

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleRejection);
      unmountPreview(container);
    };
  }, []);

  return <div ref={containerRef} className="preview-canvas" />;
}
