import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".codex/**",
    ".impeccable/**",
    "test-results/**",
    ".agents/skills/emil-design-eng/**",
    ".agents/skills/impeccable/**",
    ".agents/skills/review-animations/**",
  ]),
]);

export default eslintConfig;
