import { describe, expect, it } from "vitest";
import {
  machineLearningMetricsMissingError,
  parseJsonPointer,
  parseMachineLearningMetrics,
  ML_METRICS_MAX_ARRAY_LENGTH,
  ML_METRICS_MAX_BYTES,
  ML_METRICS_MAX_DEPTH,
  ML_METRICS_MAX_KEY_LENGTH,
  ML_METRICS_MAX_KEYS_PER_OBJECT,
  ML_METRICS_MAX_NODES,
  ML_METRICS_MAX_STRING_LENGTH,
} from "@/lib/scenarios/machine-learning-metrics";

function ok(result: ReturnType<typeof parseMachineLearningMetrics>) {
  if (!result.ok) throw new Error("expected ok:true, got error " + result.error.code + ": " + result.error.message);
  return result.metrics;
}

function errorCode(result: ReturnType<typeof parseMachineLearningMetrics>) {
  if (result.ok) throw new Error("expected ok:false, got a successful parse");
  return result.error.code;
}

describe("parseMachineLearningMetrics — valid flat inputs (backward compatibility)", () => {
  it("accepts an empty object", () => {
    expect(ok(parseMachineLearningMetrics("{}"))).toEqual({});
  });

  it("accepts numeric metrics", () => {
    expect(ok(parseMachineLearningMetrics('{"accuracy": 0.93, "epochs": 10}'))).toEqual({ accuracy: 0.93, epochs: 10 });
  });

  it("accepts string metrics", () => {
    expect(ok(parseMachineLearningMetrics('{"model": "DecisionTreeClassifier"}'))).toEqual({
      model: "DecisionTreeClassifier",
    });
  });

  it("accepts boolean metrics", () => {
    expect(ok(parseMachineLearningMetrics('{"converged": true, "overfit": false}'))).toEqual({
      converged: true,
      overfit: false,
    });
  });

  it("accepts null metrics", () => {
    expect(ok(parseMachineLearningMetrics('{"roc_auc": null}'))).toEqual({ roc_auc: null });
  });

  it("accepts mixed primitive metrics", () => {
    const metrics = ok(
      parseMachineLearningMetrics(
        JSON.stringify({ accuracy: 0.9, model: "LogisticRegression", converged: true, best_score: null }),
      ),
    );
    expect(metrics).toEqual({ accuracy: 0.9, model: "LogisticRegression", converged: true, best_score: null });
  });

  it("accepts UTF-8 string values", () => {
    expect(ok(parseMachineLearningMetrics('{"model_name": "régression logistique 日本語"}'))).toEqual({
      model_name: "régression logistique 日本語",
    });
  });

  it("accepts a Buffer as input", () => {
    const buffer = Buffer.from('{"accuracy": 0.9}', "utf8");
    expect(ok(parseMachineLearningMetrics(buffer))).toEqual({ accuracy: 0.9 });
  });

  it("a pre-upgrade flat metrics.json (existing Easy scenario shape) remains valid, unchanged", () => {
    const flat = { accuracy: 0.91, f1: 0.88, train_rows: 75, test_rows: 20, model: "LogisticRegression" };
    expect(ok(parseMachineLearningMetrics(JSON.stringify(flat)))).toEqual(flat);
  });
});

