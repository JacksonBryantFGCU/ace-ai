import { Component, useEffect, type ReactNode } from "react";

/**
 * Runtime-owned error boundary (never authored) wrapping the mounted
 * `Preview.tsx` output — a candidate component that throws during render
 * reports through `onError` instead of taking down the sandbox page
 * (docs/README.md). Callers force a fresh
 * instance per render attempt (a changing `key`, see `mount.ts`) so a fixed
 * component can render again instead of staying stuck in the caught state.
 */
export class PreviewErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void; onRendered: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return <MountSignal onRendered={this.props.onRendered}>{this.props.children}</MountSignal>;
  }
}

/** Fires `onRendered` once, the first time this specific instance mounts —
 *  i.e. once per render attempt, not on every internal re-render the
 *  candidate's own component causes afterward. */
function MountSignal({ children, onRendered }: { children: ReactNode; onRendered: () => void }) {
  useEffect(() => {
    onRendered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}
