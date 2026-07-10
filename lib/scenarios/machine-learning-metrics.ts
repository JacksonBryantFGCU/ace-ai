/**
 * ML metrics.json parsing/validation - a small, reusable, PURE utility shared
 * by every code path that reads a candidate-generated metrics.json: the
 * Output Preview panel (machine-learning-preview.ts), step/final
 * verification (machine-learning-step-verification.ts), and authoring
 * solution validation (authoring/machine-learning-solution.ts).
 *
 * The platform's metrics model is DELIBERATELY schema-light: a scenario can
 * report whatever metric shape makes sense for its task (flat accuracy/f1
 * numbers, or a structured result with a confusion matrix, per-class
 * breakdown, cross-validation fold scores, model hyperparameters, ...) -
 * this module never hardcodes a fixed metric list or a fixed nesting shape.
 * What it DOES enforce, generically, is that whatever is there is safe and
 * bounded: valid JSON, a plain object at the root, no prototype-pollution-
 * capable keys AT ANY DEPTH, and conservative recursive size/depth/count
 * limits so a malformed or adversarial metrics.json can never crash a
 * caller, blow the stack, or blow up memory/response size.
 *
 * Validation is ITERATIVE (an explicit work stack), not recursive function
 * calls - adversarial input with extreme nesting can't overflow the JS call
 * stack here, because there IS no per-level function call. Depth is instead
 * one of the bounded counters checked on each iteration.
 */

// ── JSON value model ────────────────────────────────────────────────────────

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** The root is always a plain object (never an array/primitive) — same
 *  contract as before, just with values now allowed to be structured. */
export type MachineLearningMetrics = { [key: string]: JsonValue };

/** Back-compat alias: a metric value used to be flat-only. Kept because
 *  callers may still reference it; it's now a strict subset of `JsonValue`. */
export type MachineLearningMetricValue = JsonPrimitive;

// ── Errors ──────────────────────────────────────────────────────────────────

/** Stable, machine-readable error codes - safe to branch on in callers/tests. */
export type MlMetricsErrorCode =
  | "metrics/missing"
  | "metrics/file-too-large"
  | "metrics/invalid-encoding"
  | "metrics/invalid-json"
  | "metrics/root-not-object"
  | "metrics/invalid-number"
  | "metrics/invalid-key"
  | "metrics/dangerous-key"
  | "metrics/too-many-entries"
  | "metrics/string-too-long"
  | "metrics/missing-required-key"
  | "metrics/type-mismatch"
  | "metrics/max-depth-exceeded"
  | "metrics/max-nodes-exceeded"
  | "metrics/object-too-large"
  | "metrics/array-too-large"
  | "metrics/invalid-path"
  | "metrics/missing-required-path"
  | "metrics/minimum-violation"
  | "metrics/maximum-violation"
  | "metrics/min-items-violation"
  | "metrics/max-items-violation"
  | "metrics/integer-required";

/** A concise, safe error - never includes host paths, hidden file contents,
 *  or a raw stack trace. `key` is the candidate's own metric key/logical
 *  path when safe/useful (e.g. "cross_validation.fold_scores[3]") — never a
 *  filesystem path. */
export interface StructuredMetricsError {
  code: MlMetricsErrorCode;
  message: string;
  key?: string;
}

export type ParseMachineLearningMetricsResult =
  | { ok: true; metrics: MachineLearningMetrics }
  | { ok: false; error: StructuredMetricsError };

/** JSON's own type names, as accepted by `expectedTypes`/assertions' `type`. */
export type MachineLearningMetricTypeName = "number" | "string" | "boolean" | "null" | "array" | "object";

/** A single generic structural check against one JSON Pointer path. Every
 *  field is optional except `path`; only the fields you set are checked. */
export interface MachineLearningMetricAssertion {
  /** JSON Pointer (RFC 6901), e.g. "/summary/f1" or "/confusion_matrix". */
  path: string;
  type?: MachineLearningMetricTypeName;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  integer?: boolean;
}

