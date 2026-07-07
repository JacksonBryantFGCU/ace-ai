/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import FakeTimers from "@sinonjs/fake-timers";
import type {
  AuthoredTestFile,
  TestOutcome,
  TestRunInput,
  TestRunResult,
} from "@/lib/scenarios/engines/contracts";

/**
 * Browser test runner — ONE implementation of a `TestRunner` (see contracts.ts).
 * It executes the authored RTL/Vitest-style test files verbatim against the
 * candidate's live workspace, entirely in the browser (or jsdom):
 *
 *   1. Build a virtual FS: candidate files under `workspace/`, tests under `tests/`.
 *   2. Transpile each module on demand (TypeScript → CommonJS, automatic JSX).
 *   3. Link modules with a `require` that resolves the vFS + a fixed host module
 *      set (react, react/jsx-runtime, @testing-library/react, and a per-run
 *      `vitest` shim), honoring `vi.mock` via a pre-scan.
 *   4. Provide a minimal `vi` + `expect` (with the DOM/mock matchers the authored
 *      tests use) and a tiny test collector, then run each test.
 *
 * This is deliberately self-contained and heavy (pulls RTL + `typescript`), so it
 * is only ever *dynamically* imported by the component engine.
 */

// ── React/RTL host modules (loaded un-bundled) ────────────────────────────────

/**
 * This engine runs from server code (a Server Action's module graph). Next.js
 * resolves `react` there under the `"react-server"` export condition, whose build
 * of `react` (and, transitively, `react-dom` via RTL) omits `useState`/`useEffect`
 * AND `act` — so any bundled `import "react"` here breaks every test with
 * "React.act is not a function", regardless of the candidate's code.
 *
 * A `turbopackIgnore` dynamic import does NOT escape this: Turbopack rewrites the
 * ignored import to a `require()` that its own runtime + Next's RSC require hook
 * still resolve under `react-server` (an ignored *bare* specifier is not left to
 * plain Node). And a `createRequire(import.meta.url)` is likewise intercepted (it
 * returns Turbopack-virtual `[project]/…` paths).
 *
 * The one thing that reaches a clean Node resolver is a `createRequire` rooted at a
 * REAL filesystem URL: `createRequire(pathToFileURL(<cwd>/package.json))`. That
 * require uses Node's default conditions (no `react-server`), so every host module
 * resolves to its ordinary client build — `react` with hooks + `act`, and RTL
 * sharing that exact same `react` instance (same resolved path → same module cache
 * entry). Scoped to just these packages; the app's real SSR/RSC rendering is
 * untouched. Works identically under `next dev` (Turbopack), `next build`
 * (webpack), and the plain-Node toolkit/vitest paths.
 */
let reactHostModules: {
  React: any;
  ReactJsxRuntime: any;
  ReactJsxDevRuntime: any;
  RTL: any;
  userEvent: any;
  ReactRouterDom: any;
  jestDomMatchers: any;
} | null = null;

async function loadReactHostModules() {
  if (reactHostModules) return reactHostModules;
  // Root the require at a real file URL so it bypasses the bundler's virtual FS
  // and the `react-server` condition (see the note above).
  const nodeRequire = createRequire(pathToFileURL(join(process.cwd(), "package.json")).href);
  const req = (spec: string): any => nodeRequire(spec);

  const userEventMod = req("@testing-library/user-event");
  reactHostModules = {
    React: req("react"),
    ReactJsxRuntime: req("react/jsx-runtime"),
    ReactJsxDevRuntime: req("react/jsx-dev-runtime"),
    RTL: req("@testing-library/react"),
    userEvent: userEventMod.default ?? userEventMod,
    ReactRouterDom: req("react-router-dom"),
    jestDomMatchers: req("@testing-library/jest-dom/matchers"),
  };
  return reactHostModules;
}

// ── Path helpers (POSIX-style vFS keys) ──────────────────────────────────────

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

