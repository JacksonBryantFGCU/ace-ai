"use client";

import dynamic from "next/dynamic";

/**
 * Monaco editor wrapper. Loaded with `dynamic(ssr:false)` because Monaco is a
 * browser-only editor — this is the one place it mounts. `language` is a Monaco
 * language id (see `lib/languages`).
 */
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Loading editor…
    </div>
  ),
});

export function CodeEditor({
  language,
  value,
  onChange,
}: {
  language: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <MonacoEditor
      height="100%"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      options={{
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
