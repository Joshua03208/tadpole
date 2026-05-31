// Shared ESLint flat config (ESLint 10 + typescript-eslint 8).
// Consumed by packages/apps via: import tadpole from "@tadpole/config/eslint";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/node_modules/**",
      "**/*.config.*",
      "**/next-env.d.ts",
      "**/database.types.ts",
      "**/expo-env.d.ts",
      "**/nativewind-env.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      // TypeScript handles undefined-symbol checking; the core rule produces
      // false positives on DOM/RN globals and the automatic JSX runtime.
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