export interface MachineLearningMetricsOptions {
  /** Maximum encoded size of the input, in bytes. */
  maxBytes?: number;
  /** Maximum container nesting depth (the root object is depth 1). */
  maxDepth?: number;
  /** Maximum total JSON nodes (objects + arrays + primitives) across the
   *  whole document — bounds overall document size independent of shape. */
  maxNodes?: number;
  /** Maximum number of keys in any ONE object (checked at every depth). */
  maxKeysPerObject?: number;
  /** Maximum length of any ONE array (checked at every depth). */
  maxArrayLength?: number;
  /** Maximum length of any object KEY, in characters (checked at every depth). */
  maxKeyLength?: number;
  /** Maximum length of any ONE string VALUE, in characters. */
  maxStringLength?: number;
  /** Maximum combined byte length of every string value in the document. */
  maxTotalStringBytes?: number;
  /** JSON Pointers that must resolve to SOME value (including `null`). */
  requiredPaths?: readonly string[];
  /** When a listed pointer resolves, its JSON type must match. Does NOT by
   *  itself require the path to exist — pair with `requiredPaths` for that. */
  expectedTypes?: Readonly<Record<string, MachineLearningMetricTypeName>>;
  /** Generic structural checks beyond presence/type — see
   *  `MachineLearningMetricAssertion`. Each assertion's path must resolve
   *  (an assertion about a path that doesn't exist fails, the same as a
   *  required path would). */
  assertions?: readonly MachineLearningMetricAssertion[];
}

// ── Bounds (defaults) ────────────────────────────────────────────────────────

// Matches ML_PREVIEW_MAX_FILE_SIZE_BYTES (lib/scenarios/machine-learning-preview.ts)
// - the existing per-artifact cap. Not imported directly to avoid a circular
// import (preview.ts imports the parser from this module); kept numerically
// aligned intentionally.
export const ML_METRICS_MAX_BYTES = 1_000_000; // 1 MB
export const ML_METRICS_MAX_DEPTH = 8;
export const ML_METRICS_MAX_NODES = 5_000;
export const ML_METRICS_MAX_KEYS_PER_OBJECT = 100;
export const ML_METRICS_MAX_ARRAY_LENGTH = 1_000;
export const ML_METRICS_MAX_KEY_LENGTH = 100;
export const ML_METRICS_MAX_STRING_LENGTH = 2_000;
export const ML_METRICS_MAX_TOTAL_STRING_BYTES = 200_000;

/** @deprecated use `ML_METRICS_MAX_KEYS_PER_OBJECT` — kept so any external
 *  reference to the old flat-only name still resolves to the same bound. */
export const ML_METRICS_MAX_ENTRIES = ML_METRICS_MAX_KEYS_PER_OBJECT;
/** @deprecated use `ML_METRICS_MAX_STRING_LENGTH`. */
export const ML_METRICS_MAX_STRING_VALUE_LENGTH = ML_METRICS_MAX_STRING_LENGTH;

/** Prototype-pollution-capable keys - rejected outright, AT EVERY DEPTH,
 *  rather than silently skipped or renamed, so a scenario author notices
 *  immediately no matter how deep the offending key is nested. */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** True if `value` contains a C0 control character or DEL. Checked by
 *  character code (not a regex), so the range is exact and unambiguous
 *  regardless of source-file encoding: codes 0-31 are the C0 controls
 *  (tab/newline/etc.), code 127 is DEL. */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function fail(code: MlMetricsErrorCode, message: string, key?: string): { ok: false; error: StructuredMetricsError } {
  return { ok: false, error: key !== undefined ? { code, message, key } : { code, message } };
}

/** A stable error for "no metrics.json was found" - the parser itself only
 *  ever receives content that already exists; callers that look an artifact
 *  up by path and find nothing use this so every "missing" case (preview,
 *  verification, authoring) reports the identical structured error. */
export function machineLearningMetricsMissingError(path = "metrics.json"): StructuredMetricsError {
  return { code: "metrics/missing", message: path + " was not found." };
}