describe("parseMachineLearningMetrics — nested objects, arrays, and matrices", () => {
  it("accepts a nested object", () => {
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ summary: { accuracy: 0.84, f1: 0.75 } })));
    expect(metrics).toEqual({ summary: { accuracy: 0.84, f1: 0.75 } });
  });

  it("accepts a flat array of numbers", () => {
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ fold_scores: [0.71, 0.75, 0.73] })));
    expect(metrics.fold_scores).toEqual([0.71, 0.75, 0.73]);
  });

  it("accepts a 2D numeric matrix (confusion_matrix)", () => {
    const metrics = ok(
      parseMachineLearningMetrics(
        JSON.stringify({
          confusion_matrix: [
            [92, 8],
            [11, 39],
          ],
        }),
      ),
    );
    expect(metrics.confusion_matrix).toEqual([
      [92, 8],
      [11, 39],
    ]);
  });

  it("accepts the full illustrative structured example (summary, cross_validation, confusion_matrix, per_class, model)", () => {
    const example = {
      summary: { accuracy: 0.84, precision: 0.73, recall: 0.77, f1: 0.75, roc_auc: 0.85 },
      cross_validation: { metric: "f1", fold_scores: [0.71, 0.75, 0.73, 0.78, 0.74], mean: 0.742, std: 0.023 },
      confusion_matrix: [
        [92, 8],
        [11, 39],
      ],
      per_class: {
        non_defective: { precision: 0.89, recall: 0.92, f1: 0.9, support: 100 },
        defective: { precision: 0.83, recall: 0.78, f1: 0.8, support: 50 },
      },
      model: { name: "LogisticRegression", parameters: { class_weight: "balanced", max_iter: 2000 } },
    };
    expect(ok(parseMachineLearningMetrics(JSON.stringify(example)))).toEqual(example);
  });

  it("accepts an array of objects", () => {
    const metrics = ok(
      parseMachineLearningMetrics(JSON.stringify({ trials: [{ lr: 0.01, score: 0.8 }, { lr: 0.1, score: 0.75 }] })),
    );
    expect(metrics.trials).toEqual([{ lr: 0.01, score: 0.8 }, { lr: 0.1, score: 0.75 }]);
  });

  it("accepts mixed-type arrays (heterogeneous, still valid JSON)", () => {
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ mixed: [1, "two", true, null, { a: 1 }] })));
    expect(metrics.mixed).toEqual([1, "two", true, null, { a: 1 }]);
  });
});

describe("parseMachineLearningMetrics — recursive bounds: depth", () => {
  function nestedAtDepth(depth: number): unknown {
    // depth=1 is the root object itself; each extra level wraps one more object.
    let value: unknown = { leaf: 1 };
    for (let i = 1; i < depth; i += 1) value = { child: value };
    return value;
  }

  it("accepts nesting right at the maximum depth", () => {
    const doc = nestedAtDepth(ML_METRICS_MAX_DEPTH);
    expect(ok(parseMachineLearningMetrics(JSON.stringify(doc))).child).toBeDefined();
  });

  it("rejects nesting one level past the maximum depth", () => {
    const doc = nestedAtDepth(ML_METRICS_MAX_DEPTH + 1);
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify(doc)))).toBe("metrics/max-depth-exceeded");
  });

  it("respects a custom (smaller) maxDepth override", () => {
    expect(errorCode(parseMachineLearningMetrics('{"a": {"b": 1}}', { maxDepth: 1 }))).toBe("metrics/max-depth-exceeded");
  });
});

describe("parseMachineLearningMetrics — recursive bounds: node count", () => {
  it("rejects a document with more than the maximum total node count", () => {
    // 1 root + N keys, each holding a small unique primitive — well past the cap.
    const obj: Record<string, number> = {};
    for (let i = 0; i < ML_METRICS_MAX_NODES + 10; i += 1) obj["m" + i] = i;
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify(obj)))).toMatch(
      /^metrics\/(too-many-entries|object-too-large|max-nodes-exceeded)$/,
    );
  });

  it("respects a custom (smaller) maxNodes override", () => {
    const doc = { a: 1, b: 2, c: 3 };
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify(doc), { maxNodes: 2 }))).toBe("metrics/max-nodes-exceeded");
  });
});

describe("parseMachineLearningMetrics — recursive bounds: object size", () => {
  it("accepts an object with exactly the maximum number of keys, at a nested level", () => {
    const inner: Record<string, number> = {};
    for (let i = 0; i < ML_METRICS_MAX_KEYS_PER_OBJECT; i += 1) inner["m" + i] = i;
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ summary: inner })));
    expect(Object.keys(metrics.summary as object)).toHaveLength(ML_METRICS_MAX_KEYS_PER_OBJECT);
  });

  it("rejects a nested object with more than the maximum number of keys", () => {
    const inner: Record<string, number> = {};
    for (let i = 0; i < ML_METRICS_MAX_KEYS_PER_OBJECT + 1; i += 1) inner["m" + i] = i;
    const result = parseMachineLearningMetrics(JSON.stringify({ summary: inner }));
    expect(errorCode(result)).toBe("metrics/object-too-large");
    if (!result.ok) expect(result.error.key).toContain("summary");
  });

  it("rejects an oversized object at the root", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < ML_METRICS_MAX_KEYS_PER_OBJECT + 1; i += 1) obj["m" + i] = i;
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify(obj)))).toBe("metrics/object-too-large");
  });
});

