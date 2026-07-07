/**
 * Ambient declaration for the Preview Runtime's virtual module specifier
 * (docs/README.md) — an authored
 * `preview/Preview.tsx` imports the candidate's live entry through
 * `"scenario:entry"`. It resolves only inside the sandboxed renderer's own
 * module linker (`lib/scenarios/preview/renderers/component/mount.tsx`); this
 * file exists purely so `tsc` can typecheck authored preview content under
 * `content/interview-scenarios`, which the project's normal TSX typecheck
 * already covers.
 */
declare module "scenario:entry" {
  import type { ComponentType } from "react";

  // The real export name varies per scenario (every workspace entry exports
  // a named component matching its file, e.g. `export function TodoApp()`,
  // never a default export) — authored `Preview.tsx` files import it by
  // that name, e.g. `import { TodoApp as CandidateEntry } from "scenario:entry"`.
  // The index signature lets `tsc` accept any such name without this
  // declaration needing to enumerate every scenario's component name.
  interface ScenarioEntryModule {
    [exportName: string]: ComponentType<Record<string, unknown>>;
  }
  const mod: ScenarioEntryModule;
  export = mod;
}
