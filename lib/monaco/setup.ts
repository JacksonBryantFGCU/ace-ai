import type { Monaco } from "@monaco-editor/react";
import { MONACO_LIBS } from "@/lib/monaco/generated-libs";

/**
 * Central Monaco language-service setup. Gives the TypeScript worker the same
 * inputs `tsc` has — a virtual `node_modules` of real type declarations and
 * proper compiler options — instead of suppressing diagnostics.
 *
 * Result: `.tsx` gets a real JSX-aware service, `react` / `react/jsx-runtime`
 * resolve (no 2875), React IntelliSense/hover/go-to-definition work, and genuine
 * semantic errors are still reported. Runs on the shared global Monaco; the extra
 * libs are registered once.
 *
 * Cross-file resolution between workspace files is handled separately by
 * registering each file as a Monaco model (see `workspace-editor.tsx`).
 */

let extraLibsInstalled = false;

export function configureLanguageDefaults(monaco: Monaco): void {
  const ts = monaco.languages.typescript;

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: "react",
    esModuleInterop: true,
    allowJs: true,
    allowNonTsExtensions: true,
    skipLibCheck: true,
    strict: true,
    // Editing separate files that aren't a formal project — don't force a root
    // that flags "not under rootDir", and don't error on isolated modules.
    forceConsistentCasingInFileNames: false,
  } as const;

  for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
    defaults.setCompilerOptions(compilerOptions);
    // NO diagnosticCodesToIgnore — real errors stay visible now that the types resolve.
    defaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
    defaults.setEagerModelSync(true);
  }

  if (!extraLibsInstalled) {
    extraLibsInstalled = true;
    for (const lib of MONACO_LIBS) {
      const uri = `file:///${lib.path}`;
      ts.typescriptDefaults.addExtraLib(lib.content, uri);
      ts.javascriptDefaults.addExtraLib(lib.content, uri);
    }
  }
}