describe("parseMachineLearningMetrics — recursive bounds: array size", () => {
  it("accepts an array at exactly the maximum length", () => {
    const arr = Array.from({ length: ML_METRICS_MAX_ARRAY_LENGTH }, (_, i) => i);
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ scores: arr })));
    expect((metrics.scores as unknown[]).length).toBe(ML_METRICS_MAX_ARRAY_LENGTH);
  });

  it("rejects an array one element past the maximum length", () => {
    const arr = Array.from({ length: ML_METRICS_MAX_ARRAY_LENGTH + 1 }, (_, i) => i);
    const result = parseMachineLearningMetrics(JSON.stringify({ scores: arr }));
    expect(errorCode(result)).toBe("metrics/array-too-large");
    if (!result.ok) expect(result.error.key).toContain("scores");
  });
});

describe("parseMachineLearningMetrics — dangerous keys at every depth", () => {
  it("rejects __proto__ at the top level", () => {
    expect(errorCode(parseMachineLearningMetrics('{"__proto__": 1}'))).toBe("metrics/dangerous-key");
  });

  it("rejects constructor at the top level", () => {
    expect(errorCode(parseMachineLearningMetrics('{"constructor": 1}'))).toBe("metrics/dangerous-key");
  });

  it("rejects prototype at the top level", () => {
    expect(errorCode(parseMachineLearningMetrics('{"prototype": 1}'))).toBe("metrics/dangerous-key");
  });

  it("rejects __proto__ nested two levels deep", () => {
    // Raw JSON text, not JSON.stringify(jsObjectLiteral) — a JS object
    // LITERAL's `{ __proto__: 1 }` is special-cased by the language to set
    // the prototype rather than create an own "__proto__" property, so
    // JSON.stringify would silently drop it. JSON.parse of raw text has no
    // such special case and creates a genuine own property, which is
    // exactly the adversarial input this check defends against.
    const result = parseMachineLearningMetrics('{"model": {"params": {"__proto__": 1}}}');
    expect(errorCode(result)).toBe("metrics/dangerous-key");
  });

  it("rejects constructor inside an array of objects", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ trials: [{ ok: 1 }, { constructor: 2 }] }));
    expect(errorCode(result)).toBe("metrics/dangerous-key");
  });

  it("never pollutes Object.prototype even when a dangerous key is attempted deeply", () => {
    // Raw JSON text — see the note on the "__proto__ nested two levels deep"
    // test above for why JSON.stringify(objectLiteral) can't produce this input.
    parseMachineLearningMetrics('{"a": {"b": {"__proto__": {"polluted": true}}}}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("every nested object in the sanitized result has no prototype (Object.create(null))", () => {
    const metrics = ok(parseMachineLearningMetrics(JSON.stringify({ summary: { accuracy: 0.9 } })));
    expect(Object.getPrototypeOf(metrics)).toBeNull();
    expect(Object.getPrototypeOf(metrics.summary as object)).toBeNull();
  });
});