function typeNameOf(value: JsonValue): MachineLearningMetricTypeName {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value as "number" | "string" | "boolean";
}

/** Human-readable, candidate-safe logical path for error messages — e.g.
 *  `cross_validation.fold_scores[3]`. Never a filesystem path. */
function formatPath(segments: readonly (string | number)[]): string {
  if (segments.length === 0) return "(root)";
  let out = "";
  for (const segment of segments) {
    if (typeof segment === "number") out += `[${segment}]`;
    else out += out ? `.${segment}` : segment;
  }
  return out;
}

// ── JSON Pointer (RFC 6901) ─────────────────────────────────────────────────

/** Parse a JSON Pointer ("/a/b/0") into raw segments, unescaping `~1`→`/`
 *  and `~0`→`~`. Returns `null` for a syntactically invalid pointer (must be
 *  empty, or start with "/"). */
export function parseJsonPointer(pointer: string): string[] | null {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) return null;
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** Resolve a parsed JSON Pointer against an already-validated `JsonValue`
 *  tree. Array segments must be a plain non-negative integer (RFC 6901's
 *  "-" end-of-array marker isn't meaningful for a read/lookup, so it's
 *  treated as not found, matching "unresolvable"). */
function resolveJsonPointer(root: JsonValue, segments: readonly string[]): { found: boolean; value?: JsonValue } {
  let current: JsonValue = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return { found: false };
      const index = Number(segment);
      if (index >= current.length) return { found: false };
      current = current[index]!;
    } else if (current !== null && typeof current === "object") {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) return { found: false };
      current = (current as { [key: string]: JsonValue })[segment]!;
    } else {
      return { found: false };
    }
  }
  return { found: true, value: current };
}

// ── Core parse + recursive (iterative) validation ───────────────────────────

interface Bounds {
  maxDepth: number;
  maxNodes: number;
  maxKeysPerObject: number;
  maxArrayLength: number;
  maxKeyLength: number;
  maxStringLength: number;
  maxTotalStringBytes: number;
}

type ObjectParent = { kind: "object"; container: { [key: string]: JsonValue }; key: string };
type ArrayParent = { kind: "array"; container: JsonValue[]; index: number };

interface WorkItem {
  value: unknown;
  depth: number;
  path: (string | number)[];
  parent: ObjectParent | ArrayParent;
}

/**
 * Validate + sanitize a `JSON.parse`d value into a safe `MachineLearningMetrics`
 * tree using an explicit work stack (no per-level recursive function calls,
 * so adversarially deep input fails a bounded check instead of overflowing
 * the call stack). The root MUST already be a plain object — callers check
 * that before calling this.
 */
