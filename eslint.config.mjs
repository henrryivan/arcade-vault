import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      // Código compacto: sin líneas en blanco (autocorregible con --fix).
      "no-multiple-empty-lines": ["error", { max: 0, maxBOF: 0, maxEOF: 0 }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototipo de referencia (React global + Babel en el navegador), no es código de la app.
    "references/**",
  ]),
]);

export default eslintConfig;