describe("parseMachineLearningMetrics — invalid JSON / root shape", () => {
  it("rejects malformed JSON", () => {
    expect(errorCode(parseMachineLearningMetrics("{not json"))).toBe("metrics/invalid-json");
  });

  it("rejects truncated JSON", () => {
    expect(errorCode(parseMachineLearningMetrics('{"accuracy": 0.9'))).toBe("metrics/invalid-json");
  });

  it("rejects trailing non-JSON content", () => {
    expect(errorCode(parseMachineLearningMetrics('{"accuracy": 0.9} garbage'))).toBe("metrics/invalid-json");
  });

  it("rejects an empty string", () => {
    expect(errorCode(parseMachineLearningMetrics(""))).toBe("metrics/invalid-json");
  });

  it("rejects a root array", () => {
    expect(errorCode(parseMachineLearningMetrics("[1, 2, 3]"))).toBe("metrics/root-not-object");
  });

  it("rejects a root string", () => {
    expect(errorCode(parseMachineLearningMetrics('"hello"'))).toBe("metrics/root-not-object");
  });

  it("rejects a root number", () => {
    expect(errorCode(parseMachineLearningMetrics("42"))).toBe("metrics/root-not-object");
  });

  it("rejects a root boolean", () => {
    expect(errorCode(parseMachineLearningMetrics("true"))).toBe("metrics/root-not-object");
  });

  it("rejects a root null", () => {
    expect(errorCode(parseMachineLearningMetrics("null"))).toBe("metrics/root-not-object");
  });
});

describe("parseMachineLearningMetrics — invalid keys and values", () => {
  it("rejects an empty key", () => {
    expect(errorCode(parseMachineLearningMetrics('{"": 1}'))).toBe("metrics/invalid-key");
  });

  it("rejects a whitespace-only key", () => {
    expect(errorCode(parseMachineLearningMetrics('{"   ": 1}'))).toBe("metrics/invalid-key");
  });

  it("rejects an overly long key", () => {
    const key = "a".repeat(ML_METRICS_MAX_KEY_LENGTH + 1);
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify({ [key]: 1 })))).toBe("metrics/invalid-key");
  });

  it("rejects a key containing control characters", () => {
    expect(errorCode(parseMachineLearningMetrics('{"acc\\u0007uracy": 1}'))).toBe("metrics/invalid-key");
  });

  it("rejects ambiguous keys that only differ by trimmed whitespace, within the same object", () => {
    expect(errorCode(parseMachineLearningMetrics('{"accuracy": 1, " accuracy ": 2}'))).toBe("metrics/invalid-key");
  });

  it("rejects an overly long string value, at a nested level", () => {
    const value = "x".repeat(ML_METRICS_MAX_STRING_LENGTH + 1);
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify({ model: { name: value } })))).toBe(
      "metrics/string-too-long",
    );
  });

  it("rejects an oversized file", () => {
    const value = "x".repeat(ML_METRICS_MAX_BYTES + 1);
    expect(errorCode(parseMachineLearningMetrics(JSON.stringify({ note: value })))).toBe("metrics/file-too-large");
  });

  it("respects a custom (smaller) maxBytes override", () => {
    expect(errorCode(parseMachineLearningMetrics('{"a": 1}', { maxBytes: 4 }))).toBe("metrics/file-too-large");
  });

  it("rejects a value that becomes Infinity via JSON's own numeric parsing (1e400)", () => {
    expect(errorCode(parseMachineLearningMetrics('{"overflow": 1e400}'))).toBe("metrics/invalid-number");
  });

  it("rejects a value that becomes -Infinity via JSON's own numeric parsing (-1e400), nested", () => {
    // Raw JSON text — `-1e400` as a JS expression evaluates to `-Infinity`
    // immediately, and `JSON.stringify(-Infinity)` emits `null`, masking the
    // exact adversarial case (literal huge-exponent digits in the FILE) this
    // check exists for.
    expect(errorCode(parseMachineLearningMetrics('{"summary": {"underflow": -1e400}}'))).toBe("metrics/invalid-number");
  });

  it("rejects invalid UTF-8 encoding in a Buffer", () => {
    // A lone continuation byte (0x80) is invalid standalone UTF-8.
    const buffer = Buffer.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x31, 0x7d, 0x80]); // {"a":1} + invalid byte
    expect(errorCode(parseMachineLearningMetrics(buffer))).toBe("metrics/invalid-encoding");
  });
});

