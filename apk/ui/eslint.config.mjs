import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "local-ai/**/.venv/**",
    "local-ai/**/.cache/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
