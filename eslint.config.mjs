import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off ESLint rules that conflict with Prettier formatting.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".scenario-runtime/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy backend kept only as porting reference — not part of the app.
    "reference/**",
    // Authored scenario fixtures: starter files are intentionally incomplete and
    // solution/test files target the engine-injected harness (not npm packages).
    // They are transpiled by the engine at runtime and gated by `scenario:check`,
    // not the app's lint/typecheck. (Mirrors the `content` tsconfig exclude.)
    "content/**",
    // Behavioral-equivalence test fixtures: alternative/lookalike candidate
    // workspace source used only as fixture content in tests, same rationale
    // as the `content/**` scenario exclude above.
    "server/scenarios/fixtures/**",
    "server/scenarios/__fixtures__/**",
    // Generated: embedded React/csstype type declarations for Monaco.
    "lib/monaco/generated-libs.ts",
  ]),
]);

export default eslintConfig;
