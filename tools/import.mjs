#!/usr/bin/env node
// Publish a note from the Obsidian vault into src/posts/.
//
// This is deliberately a separate, explicit step rather than part of the build:
// the vault lives outside the repo, so CI can only ever see what was committed.
//
//   node tools/import.mjs "<vault file>" <slug> [--title "..."] [--force]
//
// The post date is taken from the vault file's mtime and written into the
// frontmatter, because git does not preserve mtimes — without this, every post
// would be stamped with the CI checkout time.
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const [src, slug, ...rest] = process.argv.slice(2);
if (!src || !slug) {
  console.error('usage: node tools/import.mjs "<vault file>" <slug> [--title "..."] [--force]');
  process.exit(1);
}
const force = rest.includes("--force");
const titleArg = rest[rest.indexOf("--title") + 1];
const title = rest.includes("--title") ? titleArg : src.split("/").pop().replace(/\.md$/, "");

const date = statSync(src).mtime.toISOString().slice(0, 10);
const out = `src/posts/${slug}.md`;
if (existsSync(out) && !force) {
  console.error(`${out} already exists — pass --force to overwrite (hand edits will be lost)`);
  process.exit(1);
}

let body = readFileSync(src, "utf8")
  // [^1]:text -> [^1]: text  (markdown-it-footnote wants the space)
  .replace(/^(\[\^[^\]]+\]:)(?=\S)/gm, "$1 ")
  // Obsidian [[wikilinks]] point at unpublished notes; flatten to plain text.
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .trim();

const esc = (s) => `"${s.replace(/"/g, '\\"')}"`;
writeFileSync(out, `---\ntitle: ${esc(title)}\ndate: ${date}\n---\n\n${body}\n`);
console.log(`${out}  (${title}, ${date})`);