function validateAndSanitize(
  root: Record<string, unknown>,
  bounds: Bounds,
): { ok: true; value: MachineLearningMetrics } | { ok: false; error: StructuredMetricsError } {
  const safeRoot: MachineLearningMetrics = Object.create(null) as MachineLearningMetrics;
  let nodeCount = 1; // the root object itself
  let totalStringBytes = 0;

  const rootEntries = Object.entries(root);
  if (rootEntries.length > bounds.maxKeysPerObject) {
    return fail(
      "metrics/object-too-large",
      `metrics.json has ${rootEntries.length} top-level keys, exceeding the ${bounds.maxKeysPerObject}-key limit.`,
    );
  }

  const keyCheck = checkObjectKeys(rootEntries.map(([k]) => k), []);
  if (keyCheck) return keyCheck;

  // Stack, pushed in REVERSE so pop() yields entries in declaration order —
  // purely cosmetic (which violation is reported first when several exist),
  // never a correctness requirement.
  const stack: WorkItem[] = [];
  for (let i = rootEntries.length - 1; i >= 0; i -= 1) {
    const [key, value] = rootEntries[i]!;
    stack.push({ value, depth: 2, path: [key], parent: { kind: "object", container: safeRoot, key } });
  }

  while (stack.length > 0) {
    const item = stack.pop()!;
    nodeCount += 1;
    if (nodeCount > bounds.maxNodes) {
      return fail(
        "metrics/max-nodes-exceeded",
        `metrics.json has more than ${bounds.maxNodes} total values (objects, arrays, and primitives combined).`,
        formatPath(item.path),
      );
    }

    const { value } = item;

    if (value === null || typeof value !== "object") {
      // Primitive leaf.
      if (typeof value === "number" && !Number.isFinite(value)) {
        return fail("metrics/invalid-number", `metric "${formatPath(item.path)}" is not a finite number.`, formatPath(item.path));
      }
      if (typeof value === "string") {
        if (value.length > bounds.maxStringLength) {
          return fail(
            "metrics/string-too-long",
            `metric "${formatPath(item.path)}" exceeds the ${bounds.maxStringLength}-character string value limit.`,
            formatPath(item.path),
          );
        }
        totalStringBytes += Buffer.byteLength(value, "utf8");
        if (totalStringBytes > bounds.maxTotalStringBytes) {
          return fail(
            "metrics/string-too-long",
            `metrics.json's combined string content exceeds the ${bounds.maxTotalStringBytes}-byte total limit.`,
            formatPath(item.path),
          );
        }
      }
      setOnParent(item.parent, value as JsonPrimitive);
      continue;
    }

    if (item.depth > bounds.maxDepth) {
      return fail(
        "metrics/max-depth-exceeded",
        `metric "${formatPath(item.path)}" nests deeper than the ${bounds.maxDepth}-level limit.`,
        formatPath(item.path),
      );
    }

    if (Array.isArray(value)) {
      if (value.length > bounds.maxArrayLength) {
        return fail(
          "metrics/array-too-large",
          `metric "${formatPath(item.path)}" has ${value.length} elements, exceeding the ${bounds.maxArrayLength}-element limit.`,
          formatPath(item.path),
        );
      }
      const safeArray: JsonValue[] = [];
      setOnParent(item.parent, safeArray);
      for (let i = value.length - 1; i >= 0; i -= 1) {
        stack.push({
          value: value[i],
          depth: item.depth + 1,
          path: [...item.path, i],
          parent: { kind: "array", container: safeArray, index: i },
        });
      }
      continue;
    }

    // Plain object (JSON.parse never produces anything else here).
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > bounds.maxKeysPerObject) {
      return fail(
        "metrics/object-too-large",
        `metric "${formatPath(item.path)}" has ${entries.length} keys, exceeding the ${bounds.maxKeysPerObject}-key limit.`,
        formatPath(item.path),
      );
    }
    const nestedKeyCheck = checkObjectKeys(
      entries.map(([k]) => k),
      item.path,
    );
    if (nestedKeyCheck) return nestedKeyCheck;

    const safeObject: { [key: string]: JsonValue } = Object.create(null) as { [key: string]: JsonValue };
    setOnParent(item.parent, safeObject);
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const [key, childValue] = entries[i]!;
      stack.push({
        value: childValue,
        depth: item.depth + 1,
        path: [...item.path, key],
        parent: { kind: "object", container: safeObject, key },
      });
    }
  }

  return { ok: true, value: safeRoot };

  function checkObjectKeys(keys: string[], parentPath: (string | number)[]) {
    const seenTrimmed = new Map<string, string>();
    for (const key of keys) {
      const pathLabel = formatPath([...parentPath, key]);
      if (DANGEROUS_KEYS.has(key)) {
        return fail("metrics/dangerous-key", `metric key "${key}" is not allowed.`, pathLabel);
      }
      const trimmed = key.trim();
      if (trimmed.length === 0) {
        return fail("metrics/invalid-key", "metric keys must be non-empty (after trimming whitespace).", pathLabel);
      }
      if (key.length > bounds.maxKeyLength) {
        return fail(
          "metrics/invalid-key",
          `metric key "${key.slice(0, 40)}…" exceeds the ${bounds.maxKeyLength}-character limit.`,
          pathLabel,
        );
      }
      if (hasControlCharacter(key)) {
        return fail("metrics/invalid-key", `metric key "${key}" contains control characters.`, pathLabel);
      }
      const priorRawKey = seenTrimmed.get(trimmed);
      if (priorRawKey !== undefined && priorRawKey !== key) {
        return fail(
          "metrics/invalid-key",
          `metric keys "${priorRawKey}" and "${key}" are ambiguous (identical once whitespace is trimmed).`,
          pathLabel,
        );
      }
      seenTrimmed.set(trimmed, key);
    }
    return null;
  }
}