describe("parseJsonPointer", () => {
  it("parses a simple pointer", () => {
    expect(parseJsonPointer("/summary/accuracy")).toEqual(["summary", "accuracy"]);
  });

  it("parses the root pointer as an empty segment list", () => {
    expect(parseJsonPointer("")).toEqual([]);
  });

  it("unescapes ~1 to / and ~0 to ~", () => {
    expect(parseJsonPointer("/a~1b/c~0d")).toEqual(["a/b", "c~d"]);
  });

  it("rejects a pointer that doesn't start with /", () => {
    expect(parseJsonPointer("summary/accuracy")).toBeNull();
  });
});

describe("parseMachineLearningMetrics — requiredPaths (JSON Pointer)", () => {
  it("passes when all required paths are present, including nested ones", () => {
    const metrics = ok(
      parseMachineLearningMetrics(JSON.stringify({ summary: { accuracy: 0.9, f1: 0.8 } }), {
        requiredPaths: ["/summary/accuracy", "/summary/f1"],
      }),
    );
    expect(metrics).toEqual({ summary: { accuracy: 0.9, f1: 0.8 } });
  });

  it("supports a required path into an array element", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ confusion_matrix: [[1, 2], [3, 4]] }), {
      requiredPaths: ["/confusion_matrix/0/1"],
    });
    expect(result.ok).toBe(true);
  });

  it("fails with metrics/missing-required-path when a required path is absent", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ summary: { accuracy: 0.9 } }), {
      requiredPaths: ["/summary/accuracy", "/summary/f1"],
    });
    expect(errorCode(result)).toBe("metrics/missing-required-path");
    if (!result.ok) expect(result.error.key).toBe("/summary/f1");
  });

  it("fails with metrics/invalid-path for a malformed JSON Pointer", () => {
    const result = parseMachineLearningMetrics('{"a": 1}', { requiredPaths: ["a"] }); // missing leading "/"
    expect(errorCode(result)).toBe("metrics/invalid-path");
  });

  it("does not require exact key equality — additional valid metrics are allowed", () => {
    const metrics = ok(
      parseMachineLearningMetrics(JSON.stringify({ accuracy: 0.9, f1: 0.8, notes: "extra" }), {
        requiredPaths: ["/accuracy"],
      }),
    );
    expect(metrics.notes).toBe("extra");
  });
});

describe("parseMachineLearningMetrics — expectedTypes (JSON Pointer, extended type names)", () => {
  it("passes when an expected type matches, including array/object", () => {
    const metrics = ok(
      parseMachineLearningMetrics(JSON.stringify({ accuracy: 0.9, model: { name: "SVC" }, scores: [1, 2] }), {
        expectedTypes: { "/accuracy": "number", "/model": "object", "/scores": "array" },
      }),
    );
    expect(metrics.accuracy).toBe(0.9);
  });

  it("fails with metrics/type-mismatch when an expected type does not match", () => {
    const result = parseMachineLearningMetrics('{"accuracy": "high"}', { expectedTypes: { "/accuracy": "number" } });
    expect(errorCode(result)).toBe("metrics/type-mismatch");
    if (!result.ok) expect(result.error.key).toBe("/accuracy");
  });

  it("fails with metrics/type-mismatch for a nested path", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ summary: { accuracy: "high" } }), {
      expectedTypes: { "/summary/accuracy": "number" },
    });
    expect(errorCode(result)).toBe("metrics/type-mismatch");
  });

  it("does not type-check a path that is absent (that's requiredPaths' job)", () => {
    const metrics = ok(parseMachineLearningMetrics("{}", { expectedTypes: { "/accuracy": "number" } }));
    expect(metrics).toEqual({});
  });
});

