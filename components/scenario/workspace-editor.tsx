"use client";

import { useEffect, useId, useRef } from "react";
import dynamic from "next/dynamic";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import { FileCode2 } from "lucide-react";
import { configureLanguageDefaults } from "@/lib/monaco/setup";
import { monacoLanguage } from "@/lib/scenarios/file-language";
import { EditorSkeleton } from "@/components/scenario/ui/editor-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { SessionFile } from "@/lib/scenarios/types";

/**
 * Workspace-aware Monaco editor. Beyond editing the active file, it mirrors the
 * whole session into Monaco **models** (one per file, namespaced per editor
 * instance) so imports between workspace files resolve and cross-file
 * go-to-definition / rename work — a real IDE, not a single-file textbox.
 *
 * React/JSX resolution + the virtual `node_modules` come from
 * `configureLanguageDefaults` (shared). The active file is driven by the editor's
 * `path`/`value`; sibling models are created/updated/disposed here.
 */

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export function WorkspaceEditor({
  files,
  activeFile,
  onEdit,
}: {
  files: SessionFile[];
  activeFile: SessionFile | null;
  onEdit: (id: string, content: string) => void;
}) {
  // Per-instance namespace so models never collide across scenarios / restarts.
  const ns = useId().replace(/[^a-z0-9]/gi, "");
  const monacoRef = useRef<typeof MonacoNS | null>(null);

  const uriString = (path: string) => `file:///${ns}/${path}`;

  const syncModels = (monaco: typeof MonacoNS) => {
    const activeKey = activeFile ? uriString(activeFile.path) : null;
    const wanted = new Set(files.map((f) => uriString(f.path)));

    for (const file of files) {
      const uri = monaco.Uri.parse(uriString(file.path));
      const model = monaco.editor.getModel(uri);
      if (!model) {
        monaco.editor.createModel(file.content, monacoLanguage(file.path), uri);
      } else if (uri.toString() !== activeKey && model.getValue() !== file.content) {
        // Reflect out-of-band changes (checkpoint, rename) into non-active models.
        model.setValue(file.content);
      }
    }

    // Dispose this instance's models that no longer back a file. Never touch the
    // shared virtual node_modules (extra libs) or other instances' models.
    const prefix = `file:///${ns}/`;
    for (const model of monaco.editor.getModels()) {
      const key = model.uri.toString();
      if (key.startsWith(prefix) && !wanted.has(key)) model.dispose();
    }
  };

  // Sync on every file/active change once Monaco is available.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) syncModels(monaco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, activeFile, ns]);

  // Dispose this instance's models on unmount.
  useEffect(() => {
    return () => {
      const monaco = monacoRef.current;
      if (!monaco) return;
      const prefix = `file:///${ns}/`;
      for (const model of monaco.editor.getModels()) {
        if (model.uri.toString().startsWith(prefix)) model.dispose();
      }
    };
  }, [ns]);

  const handleBeforeMount: BeforeMount = (monaco) => configureLanguageDefaults(monaco);

  const handleMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco as unknown as typeof MonacoNS;
    syncModels(monaco as unknown as typeof MonacoNS);
  };

  if (!activeFile) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No file open"
        description="Choose a file from the sidebar to start editing."
      />
    );
  }

  return (
    <MonacoEditor
      height="100%"
      theme="vs-dark"
      keepCurrentModel
      path={uriString(activeFile.path)}
      language={monacoLanguage(activeFile.path)}
      value={activeFile.content}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(v) => onEdit(activeFile.id, v ?? "")}
      options={{
        readOnly: activeFile.role === "readonly",
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        smoothScrolling: true,
      }}
    />
  );
}
