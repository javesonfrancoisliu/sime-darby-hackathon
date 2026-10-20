import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    ".claude/**",
    "**/.agents/**",
    "**/dist/**",
    "**/dev-dist/**",
    "**/coverage/**",
    "**/.turbo/**",
    "infra/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: [
      "apps/web/src/**/*.{ts,tsx}",
      "apps/elderly-web/src/**/*.{ts,tsx}",
      "apps/portal/src/**/*.{ts,tsx}",
      "packages/api-client/src/**/*.{ts,tsx}",
      "packages/auth/src/**/*.{ts,tsx}",
    ],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["apps/api/**/*.ts", "packages/**/*.mjs", "packages/**/*.ts", "**/*.config.{js,ts}"],
    ignores: ["packages/api-client/**", "packages/auth/**"],
    languageOptions: { globals: globals.node },
  },
);
