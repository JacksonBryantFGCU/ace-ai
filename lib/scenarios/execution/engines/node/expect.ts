/**
 * A deliberately small Jest/Vitest-style `expect`. It implements only the
 * matchers a pure-TypeScript-module interview needs — NOT a full Vitest clone.
 *
 * Matchers are realm-safe: the value under test may originate in the sandbox
 * `vm` context (a different realm), so we never use `instanceof` on candidate
 * values and rely on structural checks (`Array.isArray`, `typeof`, key walks).
 * A failed matcher throws `ExpectationError` (a host-realm error) so the runner
 * can categorize it as an assertion failure.
 */
export class ExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpectationError";
  }
}

function fail(message: string): never {
  throw new ExpectationError(message);
}

function stringify(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return `[Function ${(value as { name?: string }).name || "anonymous"}]`;
  if (typeof value === "bigint") return `${value}n`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Structural deep equality (realm-safe, handles NaN, arrays, plain objects, Dates). */
export function deepEqual(a: unknown, b: unknown, seen = new WeakMap<object, unknown>()): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Number.isNaN(a) && Number.isNaN(b);
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;

  const aDate = typeof (ao as { getTime?: () => number }).getTime === "function";
  const bDate = typeof (bo as { getTime?: () => number }).getTime === "function";
  if (aDate || bDate) {
    return aDate && bDate && (ao as { getTime(): number }).getTime() === (bo as { getTime(): number }).getTime();
  }

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;

  if (seen.get(a as object) === b) return true;
  seen.set(a as object, b);

  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k], seen));
}

/** Whether `actual` contains every own key of `subset` (recursively). */
function matchesObject(actual: unknown, subset: unknown): boolean {
  if (typeof subset !== "object" || subset === null) return deepEqual(actual, subset);
  if (typeof actual !== "object" || actual === null) return false;
  const a = actual as Record<string, unknown>;
  const s = subset as Record<string, unknown>;
  return Object.keys(s).every((k) => {
    const sv = s[k];
    return typeof sv === "object" && sv !== null ? matchesObject(a[k], sv) : deepEqual(a[k], sv);
  });
}

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, digits?: number): void;
  toContain(item: unknown): void;
  toHaveLength(n: number): void;
  toMatch(pattern: string | RegExp): void;
  toMatchObject(subset: unknown): void;
  toThrow(expected?: string | RegExp): void;
  not: Matchers;
}

function build(received: unknown, negated: boolean): Matchers {
  const check = (pass: boolean, message: string) => {
    if (pass === negated) fail(negated ? `Expected NOT: ${message}` : message);
  };

  const matchers: Matchers = {
    toBe: (expected) => check(Object.is(received, expected), `expected ${stringify(received)} to be ${stringify(expected)}`),
    toEqual: (expected) => check(deepEqual(received, expected), `expected ${stringify(received)} to equal ${stringify(expected)}`),
    toStrictEqual: (expected) => check(deepEqual(received, expected), `expected ${stringify(received)} to strictly equal ${stringify(expected)}`),
    toBeTruthy: () => check(Boolean(received), `expected ${stringify(received)} to be truthy`),
    toBeFalsy: () => check(!received, `expected ${stringify(received)} to be falsy`),
    toBeNull: () => check(received === null, `expected ${stringify(received)} to be null`),
    toBeUndefined: () => check(received === undefined, `expected ${stringify(received)} to be undefined`),
    toBeDefined: () => check(received !== undefined, `expected value to be defined`),
    toBeNaN: () => check(typeof received === "number" && Number.isNaN(received), `expected ${stringify(received)} to be NaN`),
    toBeGreaterThan: (n) => check(typeof received === "number" && received > n, `expected ${stringify(received)} > ${n}`),
    toBeGreaterThanOrEqual: (n) => check(typeof received === "number" && received >= n, `expected ${stringify(received)} >= ${n}`),
    toBeLessThan: (n) => check(typeof received === "number" && received < n, `expected ${stringify(received)} < ${n}`),
    toBeLessThanOrEqual: (n) => check(typeof received === "number" && received <= n, `expected ${stringify(received)} <= ${n}`),
    toBeCloseTo: (n, digits = 2) =>
      check(typeof received === "number" && Math.abs(received - n) < Math.pow(10, -digits) / 2, `expected ${stringify(received)} to be close to ${n}`),
    toContain: (item) => {
      if (typeof received === "string") return check(received.includes(String(item)), `expected "${received}" to contain "${String(item)}"`);
      if (Array.isArray(received)) return check(received.some((x) => Object.is(x, item) || deepEqual(x, item)), `expected array to contain ${stringify(item)}`);
      return fail(`toContain expects a string or array, got ${stringify(received)}`);
    },
    toHaveLength: (n) => {
      const len = (received as { length?: number } | null)?.length;
      check(len === n, `expected length ${stringify(len)} to be ${n}`);
    },
    toMatch: (pattern) => {
      if (typeof received !== "string") return fail(`toMatch expects a string, got ${stringify(received)}`);
      const re = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      check(re.test(received), `expected "${received}" to match ${pattern}`);
    },
    toMatchObject: (subset) => check(matchesObject(received, subset), `expected ${stringify(received)} to match object ${stringify(subset)}`),
    toThrow: (expected) => {
      if (typeof received !== "function") return fail(`toThrow expects a function, got ${stringify(received)}`);
      let thrown: unknown;
      let didThrow = false;
      try {
        (received as () => unknown)();
      } catch (e) {
        didThrow = true;
        thrown = e;
      }
      if (!didThrow) return check(false, `expected function to throw`);
      if (expected !== undefined && !negated) {
        const message = (thrown as { message?: string })?.message ?? String(thrown);
        const ok = typeof expected === "string" ? message.includes(expected) : expected.test(message);
        if (!ok) fail(`expected thrown message "${message}" to match ${expected}`);
        return;
      }
      // negated form: `not.toThrow()` passes only when it did NOT throw.
      check(didThrow, `expected function not to throw`);
    },
    get not() {
      return build(received, !negated);
    },
  };
  return matchers;
}

export type ExpectFn = (received: unknown) => Matchers;

export function makeExpect(): ExpectFn {
  return (received: unknown) => build(received, false);
}
