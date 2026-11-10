/**
 * Typechecks every ```ts code block in docs/ (except the generated reference) against the source,
 * so examples cannot drift from the API.
 *
 * - Each block is its own module; `yt-music-node` resolves to src/index.ts.
 * - Blocks that use `ytm` without creating it get `declare const ytm: YTMusic` prepended.
 * - Put `<!-- no-check -->` on the line before a fence to skip it (e.g. partial snippets).
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DOCS = join(ROOT, "docs");
const WORK = join(ROOT, "node_modules/.cache/docs-typecheck");

async function markdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "reference" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await markdownFiles(path)));
    else if (entry.name.endsWith(".md")) out.push(path);
  }
  return out;
}

interface Block {
  file: string;
  line: number;
  code: string;
}

function extractBlocks(file: string, text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = /^(\s*)```(ts|typescript)\b/.exec(lines[i]!);
    if (!open) continue;
    const skip = /<!--\s*no-check\s*-->/.test(lines[i - 1] ?? "");
    const indent = open[1]!.length;
    const start = i + 1;
    let end = start;
    while (end < lines.length && !/^\s*```\s*$/.test(lines[end]!)) end++;
    // method signatures (`name(args): Type`) document a shape and aren't statements
    const signature = lines
      .slice(start, end)
      .filter((l) => l.trim())
      .every((l) => /^\s*(static\s+)?\w+(<.*>)?\(.*\):\s*\S.*$/.test(l));
    if (!skip && !signature) {
      const code = lines
        .slice(start, end)
        .map((l) => l.slice(indent))
        // VitePress line-highlight comments
        .map((l) => l.replace(/\s*\/\/ \[!code [^\]]+\]/, ""))
        .join("\n");
      blocks.push({ file, line: start + 1, code });
    }
    i = end;
  }
  return blocks;
}

function prelude(code: string): string {
  const lines: string[] = [];
  const definesYtm = /\b(const|let|var)\s+ytm\b/.test(code) || /\bytm\s*[,)]\s*=>|\(ytm[:,)]/.test(code);
  if (/\bytm\b/.test(code) && !definesYtm) {
    lines.push('declare const ytm: import("yt-music-node").YTMusic;');
  }
  return lines.join("\n");
}

const blocks: Block[] = [];
for (const file of await markdownFiles(DOCS)) blocks.push(...extractBlocks(file, await readFile(file, "utf8")));

await rm(WORK, { recursive: true, force: true });
await mkdir(WORK, { recursive: true });
const names = new Map<string, Block>();
for (const [index, block] of blocks.entries()) {
  const name = `block${String(index).padStart(3, "0")}.ts`;
  names.set(name, block);
  const header = `// ${relative(ROOT, block.file)}:${block.line}\n${prelude(block.code)}\n`;
  await writeFile(join(WORK, name), `${header}${block.code}\nexport {};\n`);
}
await writeFile(
  join(WORK, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "../../../tsconfig.json",
      compilerOptions: {
        noEmit: true,
        rootDir: "../../..",
        paths: { "yt-music-node": ["../../../src/index.ts"] },
        noUnusedLocals: false,
        types: ["node"],
        lib: ["ES2023", "DOM"],
      },
      include: ["*.ts"],
    },
    null,
    2,
  ),
);

try {
  execFileSync(join(ROOT, "node_modules/.bin/tsc"), ["-p", join(WORK, "tsconfig.json")], { stdio: "pipe" });
  console.log(`docs typecheck: ${blocks.length} code blocks ok`);
} catch (error) {
  const output = String((error as { stdout?: Buffer }).stdout ?? error);
  // map temp file locations back to the markdown source
  const mapped = output.replace(/(?:[^\s]*\/)?(block\d{3}\.ts)\((\d+),(\d+)\)/g, (_, name: string, line: string) => {
    const block = names.get(name)!;
    const headerLines = 1 + prelude(block.code).split("\n").length;
    return `${relative(ROOT, block.file)}:${block.line + Number(line) - 1 - headerLines}`;
  });
  console.error(mapped);
  process.exitCode = 1;
}
