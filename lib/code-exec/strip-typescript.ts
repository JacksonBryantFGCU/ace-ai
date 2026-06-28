/**
 * Lightweight TypeScript → JavaScript type stripper. Ported verbatim from the
 * legacy `useCodeExecution`. Handles the common TS patterns seen in interview
 * code — it is NOT a full compiler, so unusual constructs fall through as
 * runtime errors (surfaced as a failing test, never a crash).
 */
export function stripTypeScript(code: string): string {
  let out = code;

  // Remove `import type` statements
  out = out.replace(/^import\s+type\s+[^;]+;\s*$/gm, "");

  // Remove standalone interface declarations ([^}]* already spans newlines, so
  // no dotAll flag is needed).
  out = out.replace(/\binterface\s+\w+(\s+extends\s+[\w,\s<>]+)?\s*\{[^}]*\}/g, "");

  // Remove type alias declarations: type Foo = ...;
  out = out.replace(/\btype\s+\w+(\s*<[^>]*>)?\s*=\s*[^;]+;/g, "");

  // Remove class access modifiers (private, public, protected, readonly)
  out = out.replace(/\b(private|public|protected|readonly|abstract|override)\s+(?=\w)/g, "");

  // Remove generic type parameters from function/class declarations
  // Only removes <T>, <T, U>, <T extends U> — avoids < in comparisons
  out = out.replace(/<([A-Z][A-Za-z0-9\s,]*(?:\s+extends\s+[A-Za-z0-9<>[\]|&\s,]+)?)>/g, "");

  // Remove return type annotations:  ): ReturnType {  or  ): ReturnType\n
  out = out.replace(/\)\s*:\s*[A-Za-z][A-Za-z0-9<>[\]|&\s,.?]*(?=\s*[{=\n])/g, ")");

  // Remove parameter type annotations:  param: Type  or  param?: Type
  out = out.replace(/(\b\w+)\s*\??\s*:\s*[A-Za-z][A-Za-z0-9<>[\]|&\s,.?]*(?=[,)=\n])/g, "$1");

  // Remove `as Type` assertions
  out = out.replace(/\s+as\s+[A-Za-z][A-Za-z0-9<>[\]|&\s,.?]*(?=[;,)}\n\s])/g, "");

  // Remove non-null assertions: value!.prop → value.prop
  out = out.replace(/(\w)!(?=[.[])/g, "$1");

  return out;
}
