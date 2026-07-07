import "server-only";

import { JSDOM } from "jsdom";

/**
 * Server-side DOM for the browser test runtime.
 *
 * The `component` harness renders React via `@testing-library/react`, which needs
 * a DOM. In production, verification runs inside a Node server action (no DOM), so
 * we install a jsdom document onto the Node globals — the same environment the
 * runtime's own test uses (`// @vitest-environment jsdom`), just wired up by hand.
 *
 * Idempotent and process-wide: one DOM is shared across runs. Verification is
 * serialized (see `verification-service.ts`) so runs never interleave in it.
 */
// The "already installed" marker lives on `globalThis`, NOT in a module-local
// variable. Under `next dev` (Turbopack HMR) this module can be re-evaluated
// while the process (and its jsdom document/window/DOM-constructor globals) keep
// living. A module-local flag would reset to `false` on reload, so the next
// `ensureDomEnv()` would build a SECOND jsdom and reassign `global.document`/
// `global.window` to it — while the `key in g` guard leaves the DOM constructors
// (`HTMLElement`, `Node`, …) pointing at the FIRST window. globalThis would then
// straddle two realms and RTL renders/`getByRole` queries silently fail. A
// global marker survives the reload, so we install exactly once per process.
const INSTALLED = Symbol.for("scenario.dom-env.installed");

export function ensureDomEnv(): void {
  const g0 = globalThis as unknown as Record<symbol, unknown>;
  if (g0[INSTALLED]) return;

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const g = globalThis as unknown as Record<string, unknown>;
  const win = window as unknown as Record<string, unknown>;

  // Copy DOM globals Node doesn't already provide (mirrors the `jsdom-global`
  // approach). The `key in g` guard preserves Node's own globals — `fetch`,
  // `navigator`, `performance`, timers, `crypto` — so we never clobber them.
  //
  // We must walk `Object.getOwnPropertyNames` of the window AND its prototype
  // chain, NOT `for…in`: jsdom defines the DOM constructors (`Node`, `Element`,
  // `HTMLElement`, `HTMLInputElement`, `Text`, `NodeFilter`, …) and APIs like
  // `getComputedStyle` as NON-ENUMERABLE properties, which `for…in` silently
  // skips. `@testing-library/dom`'s `getByRole`/accessibility queries rely on
  // those globals, so missing them makes every role query fail with "no
  // accessible roles" even though the element is present in the DOM.
  for (const key of collectWindowKeys(window)) {
    if (key in g) continue;
    try {
      g[key] = win[key];
    } catch {
      // Some window properties are getter-only; skip them.
    }
  }

  g.window = window;
  g.document = window.document;
  // React's act() environment flag — RTL renders under act().
  g.IS_REACT_ACT_ENVIRONMENT = true;

  g0[INSTALLED] = true;
}

/** Every own property name across the window instance and its prototype chain
 *  (includes non-enumerable DOM constructors + APIs that `for…in` would miss). */
function collectWindowKeys(window: object): Set<string> {
  const keys = new Set<string>();
  for (let obj: object | null = window; obj; obj = Object.getPrototypeOf(obj)) {
    for (const key of Object.getOwnPropertyNames(obj)) keys.add(key);
  }
  return keys;
}

