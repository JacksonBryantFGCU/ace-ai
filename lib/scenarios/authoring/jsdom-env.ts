/**
 * Ensure a DOM exists for the authoring toolkit's solution validation.
 *
 * Mirrors `server/scenarios/dom-env.ts` but WITHOUT the `server-only` marker, so
 * the plain CLI (run via `tsx`, outside the Next bundler) can install a DOM. Under
 * a jsdom test environment `document` already exists and this is a no-op.
 */
let installed = false;

export async function ensureAuthoringDom(): Promise<void> {
  if (installed || typeof document !== "undefined") return;

  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const g = globalThis as unknown as Record<string, unknown>;
  const win = window as unknown as Record<string, unknown>;

  // Walk own property names across the prototype chain (not `for…in`): jsdom's
  // DOM constructors + APIs are non-enumerable, and `@testing-library/dom`'s
  // role/accessibility queries need them. See `server/scenarios/dom-env.ts`.
  const keys = new Set<string>();
  for (let obj: object | null = window; obj; obj = Object.getPrototypeOf(obj)) {
    for (const key of Object.getOwnPropertyNames(obj)) keys.add(key);
  }
  for (const key of keys) {
    if (key in g) continue;
    try {
      g[key] = win[key];
    } catch {
      // getter-only property; skip.
    }
  }
  g.window = window;
  g.document = window.document;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  installed = true;
}
