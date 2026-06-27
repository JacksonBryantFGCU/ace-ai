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
    // The legacy backend/frontend under reference/ is porting reference only.
    exclude: [...configDefaults.exclude, "reference/**"],
  },
});