describe("parseMachineLearningMetrics — generic assertions", () => {
  it("passes a numeric range assertion within bounds", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ summary: { f1: 0.75 } }), {
      assertions: [{ path: "/summary/f1", type: "number", minimum: 0.65, maximum: 1 }],
    });
    expect(result.ok).toBe(true);
  });

  it("fails metrics/minimum-violation when a value is below the minimum", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ summary: { f1: 0.5 } }), {
      assertions: [{ path: "/summary/f1", minimum: 0.65 }],
    });
    expect(errorCode(result)).toBe("metrics/minimum-violation");
  });

  it("fails metrics/maximum-violation when a value is above the maximum", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ rmse: 500 }), {
      assertions: [{ path: "/rmse", maximum: 100 }],
    });
    expect(errorCode(result)).toBe("metrics/maximum-violation");
  });

  it("allows a metric to legitimately exceed [0,1] (e.g. RMSE, support counts) when no maximum is set", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ rmse: 45231.7, support: 500 }), {
      assertions: [{ path: "/rmse", type: "number" }],
    });
    expect(result.ok).toBe(true);
  });

  it("fails metrics/min-items-violation when an array is too short", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ confusion_matrix: [[1, 2]] }), {
      assertions: [{ path: "/confusion_matrix", type: "array", minItems: 2 }],
    });
    expect(errorCode(result)).toBe("metrics/min-items-violation");
  });

  it("fails metrics/max-items-violation when an array is too long", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ scores: [1, 2, 3, 4, 5] }), {
      assertions: [{ path: "/scores", maxItems: 3 }],
    });
    expect(errorCode(result)).toBe("metrics/max-items-violation");
  });

  it("passes an integer requirement", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ support: 100 }), {
      assertions: [{ path: "/support", integer: true }],
    });
    expect(result.ok).toBe(true);
  });

  it("fails metrics/integer-required when a value is not an integer", () => {
    const result = parseMachineLearningMetrics(JSON.stringify({ support: 100.5 }), {
      assertions: [{ path: "/support", integer: true }],
    });
    expect(errorCode(result)).toBe("metrics/integer-required");
  });

  it("fails metrics/missing-required-path when an asserted path is absent", () => {
    const result = parseMachineLearningMetrics("{}", { assertions: [{ path: "/summary/f1", minimum: 0.5 }] });
    expect(errorCode(result)).toBe("metrics/missing-required-path");
  });

  it("supports the full illustrative assertions example (path + type + min/max on f1, minItems/maxItems on confusion_matrix)", () => {
    const result = parseMachineLearningMetrics(
      JSON.stringify({ summary: { f1: 0.75 }, confusion_matrix: [[92, 8], [11, 39]] }),
      {
        assertions: [
          { path: "/summary/f1", type: "number", minimum: 0.65, maximum: 1 },
          { path: "/confusion_matrix", type: "array", minItems: 2, maxItems: 20 },
        ],
      },
    );
    expect(result.ok).toBe(true);
  });
});

describe("parseMachineLearningMetrics — security", () => {
  it("error messages never include a stack trace", () => {
    const result = parseMachineLearningMetrics("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toHaveProperty("stack");
      expect(JSON.stringify(result.error)).not.toContain("at parseMachineLearningMetrics");
    }
  });

  it("error messages never include a host filesystem path", () => {
    const result = parseMachineLearningMetrics("{not json");
    if (!result.ok) {
      expect(result.error.message).not.toMatch(/[A-Za-z]:\\/);
      expect(result.error.message).not.toContain("/home/");
      expect(result.error.message).not.toContain(process.cwd());
    }
  });

  it("does not crash (or hang) on adversarially deep input beyond the depth cap — proves the traversal is iterative, not recursive", () => {
    // Deep enough to be far past the depth cap without stressing V8's own
    // native JSON.parse/stringify recursion — the point is proving OUR
    // traversal is iterative and fails fast, not stress-testing V8 itself.
    let deep: unknown = { leaf: 1 };
    for (let i = 0; i < 2_000; i += 1) deep = { child: deep };
    const start = Date.now();
    const result = parseMachineLearningMetrics(JSON.stringify(deep));
    expect(Date.now() - start).toBeLessThan(5_000);
    expect(errorCode(result)).toBe("metrics/max-depth-exceeded");
  });
});

describe("machineLearningMetricsMissingError", () => {
  it("returns a stable metrics/missing error for the default path", () => {
    const error = machineLearningMetricsMissingError();
    expect(error.code).toBe("metrics/missing");
    expect(error.message).toContain("metrics.json");
  });

  it("accepts a custom path", () => {
    const error = machineLearningMetricsMissingError("outputs/metrics.json");
    expect(error.message).toContain("outputs/metrics.json");
  });
});
