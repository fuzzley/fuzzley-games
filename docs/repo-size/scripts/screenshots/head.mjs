#!/usr/bin/env node
/**
 * Lists the screenshots tracked at HEAD: for each game and folder, how many
 * files of each name and format, their sizes in pixels, and their bytes.
 *
 *   node docs/repo-size/scripts/screenshots/head.mjs
 *
 * Writes `docs/repo-size/data/screenshots/head.txt`.
 */
import { execFileSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
/** @type {typeof import("sharp")} */
const sharp = createRequire(join(REPO, "frontend/package.json"))("sharp");

const files = execFileSync(
  "git",
  [
    "ls-files",
    "--",
    "frontend/games/*/docs/screenshots/*",
    "frontend/games/*/public/docs/screenshots/*",
  ],
  { cwd: REPO, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

/** @type {Map<string, {count: number, bytes: number, sizes: Set<string>}>} */
const groups = new Map();
/** @type {Map<string, {count: number, bytes: number}>} */
const byGame = new Map();
let total = 0;
for (const file of files) {
  const match = file.match(
    /^frontend\/games\/([^/]+)\/(public\/)?docs\/screenshots\/(?:[^/]+\/)?([^/]+)$/,
  );
  if (!match) continue;
  const [, game = "", isPublic, name = ""] = match;
  const folder = isPublic ? "public" : "originals";
  const bytes = statSync(join(REPO, file)).size;
  const { width, height } = await sharp(join(REPO, file)).metadata();
  const key = `${game}\t${folder}\t${name}`;
  const group = groups.get(key) ?? { count: 0, bytes: 0, sizes: new Set() };
  group.count += 1;
  group.bytes += bytes;
  group.sizes.add(`${width}x${height}`);
  groups.set(key, group);
  const gameKey = `${game}\t${folder}`;
  const g = byGame.get(gameKey) ?? { count: 0, bytes: 0 };
  g.count += 1;
  g.bytes += bytes;
  byGame.set(gameKey, g);
  total += bytes;
}

const kib = (/** @type {number} */ bytes) => (bytes / 1024).toFixed(0);
const mib = (/** @type {number} */ bytes) => (bytes / 1024 / 1024).toFixed(2);
const lines = [
  `Screenshots tracked at HEAD (${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim()}): ${files.length} files, ${mib(total)} MiB`,
  "",
  "game\tfolder\tfiles\tMiB",
  ...[...byGame]
    .sort(([, a], [, b]) => b.bytes - a.bytes)
    .map(([key, { count, bytes }]) => `${key}\t${count}\t${mib(bytes)}`),
  "",
  "game\tfolder\tfile\tfiles\tsizes in pixels\tKiB in all\tKiB each, on average",
  ...[...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, { count, bytes, sizes }]) =>
        `${key}\t${count}\t${[...sizes].join(",")}\t${kib(bytes)}\t${kib(bytes / count)}`,
    ),
];
writeFileSync(join(DATA, "head.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