/** Resolve a relative specifier against an importer key, trying TS/JS extensions. */
function resolveRelative(importerKey: string, spec: string, vfs: Map<string, string>): string {
  const base = normalize(`${dirname(importerKey)}/${spec}`);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  for (const c of candidates) if (vfs.has(c)) return c;
  // Fall back to the extensionless base (used as a mock key even if no file).
  return base;
}

// ── vi.mock pre-scan ─────────────────────────────────────────────────────────

/** Read the balanced `(...)` starting at `openParen`, respecting strings. */
function sliceBalanced(src: string, openParen: number): { inner: string; end: number } {
  let depth = 0;
  let str: string | null = null;
  for (let i = openParen; i < src.length; i++) {
    const c = src[i]!;
    if (str) {
      if (c === "\\") i++;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") str = c;
    else if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return { inner: src.slice(openParen + 1, i), end: i };
    }
  }
  throw new Error("unbalanced vi.mock(...)");
}

/** Split at the first top-level comma. */
function splitFirstComma(s: string): [string, string | null] {
  let depth = 0;
  let str: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (str) {
      if (c === "\\") i++;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") str = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return [s, null];
}

interface ExtractedMock {
  spec: string;
  factorySrc: string;
}

/** Find `vi.mock("spec", factory)` calls and extract spec + factory source. */
function extractViMocks(src: string): ExtractedMock[] {
  const mocks: ExtractedMock[] = [];
  const needle = "vi.mock";
  let from = 0;
  for (;;) {
    const at = src.indexOf(needle, from);
    if (at === -1) break;
    let p = at + needle.length;
    while (p < src.length && /\s/.test(src[p]!)) p++;
    if (src[p] !== "(") {
      from = at + needle.length;
      continue;
    }
    const { inner, end } = sliceBalanced(src, p);
    const [specExpr, factoryExpr] = splitFirstComma(inner);
    if (factoryExpr !== null) {
      const spec = new Function(`return (${specExpr});`)() as string;
      mocks.push({ spec, factorySrc: factoryExpr.trim() });
    }
    from = end + 1;
  }
  return mocks;
}

// ── deep-equal + format ──────────────────────────────────────────────────────

function isAsymmetric(v: any): boolean {
  return !!v && typeof v === "object" && typeof v.asymmetricMatch === "function";
}

function deepEqual(a: any, b: any): boolean {
  // Asymmetric matchers (expect.any / objectContaining / …) match either side.
  if (isAsymmetric(b)) return b.asymmetricMatch(a);
  if (isAsymmetric(a)) return a.asymmetricMatch(b);
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function fmt(v: any): string {
  try {
    if (typeof v === "object" && v !== null && v.nodeType) return `<${(v.tagName || "node").toLowerCase()}>`;
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

// ── vi shim ──────────────────────────────────────────────────────────────────

type Behavior =
  | { type: "return"; value: any }
  | { type: "resolve"; value: any }
  | { type: "reject"; value: any }
  | { type: "impl"; value: (...a: any[]) => any };

function applyBehavior(b: Behavior, args: any[]): any {
  switch (b.type) {
    case "return":
      return b.value;
    case "resolve":
      return Promise.resolve(b.value);
    case "reject":
      return Promise.reject(b.value);
    case "impl":
      return b.value(...args);
  }
}

function createVi() {
  const created: any[] = [];

  function fn(impl?: (...a: any[]) => any) {
    const calls: any[][] = [];
    const onceQueue: Behavior[] = [];
    let def: Behavior | null = impl ? { type: "impl", value: impl } : null;

    const mock: any = (...args: any[]) => {
      calls.push(args);
      const behavior = onceQueue.shift() ?? def;
      return behavior ? applyBehavior(behavior, args) : undefined;
    };
    mock.mock = { calls };
    mock._isMockFunction = true;
    mock.mockReturnValue = (v: any) => ((def = { type: "return", value: v }), mock);
    mock.mockReturnValueOnce = (v: any) => (onceQueue.push({ type: "return", value: v }), mock);
    mock.mockResolvedValue = (v: any) => ((def = { type: "resolve", value: v }), mock);
    mock.mockResolvedValueOnce = (v: any) => (onceQueue.push({ type: "resolve", value: v }), mock);
    mock.mockRejectedValue = (v: any) => ((def = { type: "reject", value: v }), mock);
    mock.mockRejectedValueOnce = (v: any) => (onceQueue.push({ type: "reject", value: v }), mock);
    mock.mockImplementation = (f: (...a: any[]) => any) => ((def = { type: "impl", value: f }), mock);
    mock.mockImplementationOnce = (f: (...a: any[]) => any) => (onceQueue.push({ type: "impl", value: f }), mock);
    mock.mockClear = () => {
      calls.length = 0;
    };
    mock.mockReset = () => {
      calls.length = 0;
      onceQueue.length = 0;
      def = null;
    };
    created.push(mock);
    return mock;
  }

  let clock: ReturnType<typeof FakeTimers.install> | null = null;
  const stubbed: { target: any; key: string; had: boolean; prev: any }[] = [];

  const api: any = {
    fn,
    spyOn(obj: any, key: string) {
      const original = obj?.[key];
      const spy = fn(typeof original === "function" ? (...a: any[]) => original.apply(obj, a) : undefined);
      spy.mockRestore = () => {
        if (obj) obj[key] = original;
      };
      if (obj) obj[key] = spy;
      return spy;
    },
    mock: () => {}, // runtime no-op; mocks are pre-registered before evaluation
    mocked: (x: any) => x,
    clearAllMocks: () => created.forEach((m) => m.mockClear()),
    resetAllMocks: () => created.forEach((m) => m.mockReset()),
    restoreAllMocks: () => created.forEach((m) => m.mockRestore?.()),
    // Stub a global (e.g. `fetch`), restorable via `unstubAllGlobals`.
    stubGlobal(name: string, value: any) {
      const g: any = globalThis;
      stubbed.push({ target: g, key: name, had: name in g, prev: g[name] });
      g[name] = value;
      if (g.window && g.window !== g) g.window[name] = value;
      return api;
    },
    unstubAllGlobals() {
      for (const s of stubbed) {
        if (s.had) s.target[s.key] = s.prev;
        else delete s.target[s.key];
        const w = s.target.window;
        if (w && w !== s.target) {
          if (s.had) w[s.key] = s.prev;
          else delete w[s.key];
        }
      }
      stubbed.length = 0;
      return api;
    },
    // Fake timers (via @sinonjs/fake-timers, as Vitest uses) — debounce/throttle/
    // polling questions. Restored between tests by `__resetPerTest`.
    useFakeTimers(config?: Record<string, unknown>) {
      if (!clock) {
        clock = FakeTimers.install({
          toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
          ...config,
        });
      }
      return api;
    },
    useRealTimers() {
      clock?.uninstall();
      clock = null;
      return api;
    },
    isFakeTimers: () => clock !== null,
    advanceTimersByTime(ms: number) {
      clock?.tick(ms);
      return api;
    },
    async advanceTimersByTimeAsync(ms: number) {
      if (clock) await clock.tickAsync(ms);
      return api;
    },
    advanceTimersToNextTimer() {
      clock?.next();
      return api;
    },
    runAllTimers() {
      clock?.runAll();
      return api;
    },
    async runAllTimersAsync() {
      if (clock) await clock.runAllAsync();
      return api;
    },
    runOnlyPendingTimers() {
      clock?.runToLast();
      return api;
    },
    getTimerCount: () => (clock ? clock.countTimers() : 0),
    setSystemTime(time?: number | Date) {
      if (clock) clock.setSystemTime(time);
      return api;
    },
    // Internal — restore real timers + un-stub globals between tests.
    __resetPerTest() {
      clock?.uninstall();
      clock = null;
      api.unstubAllGlobals();
    },
  };
  return api;
}

// ── expect shim (only the matchers the authored tests use, plus common ones) ──

/** Partial (recursive) object match for `toMatchObject`. */
function matchObject(received: any, expected: any): boolean {
  if (isAsymmetric(expected)) return expected.asymmetricMatch(received);
  if (expected === null || typeof expected !== "object") return deepEqual(received, expected);
  if (received === null || typeof received !== "object") return false;
  if (Array.isArray(expected)) {
    return Array.isArray(received) && received.length === expected.length && expected.every((v, i) => matchObject(received[i], v));
  }
  return Object.keys(expected).every((k) => matchObject(received[k], expected[k]));
}

class Assertion {
  constructor(
    private received: any,
    private isNot: boolean,
  ) {}
  get not(): Assertion {
    return new Assertion(this.received, !this.isNot);
  }
  private check(pass: boolean, message: string) {
    if (pass === this.isNot) {
      throw new Error(this.isNot ? `Expected NOT: ${message}` : message);
    }
  }
  // ── equality / identity ──
  toBe(expected: any) {
    this.check(Object.is(this.received, expected), `expected ${fmt(this.received)} to be ${fmt(expected)}`);
  }
  toEqual(expected: any) {
    this.check(deepEqual(this.received, expected), `expected ${fmt(this.received)} to equal ${fmt(expected)}`);
  }
  toStrictEqual(expected: any) {
    this.toEqual(expected);
  }
  toMatchObject(expected: any) {
    this.check(matchObject(this.received, expected), `expected ${fmt(this.received)} to match object ${fmt(expected)}`);
  }
  // ── truthiness ──
  toBeTruthy() {
    this.check(!!this.received, `expected ${fmt(this.received)} to be truthy`);
  }
  toBeFalsy() {
    this.check(!this.received, `expected ${fmt(this.received)} to be falsy`);
  }
  toBeNull() {
    this.check(this.received === null, `expected ${fmt(this.received)} to be null`);
  }
  toBeUndefined() {
    this.check(this.received === undefined, `expected ${fmt(this.received)} to be undefined`);
  }
  toBeDefined() {
    this.check(this.received !== undefined, `expected value to be defined`);
  }
  toBeNaN() {
    this.check(Number.isNaN(this.received), `expected ${fmt(this.received)} to be NaN`);
  }
  // ── numbers ──
  toBeGreaterThan(n: number) {
    this.check(this.received > n, `expected ${fmt(this.received)} > ${fmt(n)}`);
  }
  toBeGreaterThanOrEqual(n: number) {
    this.check(this.received >= n, `expected ${fmt(this.received)} >= ${fmt(n)}`);
  }
  toBeLessThan(n: number) {
    this.check(this.received < n, `expected ${fmt(this.received)} < ${fmt(n)}`);
  }
  toBeLessThanOrEqual(n: number) {
    this.check(this.received <= n, `expected ${fmt(this.received)} <= ${fmt(n)}`);
  }
  toBeCloseTo(n: number, digits = 2) {
    this.check(Math.abs(this.received - n) < 10 ** -digits / 2, `expected ${fmt(this.received)} to be close to ${fmt(n)}`);
  }
  // ── collections / strings ──
  toContain(item: any) {
    const r = this.received;
    this.check(!!r && typeof r.includes === "function" && r.includes(item), `expected ${fmt(r)} to contain ${fmt(item)}`);
  }
  toContainEqual(item: any) {
    const r = this.received;
    this.check(Array.isArray(r) && r.some((x) => deepEqual(x, item)), `expected ${fmt(r)} to contain equal ${fmt(item)}`);
  }
  toHaveLength(n: number) {
    this.check(this.received?.length === n, `expected length ${this.received?.length} to be ${n}`);
  }
  toMatch(re: RegExp | string) {
    const s = String(this.received);
    const pass = re instanceof RegExp ? re.test(s) : s.includes(String(re));
    this.check(pass, `expected ${fmt(s)} to match ${fmt(re)}`);
  }
  toHaveProperty(path: string | string[], value?: any) {
    const keys = Array.isArray(path) ? path : String(path).split(".");
    let cur = this.received;
    let found = true;
    for (const k of keys) {
      if (cur != null && k in Object(cur)) cur = cur[k];
      else {
        found = false;
        break;
      }
    }
    this.check(found && (value === undefined || deepEqual(cur, value)), `expected to have property ${fmt(path)}`);
  }
  // ── types / errors ──
  toBeInstanceOf(ctor: any) {
    this.check(this.received instanceof ctor, `expected ${fmt(this.received)} to be instance of ${ctor?.name}`);
  }
  toThrow(expected?: any) {
    if (typeof this.received !== "function") {
      this.check(false, `toThrow expects a function`);
      return;
    }
    let threw = false;
    let err: any;
    try {
      this.received();
    } catch (e) {
      threw = true;
      err = e;
    }
    let pass = threw;
    if (threw && expected !== undefined) {
      const msg = err?.message ?? String(err);
      if (typeof expected === "string") pass = msg.includes(expected);
      else if (expected instanceof RegExp) pass = expected.test(msg);
      else if (typeof expected === "function") pass = err instanceof expected;
      else if (expected && typeof expected === "object" && "message" in expected) pass = msg.includes(expected.message);
    }
    this.check(pass, `expected function to throw${expected !== undefined ? ` ${fmt(expected)}` : ""}`);
  }
  // ── mock functions ──
  toHaveBeenCalled() {
    this.check((this.received?.mock?.calls?.length ?? 0) > 0, `expected mock to have been called`);
  }
  toHaveBeenCalledTimes(n: number) {
    this.check((this.received?.mock?.calls?.length ?? 0) === n, `expected mock to have been called ${n} times`);
  }
  toHaveBeenCalledWith(...args: any[]) {
    const calls: any[][] = this.received?.mock?.calls ?? [];
    this.check(calls.some((c) => deepEqual(c, args)), `expected mock to have been called with ${fmt(args)}`);
  }
  toHaveBeenLastCalledWith(...args: any[]) {
    const calls: any[][] = this.received?.mock?.calls ?? [];
    const last = calls[calls.length - 1];
    this.check(!!last && deepEqual(last, args), `expected mock's last call with ${fmt(args)}`);
  }
  toHaveBeenNthCalledWith(n: number, ...args: any[]) {
    const calls: any[][] = this.received?.mock?.calls ?? [];
    const call = calls[n - 1];
    this.check(!!call && deepEqual(call, args), `expected mock call #${n} with ${fmt(args)}`);
  }
  // NOTE: DOM / accessibility matchers (toBeInTheDocument, toHaveAttribute,
  // toHaveAccessibleName, toBeDisabled, toHaveClass, toHaveStyle, toHaveFocus, …)
  // are the REAL `@testing-library/jest-dom` matchers, wired onto this prototype
  // below.
}

function safeFmt(v: any): string {
  try {
    if (v && v.nodeType) return `<${(v.tagName || "node").toLowerCase()}>`;
    return typeof v === "string" ? v : (JSON.stringify(v) ?? String(v));
  } catch {
    return String(v);
  }
}

// Minimal Jest matcher-utils shim — jest-dom only uses these for message
// formatting (computed on failure), never for the pass/fail decision.
const jestMatcherUtils = {
  matcherHint: () => "",
  printReceived: (v: any) => safeFmt(v),
  printExpected: (v: any) => safeFmt(v),
  stringify: (v: any) => safeFmt(v),
  RECEIVED_COLOR: (s: any) => String(s),
  EXPECTED_COLOR: (s: any) => String(s),
  diff: () => "",
};

// Wire the full `@testing-library/jest-dom` matcher set onto Assertion. Each is
// invoked with the Jest expect-extend context (isNot/equals/utils); we translate
// its `{ pass, message }` into our throw-on-mismatch model. Deferred (called once,
// lazily) because `jestDomMatchers` now loads via `loadReactHostModules`.
let jestDomMatchersWired = false;
function wireJestDomMatchers(jestDomMatchers: any): void {
  if (jestDomMatchersWired) return;
  jestDomMatchersWired = true;
  for (const [name, matcher] of Object.entries(jestDomMatchers)) {
    if (typeof matcher !== "function") continue;
    if ((Assertion.prototype as any)[name]) continue; // never override a core matcher
    (Assertion.prototype as any)[name] = function (this: any, ...args: any[]) {
      const isNot: boolean = this.isNot;
      const context = {
        isNot,
        promise: "",
        equals: (a: any, b: any) => deepEqual(a, b),
        customTesters: [],
        utils: jestMatcherUtils,
      };
      let result: any;
      try {
        result = (matcher as any).call(context, this.received, ...args);
      } catch (e) {
        throw new Error(`${name}: ${(e as Error).message}`);
      }
      const pass = !!result?.pass;
      if (pass === isNot) {
        let message: string;
        try {
          message = typeof result?.message === "function" ? result.message() : String(result?.message ?? "");
        } catch {
          message = `expected ${isNot ? "not " : ""}${name}`;
        }
        throw new Error(message);
      }
    };
  }
}

function makeExpect() {
  const expectFn: any = (received: any) => new Assertion(received, false);
  // `import "@testing-library/jest-dom"` / `expect.extend(matchers)` are no-ops —
  // the matchers are already wired above.
  expectFn.extend = () => {};
  // Asymmetric matchers (integrate with deepEqual via `asymmetricMatch`).
  expectFn.anything = () => ({ asymmetricMatch: (v: any) => v !== null && v !== undefined });
  expectFn.any = (ctor: any) => ({
    asymmetricMatch: (v: any) =>
      ctor === String
        ? typeof v === "string"
        : ctor === Number
          ? typeof v === "number"
          : ctor === Boolean
            ? typeof v === "boolean"
            : ctor === Function
              ? typeof v === "function"
              : ctor === Object
                ? typeof v === "object" && v !== null
                : ctor === Array
                  ? Array.isArray(v)
                  : v != null && v instanceof ctor,
  });
  expectFn.arrayContaining = (arr: any[]) => ({
    asymmetricMatch: (v: any) => Array.isArray(v) && arr.every((e) => v.some((x: any) => deepEqual(x, e))),
  });
  expectFn.objectContaining = (obj: any) => ({
    asymmetricMatch: (v: any) => v != null && Object.keys(obj).every((k) => deepEqual(v[k], obj[k])),
  });
  expectFn.stringContaining = (s: string) => ({
    asymmetricMatch: (v: any) => typeof v === "string" && v.includes(s),
  });
  expectFn.stringMatching = (re: RegExp | string) => ({
    asymmetricMatch: (v: any) => typeof v === "string" && (re instanceof RegExp ? re.test(v) : v.includes(String(re))),
  });
  expectFn.closeTo = (n: number, digits = 2) => ({
    asymmetricMatch: (v: any) => typeof v === "number" && Math.abs(v - n) < 10 ** -digits / 2,
  });
  return expectFn;
}

// ── The runner ───────────────────────────────────────────────────────────────

/**
 * Install browser APIs jsdom omits (`matchMedia`, `ResizeObserver`,
 * `IntersectionObserver`) as safe defaults so components that use them don't crash
 * — enabling responsive / observer-based questions. Tests can override
 * `window.matchMedia` (or the observers) to drive specific behavior. Idempotent.
 */
function installBrowserPolyfills(): void {
  const g: any = globalThis;
  const win: any = g.window ?? g;
  const define = (name: string, value: any) => {
    if (g[name] === undefined) g[name] = value;
    if (win && win !== g && win[name] === undefined) win[name] = value;
  };

  define("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));

  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  define("ResizeObserver", NoopObserver);
  define("IntersectionObserver", NoopObserver);
}

function withTimeout<T>(promise: Promise<T>, ms: number, schedule: typeof setTimeout): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => schedule(() => reject(new Error(`test timed out after ${ms}ms`)), ms)),
  ]);
}

export async function runAuthoredTests(input: TestRunInput): Promise<TestRunResult> {
  const tsModule: any = await import("typescript");
  const ts = tsModule.default ?? tsModule;
  const { React, ReactJsxRuntime, ReactJsxDevRuntime, RTL, userEvent, ReactRouterDom, jestDomMatchers } =
    await loadReactHostModules();
  wireJestDomMatchers(jestDomMatchers);

  // Browser APIs jsdom omits (responsive / observer questions).
  installBrowserPolyfills();
  // Capture the REAL timer up front so a test's fake timers can't disable the
  // per-test timeout guard.
  const realSetTimeout = globalThis.setTimeout.bind(globalThis) as typeof setTimeout;

  // 1. Virtual FS: candidate files under `workspace/`, tests at their own paths.
  const vfs = new Map<string, string>();
  for (const f of input.workspaceFiles) vfs.set(normalize(`workspace/${f.path}`), f.content);
  for (const f of input.testFiles) vfs.set(normalize(f.path), f.content);

  // 2. Per-run test context (collector + hooks + shims).
  const collected: { name: string; fn: () => any }[] = [];
  const afterEachHooks: (() => any)[] = [];
  const beforeEachHooks: (() => any)[] = [];
  const vi = createVi();
  const register = (name: string, fn: () => any) => collected.push({ name, fn });
  const vitestApi = {
    test: register,
    it: register,
    describe: (_name: string, fn: () => void) => fn(),
    beforeEach: (fn: () => any) => beforeEachHooks.push(fn),
    afterEach: (fn: () => any) => afterEachHooks.push(fn),
    beforeAll: (fn: () => any) => beforeEachHooks.push(fn),
    afterAll: (fn: () => any) => afterEachHooks.push(fn),
    expect: makeExpect(),
    vi,
  };

  // Inject Jest/Vitest-style GLOBALS so authored tests can use `test`/`it`/
  // `expect`/`vi`/`describe`/hooks without importing them (both styles work —
  // `import { … } from "vitest"` still resolves via the host module). Restored
  // after the run so nothing leaks into the host process.
  const globalScope = globalThis as any;
  const injectedGlobals: Record<string, unknown> = {
    describe: vitestApi.describe,
    test: vitestApi.test,
    it: vitestApi.it,
    expect: vitestApi.expect,
    vi: vitestApi.vi,
    beforeEach: vitestApi.beforeEach,
    afterEach: vitestApi.afterEach,
    beforeAll: vitestApi.beforeAll,
    afterAll: vitestApi.afterAll,
  };
  const savedGlobals = new Map<string, { had: boolean; prev: unknown }>();
  for (const [k, v] of Object.entries(injectedGlobals)) {
    savedGlobals.set(k, { had: k in globalScope, prev: globalScope[k] });
    globalScope[k] = v;
  }

  // 3. Host modules (bare specifiers).
  const host = new Map<string, any>([
    ["react", React],
    ["react/jsx-runtime", ReactJsxRuntime],
    ["react/jsx-dev-runtime", ReactJsxDevRuntime],
    ["@testing-library/react", RTL],
    ["@testing-library/user-event", { __esModule: true, default: userEvent }],
    ["react-router-dom", ReactRouterDom],
    ["react-router", ReactRouterDom],
    // jest-dom matchers are wired directly into `expect`; importing it is a no-op
    // side-effect that must still resolve.
    ["@testing-library/jest-dom/vitest", {}],
    ["@testing-library/jest-dom", {}],
    ["vitest", vitestApi],
  ]);

  // 4. Module system.
  const cache = new Map<string, { exports: any }>();
  const mocks = new Map<string, any>();

  function transpile(src: string, fileName: string): string {
    return ts.transpileModule(src, {
      fileName,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
        isolatedModules: true,
      },
    }).outputText;
  }

  function requireFrom(importerKey: string, spec: string): any {
    if (!spec.startsWith(".")) {
      if (host.has(spec)) return host.get(spec);
      throw new Error(`unknown module: ${spec}`);
    }
    const key = resolveRelative(importerKey, spec, vfs);
    if (mocks.has(key)) return mocks.get(key);
    return evaluate(key);
  }

  function evaluate(key: string): any {
    const cached = cache.get(key);
    if (cached) return cached.exports;
    const src = vfs.get(key);
    if (src === undefined) throw new Error(`module not found: ${key}`);
    const mod = { exports: {} as any };
    cache.set(key, mod);
    const compiled = transpile(src, key);
    const factory = new Function("require", "module", "exports", compiled);
    factory((s: string) => requireFrom(key, s), mod, mod.exports);
    return mod.exports;
  }

  const errors: TestRunResult["errors"] = [];

  // 5. Pre-register vi.mock factories (before any module evaluates).
  for (const tf of input.testFiles) {
    const testKey = normalize(tf.path);
    try {
      for (const { spec, factorySrc } of extractViMocks(tf.content)) {
        const mockKey = resolveRelative(testKey, spec, vfs);
        const factory = new Function("vi", `return (${factorySrc});`)(vi) as () => any;
        mocks.set(mockKey, { __esModule: true, ...factory() });
      }
    } catch (e) {
      errors.push({ message: `mock setup failed in ${tf.path}: ${(e as Error).message}`, kind: "transform" });
    }
  }

  // 6. Evaluate each test module (registers its tests + hooks).
  for (const tf of input.testFiles) {
    try {
      evaluate(normalize(tf.path));
    } catch (e) {
      errors.push({ message: (e as Error).message, kind: "load", stack: (e as Error).stack });
    }
  }

  // 7. Run collected tests sequentially. React's `act` environment is a GLOBAL
  // flag: RTL needs it during the run, but leaving it set makes the REAL app emit
  // "not wrapped in act(...)" warnings on every state update. So we set it here
  // and restore the previous value in `finally`.
  const timeoutMs = input.timeoutMs ?? 10_000;
  const outcomes: TestOutcome[] = [];
  const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown };
  const prevActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    for (const t of collected) {
      const started = performance.now();
      try {
        for (const h of beforeEachHooks) await h();
        await withTimeout(Promise.resolve().then(() => t.fn()), timeoutMs, realSetTimeout);
        outcomes.push({ name: t.name, passed: true, durationMs: Math.round(performance.now() - started) });
      } catch (e) {
        outcomes.push({
          name: t.name,
          passed: false,
          message: (e as Error).message,
          durationMs: Math.round(performance.now() - started),
        });
      } finally {
        for (const h of afterEachHooks) {
          try {
            await h();
          } catch {
            /* ignore cleanup errors */
          }
        }
        // Auto-cleanup between tests: unmount rendered trees + restore real timers
        // and any stubbed globals, so tests can't leak into one another.
        try {
          RTL.cleanup();
        } catch {
          /* no-op */
        }
        try {
          vi.__resetPerTest();
        } catch {
          /* no-op */
        }
      }
    }
  } finally {
    actEnv.IS_REACT_ACT_ENVIRONMENT = prevActEnv;
    // Restore any globals we injected (or remove ours if there was none).
    for (const [k, s] of savedGlobals) {
      if (s.had) globalScope[k] = s.prev;
      else delete globalScope[k];
    }
  }

  return { tests: outcomes, errors };
}

export type { AuthoredTestFile };

