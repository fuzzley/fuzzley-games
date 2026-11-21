#!/usr/bin/env node
/**
 * Tries rules a pixel-diff gate in the capture tools could keep a committed
 * screenshot by: it measures how far retakes that changed nothing a person
 * could see moved the pixels, and how far every retake in history moved
 * them, and counts which of each a rule would let through.
 *
 *   node docs/repo-size/scripts/screenshots/gate-check.mjs
 *
 * The retakes that changed nothing are the ones `capture-twice.mjs` took on
 * this machine, against HEAD's images: Minesweeper's two, the Solitaire
 * Collection's 41 lossless originals (`LABEL=all`), and the three WebP
 * images `reencode.mjs` made from each. The retakes in history are the lines
 * of `pixel-history.tsv` between two versions of the same size.
 *
 * Two kinds of rule are tried: changed where some pixel moved more than a
 * threshold in a channel, and changed where some 8 × 8 block's mean change
 * is more than a threshold. Averaging a block evens out the scattered small
 * changes a lossy encoder makes, and keeps a real change, which is a shape.
 *
 * Reads the images from `$SCRATCH` (default: a folder under the system's
 * temporary folder). Writes `docs/repo-size/data/screenshots/gate-check.txt`.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
const GAMES = join(REPO, "frontend/games");
const SCRATCH = process.env.SCRATCH ?? join(tmpdir(), "repo-size-screenshots");
/** @type {typeof import("sharp")} */
const sharp = createRequire(join(REPO, "frontend/package.json"))("sharp");

const PIXEL_THRESHOLDS = [16, 32, 48];
const BLOCK_THRESHOLDS = [2, 4, 6, 8];

/**
 * How far one image moved from another.
 *
 * @typedef {{name: string, largest: number, over: Map<number, number>, block: number}} Moved
 */

/**
 * Measures how far two images of the same size differ: the largest change
 * in a channel, how many pixels moved more than each threshold, and the
 * largest mean change over an 8 × 8 block, each pixel's change being its
 * largest channel's.
 *
 * @param {string} name
 * @param {string} a
 * @param {string} b
 * @returns {Promise<Moved>}
 */
async function moved(name, a, b) {
  const [x, y] = await Promise.all(
    [a, b].map((path) =>
      sharp(readFileSync(path))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ),
  );
  if (
    !x ||
    !y ||
    x.info.width !== y.info.width ||
    x.info.height !== y.info.height
  ) {
    throw new Error(`${a} and ${b} differ in size`);
  }
  const { width, height } = x.info;
  const change = new Uint8Array(width * height);
  const over = new Map(PIXEL_THRESHOLDS.map((t) => [t, 0]));
  let largest = 0;
  for (let p = 0; p < change.length; p++) {
    let most = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs((x.data[3 * p + c] ?? 0) - (y.data[3 * p + c] ?? 0));
      if (d > most) most = d;
    }
    change[p] = most;
    if (most > largest) largest = most;
    for (const t of PIXEL_THRESHOLDS) {
      if (most > t) over.set(t, (over.get(t) ?? 0) + 1);
    }
  }
  let block = 0;
  for (let by = 0; by + 8 <= height; by += 8) {
    for (let bx = 0; bx + 8 <= width; bx += 8) {
      let sum = 0;
      for (let row = by; row < by + 8; row++) {
        for (let col = bx; col < bx + 8; col++)
          sum += change[row * width + col] ?? 0;
      }
      if (sum / 64 > block) block = sum / 64;
    }
  }
  return { name, largest, over, block };
}

/** @type {{name: string, a: string, b: string}[]} */
const pairs = [];
for (const file of ["thumb.webp", "preview.webp"]) {
  pairs.push({
    name: `minesweeper/${file}`,
    a: join(SCRATCH, "capture-minesweeper/run-1", file),
    b: join(GAMES, "minesweeper/public/docs/screenshots/minesweeper", file),
  });
}
const FRESH = join(SCRATCH, "capture-solitaire-all/run-1");
for (const id of readdirSync(FRESH).sort()) {
  pairs.push({
    name: `solitaire/${id}/overview.png`,
    a: join(FRESH, id, "overview.png"),
    b: join(GAMES, "solitaire/docs/screenshots", id, "overview.png"),
  });
  for (const file of ["thumb.webp", "preview.webp", "overview.webp"]) {
    pairs.push({
      name: `solitaire/${id}/${file}`,
      a: join(SCRATCH, "reencode/fresh", id, file),
      b: join(GAMES, "solitaire/public/docs/screenshots", id, file),
    });
  }
}

/** @type {Moved[]} */
const noise = [];
for (const { name, a, b } of pairs) {
  if (!existsSync(a)) {
    throw new Error(
      `missing ${a}; run capture-twice.mjs and reencode.mjs first`,
    );
  }
  noise.push(await moved(name, a, b));
}

const lines = [
  `Retakes on this machine that changed nothing a person could see, against HEAD: ${noise.length}`,
  "By file (file, retakes, largest channel change, most pixels over 16, over 32, over 48, largest 8x8 block change):",
  ...Object.entries(
    Object.groupBy(noise, (n) =>
      n.name.startsWith("minesweeper")
        ? `minesweeper ${n.name.split("/").pop()}`
        : `solitaire ${n.name.split("/").pop()}`,
    ),
  ).map(
    ([file, list = []]) =>
      `${file}\t${list.length}\t${Math.max(...list.map((n) => n.largest))}\t` +
      PIXEL_THRESHOLDS.map((t) =>
        Math.max(...list.map((n) => n.over.get(t) ?? 0)),
      ).join("\t") +
      `\t${Math.max(...list.map((n) => n.block)).toFixed(1)}`,
  ),
];

// Every retake in history between two versions of the same size.
/** @type {Moved[]} */
const history = readFileSync(join(DATA, "pixel-history.tsv"), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split("\t"))
  .filter((cols) => cols[9] !== "resized")
  .map((cols) => ({
    name: `${cols[1]} ${cols[2]}`,
    largest: Number(cols[8]),
    over: new Map([
      [16, Number(cols[6])],
      [32, Number(cols[10])],
      [48, Number(cols[11])],
    ]),
    block: Number(cols[12]),
  }));
lines.push(
  "",
  `Retakes in history between versions of the same size: ${history.length}`,
  "The eight with the smallest largest 8x8 block change (commit and image, largest channel change, pixels over 16, over 32, over 48, largest block change):",
  ...[...history]
    .sort((a, b) => a.block - b.block)
    .slice(0, 8)
    .map(
      (h) =>
        `${h.name}\t${h.largest}\t${PIXEL_THRESHOLDS.map((t) => h.over.get(t)).join("\t")}\t${h.block.toFixed(1)}`,
    ),
);

lines.push(
  "",
  `rule\tunchanged retakes it calls changed (of ${noise.length})\thistory's changes it would keep (of ${history.length})`,
);
/**
 * Prints how a rule fares on both sets.
 *
 * @param {string} name
 * @param {(m: Moved) => boolean} isChanged
 */
function tryRule(name, isChanged) {
  lines.push(
    `${name}\t${noise.filter(isChanged).length}\t${history.filter((h) => !isChanged(h)).length}`,
  );
}
for (const t of PIXEL_THRESHOLDS) {
  tryRule(`a pixel moved more than ${t}`, (m) => (m.over.get(t) ?? 0) > 0);
}
for (const t of BLOCK_THRESHOLDS) {
  tryRule(`an 8x8 block's mean change is more than ${t}`, (m) => m.block > t);
}

writeFileSync(join(DATA, "gate-check.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
