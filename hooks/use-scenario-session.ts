"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import * as session from "@/lib/scenarios/session";
import type {
  CheckpointFile,
  ServedWorkspaceFile,
  SessionResult,
  WorkspaceSession,
} from "@/lib/scenarios/types";

/**
 * React binding for the pure workspace-session model. Holds the session in
 * `useState`, mirrors it in a ref so event handlers can read the latest value
 * without stale closures, and surfaces the last failed mutation as `error`.
 *
 * The fallible actions (create/rename/remove) return `true` on success so the UI
 * can, e.g., close an inline rename input only when the change actually applied.
 */
export function useScenarioSession(seed: ServedWorkspaceFile[], entry: string) {
  const [state, setState] = useState<WorkspaceSession>(() => session.initSession(seed, entry));
  const ref = useRef(state);
  const seedRef = useRef(seed);
  const entryRef = useRef(entry);
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback((next: WorkspaceSession) => {
    ref.current = next;
    setState(next);
  }, []);

  const runFallible = useCallback(
    (run: (s: WorkspaceSession) => SessionResult): boolean => {
      const result = run(ref.current);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setError(null);
      commit(result.session);
      return true;
    },
    [commit],
  );

  const edit = useCallback(
    (id: string, content: string) => commit(session.editFile(ref.current, id, content)),
    [commit],
  );
  const open = useCallback((id: string) => commit(session.openFile(ref.current, id)), [commit]);
  const close = useCallback((id: string) => commit(session.closeTab(ref.current, id)), [commit]);

  const create = useCallback(
    (path: string) => runFallible((s) => session.createFile(s, path)),
    [runFallible],
  );
  const rename = useCallback(
    (id: string, path: string) => runFallible((s) => session.renameFile(s, id, path)),
    [runFallible],
  );
  const remove = useCallback(
    (id: string) => runFallible((s) => session.deleteFile(s, id)),
    [runFallible],
  );

  const applyCheckpoint = useCallback((files: CheckpointFile[]) => {
    setError(null);
    commit(session.applyCheckpoint(seedRef.current, entryRef.current, files));
  }, [commit]);

  const clearError = useCallback(() => setError(null), []);
  const active = useMemo(() => session.activeFile(state), [state]);

  return {
    session: state,
    active,
    error,
    edit,
    open,
    close,
    create,
    rename,
    remove,
    applyCheckpoint,
    clearError,
  };
}

export type ScenarioSessionApi = ReturnType<typeof useScenarioSession>;