function setOnParent(parent: ObjectParent | ArrayParent, value: JsonValue): void {
  if (parent.kind === "object") parent.container[parent.key] = value;
  else parent.container[parent.index] = value;
}

// ── Requirements (requiredPaths / expectedTypes / assertions) ──────────────

function checkRequirements(
  metrics: MachineLearningMetrics,
  options: MachineLearningMetricsOptions,
): StructuredMetricsError | null {
  if (options.requiredPaths) {
    for (const pointer of options.requiredPaths) {
      const segments = parseJsonPointer(pointer);
      if (segments === null) return { code: "metrics/invalid-path", message: `"${pointer}" is not a valid JSON Pointer.` };
      const resolved = resolveJsonPointer(metrics, segments);
      if (!resolved.found) {
        return { code: "metrics/missing-required-path", message: `metrics.json is missing required path "${pointer}".`, key: pointer };
      }
    }
  }

  if (options.expectedTypes) {
    for (const [pointer, expected] of Object.entries(options.expectedTypes)) {
      const segments = parseJsonPointer(pointer);
      if (segments === null) return { code: "metrics/invalid-path", message: `"${pointer}" is not a valid JSON Pointer.` };
      const resolved = resolveJsonPointer(metrics, segments);
      if (!resolved.found) continue; // presence is `requiredPaths`' job, not this one's
      const actual = typeNameOf(resolved.value!);
      if (actual !== expected) {
        return {
          code: "metrics/type-mismatch",
          message: `metric "${pointer}" expected type "${expected}" but got "${actual}".`,
          key: pointer,
        };
      }
    }
  }

  if (options.assertions) {
    for (const assertion of options.assertions) {
      const error = checkAssertion(metrics, assertion);
      if (error) return error;
    }
  }

  return null;
}

