import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only`/`client-only` are build-boundary markers; stub them in tests.
      "server-only": path.resolve(__dirname, "test/stubs/empty.ts"),
      "client-only": path.resolve(__dirname, "test/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    testTimeout: 15_000,
    // Local-only reference drops are excluded by convention.
    // A scenario's own `tests/` files target the engine-injected harness and run
    // via the Node/React engines (`scenario:check`), never as Vitest suites — but
    // content-level suites (e.g. preview coverage) are real Vitest tests, so only
    // the per-scenario `<category>/<slug>/tests/` folders are excluded here.
    exclude: [
      ...configDefaults.exclude,
      "reference/**",
      ".scenario-runtime/**",
      "content/interview-scenarios/*/*/tests/**",
    ],
  },
});
