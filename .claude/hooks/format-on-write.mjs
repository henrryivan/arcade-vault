// PostToolUse hook (matcher: Write|Edit). Pasa por Prettier y ESLint cada archivo creado o editado.
// ESLint corre al final y elimina las líneas en blanco del código (no-multiple-empty-lines).
// Solo se ejecuta dentro de Arcade Vault (vive en .claude/ del proyecto).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PRETTIER_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".mdx", ".css", ".html", ".yml", ".yaml",
]);
const ESLINT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRS = ["node_modules", ".next", ".git", "references", "out", "build"];

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd());
const abs = path.resolve(filePath);
const rel = path.relative(projectDir, abs);

// Solo archivos dentro del proyecto y fuera de carpetas ignoradas.
if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);
if (rel.split(path.sep).some((part) => IGNORED_DIRS.includes(part))) process.exit(0);
if (!existsSync(abs)) process.exit(0);

const ext = path.extname(abs).toLowerCase();
const BINS = {
  prettier: "node_modules/prettier/bin/prettier.cjs",
  eslint: "node_modules/eslint/bin/eslint.js",
};
const run = (bin, args) =>
  spawnSync(process.execPath, [path.join(projectDir, BINS[bin]), ...args], {
    cwd: projectDir,
    encoding: "utf8",
  });

const problems = [];

if (PRETTIER_EXT.has(ext)) {
  const r = run("prettier", ["--write", "--log-level", "warn", abs]);
  if (r.status !== 0) problems.push(`Prettier:\n${r.stdout}${r.stderr}`);
}

if (ESLINT_EXT.has(ext)) {
  // --fix aplica lo corregible; si quedan errores, salen por stdout.
  const r = run("eslint", ["--fix", abs]);
  if (r.status !== 0) problems.push(`ESLint:\n${r.stdout}${r.stderr}`);
}

if (problems.length) {
  // Exit 2 en PostToolUse: stderr se le muestra a Claude para que corrija.
  console.error(`Problemas en ${rel}:\n${problems.join("\n")}`);
  process.exit(2);
}