function checkAssertion(metrics: MachineLearningMetrics, assertion: MachineLearningMetricAssertion): StructuredMetricsError | null {
  const segments = parseJsonPointer(assertion.path);
  if (segments === null) {
    return { code: "metrics/invalid-path", message: `"${assertion.path}" is not a valid JSON Pointer.` };
  }
  const resolved = resolveJsonPointer(metrics, segments);
  if (!resolved.found) {
    return {
      code: "metrics/missing-required-path",
      message: `metrics.json is missing required path "${assertion.path}".`,
      key: assertion.path,
    };
  }
  const value = resolved.value!;
  const actual = typeNameOf(value);

  if (assertion.type && actual !== assertion.type) {
    return {
      code: "metrics/type-mismatch",
      message: `metric "${assertion.path}" expected type "${assertion.type}" but got "${actual}".`,
      key: assertion.path,
    };
  }
  if (assertion.minimum !== undefined || assertion.maximum !== undefined || assertion.integer) {
    if (typeof value !== "number") {
      return {
        code: "metrics/type-mismatch",
        message: `metric "${assertion.path}" expected type "number" but got "${actual}".`,
        key: assertion.path,
      };
    }
    if (assertion.integer && !Number.isInteger(value)) {
      return { code: "metrics/integer-required", message: `metric "${assertion.path}" must be an integer.`, key: assertion.path };
    }
    if (assertion.minimum !== undefined && value < assertion.minimum) {
      return {
        code: "metrics/minimum-violation",
        message: `metric "${assertion.path}" is ${value}, below the minimum of ${assertion.minimum}.`,
        key: assertion.path,
      };
    }
    if (assertion.maximum !== undefined && value > assertion.maximum) {
      return {
        code: "metrics/maximum-violation",
        message: `metric "${assertion.path}" is ${value}, above the maximum of ${assertion.maximum}.`,
        key: assertion.path,
      };
    }
  }
  if (assertion.minItems !== undefined || assertion.maxItems !== undefined) {
    if (!Array.isArray(value)) {
      return {
        code: "metrics/type-mismatch",
        message: `metric "${assertion.path}" expected type "array" but got "${actual}".`,
        key: assertion.path,
      };
    }
    if (assertion.minItems !== undefined && value.length < assertion.minItems) {
      return {
        code: "metrics/min-items-violation",
        message: `metric "${assertion.path}" has ${value.length} items, below the minimum of ${assertion.minItems}.`,
        key: assertion.path,
      };
    }
    if (assertion.maxItems !== undefined && value.length > assertion.maxItems) {
      return {
        code: "metrics/max-items-violation",
        message: `metric "${assertion.path}" has ${value.length} items, above the maximum of ${assertion.maxItems}.`,
        key: assertion.path,
      };
    }
  }

  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse and validate a candidate-generated metrics.json. Pure - no fs, no
 * network, never throws. Accepts the raw file content as either a `string`
 * or a `Buffer` (server callers reading straight off disk can pass either).
 *
 * Accepted shape: a plain JSON object at the root, whose values may be
 * finite numbers, strings, booleans, `null`, arrays, or nested plain
 * objects, bounded recursively (depth/node-count/object-size/array-length/
 * string-length/total-string-bytes). Dangerous keys (`__proto__`/
 * `constructor`/`prototype`) are rejected at every depth, not just the top
 * level. This function never throws and never returns a partially-valid
 * result — the first violation found aborts the whole parse.
 */
export function parseMachineLearningMetrics(
  content: string | Buffer,
  options: MachineLearningMetricsOptions = {},
): ParseMachineLearningMetricsResult {
  const bounds: Bounds = {
    maxDepth: options.maxDepth ?? ML_METRICS_MAX_DEPTH,
    maxNodes: options.maxNodes ?? ML_METRICS_MAX_NODES,
    maxKeysPerObject: options.maxKeysPerObject ?? ML_METRICS_MAX_KEYS_PER_OBJECT,
    maxArrayLength: options.maxArrayLength ?? ML_METRICS_MAX_ARRAY_LENGTH,
    maxKeyLength: options.maxKeyLength ?? ML_METRICS_MAX_KEY_LENGTH,
    maxStringLength: options.maxStringLength ?? ML_METRICS_MAX_STRING_LENGTH,
    maxTotalStringBytes: options.maxTotalStringBytes ?? ML_METRICS_MAX_TOTAL_STRING_BYTES,
  };
  const maxBytes = options.maxBytes ?? ML_METRICS_MAX_BYTES;

  const byteLength = typeof content === "string" ? Buffer.byteLength(content, "utf8") : content.length;
  if (byteLength > maxBytes) {
    return fail("metrics/file-too-large", `metrics.json is ${byteLength} bytes, exceeding the ${maxBytes}-byte limit.`);
  }

  let text: string;
  if (typeof content === "string") {
    text = content;
  } else {
    // Buffer#toString("utf8") never throws - invalid byte sequences decode to
    // the replacement character instead, which we treat as a structured
    // encoding error rather than silently parsing mangled text.
    text = content.toString("utf8");
    if (text.indexOf("�") !== -1) {
      return fail("metrics/invalid-encoding", "metrics.json is not valid UTF-8 text.");
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return fail("metrics/invalid-json", "metrics.json is not valid JSON: " + reason);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail(
      "metrics/root-not-object",
      "metrics.json must be a plain JSON object (not an array, string, number, boolean, or null) at the root.",
    );
  }

  const sanitized = validateAndSanitize(parsed as Record<string, unknown>, bounds);
  if (!sanitized.ok) return sanitized;

  const requirementError = checkRequirements(sanitized.value, options);
  if (requirementError) return { ok: false, error: requirementError };

  return { ok: true, metrics: sanitized.value };
}
