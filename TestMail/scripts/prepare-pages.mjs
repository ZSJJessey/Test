import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectDir = resolve(process.cwd());
const distDir = resolve(projectDir, "dist");
const docsDir = resolve(projectDir, "..", "docs");

async function main() {
  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });
  await cp(distDir, docsDir, { recursive: true });
  await writeFile(resolve(docsDir, ".nojekyll"), "");
  console.log("Pages files are prepared in /docs.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
