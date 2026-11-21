#!/usr/bin/env node
/**
 * Compares each screenshot in the repository's history with the version of
 * it before, pixel by pixel, to say how many of a retake's images changed
 * where a person could see it and how many only in their bytes.
 *
 *   node docs/repo-size/scripts/screenshots/pixel-history.mjs
 *
 * A screenshot is followed by its game, its game id and its file's name, so
 * the Solitaire Collection's `overview.png` is followed from `public/` into
 * `docs/screenshots/`, where it was moved; a file that changed format starts
 * again under its new name. Two versions of different sizes are only
 * counted as resized. Two of the same size are decoded to RGBA and compared:
 * a pixel counts as changed where any channel differs by more than 16 of
 * 255.
 *
 * Writes `docs/repo-size/data/screenshots/pixel-history.tsv`, one line for
 * each version compared, and `pixel-history-summary.txt`, by commit.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
/** @type {typeof import("sharp")} */
const sharp = createRequire(join(REPO, "frontend/package.json"))("sharp");

/** How far a channel may move before its pixel counts as changed. */
const CHANGED = 16;
/** The share of pixels under which a change counts as too small to see. */
const UNSEEN_SHARE = 0.0001;

const SHOT =
  /^frontend\/(?:games|apps)\/([^/]+)\/(?:public\/)?docs\/screenshots\/(?:(.+)\/)?([^/]+)\.(png|webp)$/;

/**
 * Runs git and returns what it printed, as text or as bytes.
 *
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  return execFileSync("git", args, {
    cwd: REPO,
    maxBuffer: 1024 * 1024 * 1024,
    encoding: "utf8",
  });
}

/**
 * Returns a blob's bytes.
 *
 * @param {string} blob
 * @returns {Buffer}
 */
function blobBytes(blob) {
  return execFileSync("git", ["cat-file", "blob", blob], {
    cwd: REPO,
    maxBuffer: 256 * 1024 * 1024,
  });
}

/**
 * A version of a screenshot: the commit that wrote it and its blob.
 *
 * @typedef {{commit: string, date: string, subject: string, blob: string, path: string}} Version
 */

/** @type {Map<string, Version[]>} */
const versions = new Map();
let current = { commit: "", date: "", subject: "" };
const log = git([
  "log",
  "--reverse",
  "--no-merges",
  "--raw",
  "--no-abbrev",
  "--no-renames",
  "--format=@@%H%x09%cI%x09%s",
  "--remotes=origin",
]);
for (const line of log.split("\n")) {
  if (line.startsWith("@@")) {
    const [commit = "", date = "", ...subject] = line.slice(2).split("\t");
    current = { commit, date, subject: subject.join("\t") };
    continue;
  }
  if (!line.startsWith(":")) continue;
  const [meta = "", path = ""] = line.split("\t");
  const [, , , blob = "", status] = meta.split(" ");
  if (status === "D") continue;
  const shot = path.match(SHOT);
  if (!shot) continue;
  const [, game, id = game, name, ext] = shot;
  const key = `${game}/${id}/${name}.${ext}`;
  const list = versions.get(key) ?? [];
  if (list.at(-1)?.blob === blob) continue;
  list.push({ ...current, blob, path });
  versions.set(key, list);
}

/** @type {Map<string, {raw: Buffer, width: number, height: number}>} */
const decoded = new Map();

/**
 * Returns the largest mean change over any 8 × 8 block of two images of the
 * same size: each pixel's change is its largest channel's, and averaging a
 * block evens out the scattered small changes a lossy encoder makes.
 *
 * @param {Buffer} a
 * @param {Buffer} b
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 * @returns {number}
 */
function largestBlockChange(a, b, width, height, channels) {
  let largest = 0;
  for (let by = 0; by + 8 <= height; by += 8) {
    for (let bx = 0; bx + 8 <= width; bx += 8) {
      let sum = 0;
      for (let y = by; y < by + 8; y++) {
        for (let x = bx; x < bx + 8; x++) {
          const p = (y * width + x) * channels;
          let most = 0;
          for (let c = 0; c < channels; c++) {
            const d = Math.abs((a[p + c] ?? 0) - (b[p + c] ?? 0));
            if (d > most) most = d;
          }
          sum += most;
        }
      }
      if (sum / 64 > largest) largest = sum / 64;
    }
  }
  return largest;
}

/**
 * Decodes a blob to RGBA, keeping the last few.
 *
 * @param {string} blob
 * @returns {Promise<{raw: Buffer, width: number, height: number}>}
 */
async function decode(blob) {
  const kept = decoded.get(blob);
  if (kept) return kept;
  const { data, info } = await sharp(blobBytes(blob))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = { raw: data, width: info.width, height: info.height };
  decoded.clear();
  decoded.set(blob, image);
  return image;
}

const lines = [
  "date\tcommit\tfile\tfrom\tto\tsize\tpixels changed\tshare changed\tlargest channel change\tverdict\tpixels over 32\tpixels over 48\tlargest 8x8 block change\tsubject",
];
/** @type {Map<string, {date: string, subject: string, verdicts: Map<string, number>}>} */
const byCommit = new Map();

for (const [key, list] of versions) {
  for (let i = 1; i < list.length; i++) {
    const before = list[i - 1];
    const after = list[i];
    if (!before || !after) continue;
    const a = await decode(before.blob);
    const aCopy = { ...a, raw: Buffer.from(a.raw) };
    const b = await decode(after.blob);
    const fromExt = before.path.split(".").pop();
    const toExt = after.path.split(".").pop();
    let verdict;
    let changed = 0;
    let over32 = 0;
    let over48 = 0;
    let largest = 0;
    let block = 0;
    if (aCopy.width !== b.width || aCopy.height !== b.height) {
      verdict = "resized";
    } else {
      for (let p = 0; p < b.raw.length; p += 4) {
        let most = 0;
        for (let c = 0; c < 4; c++) {
          const d = Math.abs((aCopy.raw[p + c] ?? 0) - (b.raw[p + c] ?? 0));
          if (d > most) most = d;
        }
        if (most > largest) largest = most;
        if (most > CHANGED) changed++;
        if (most > 32) over32++;
        if (most > 48) over48++;
      }
      block = largestBlockChange(aCopy.raw, b.raw, b.width, b.height, 4);
      const share = changed / (b.width * b.height);
      verdict =
        largest === 0
          ? "pixel-identical"
          : share < UNSEEN_SHARE
            ? "too small to see"
            : "visible change";
    }
    const share = changed / (b.width * b.height);
    lines.push(
      [
        after.date.slice(0, 10),
        after.commit.slice(0, 8),
        key,
        fromExt,
        toExt,
        `${aCopy.width}x${aCopy.height} -> ${b.width}x${b.height}`,
        changed,
        share.toFixed(6),
        largest,
        verdict,
        over32,
        over48,
        block.toFixed(1),
        after.subject,
      ].join("\t"),
    );
    const entry = byCommit.get(after.commit) ?? {
      date: after.date,
      subject: after.subject,
      verdicts: new Map(),
    };
    entry.verdicts.set(verdict, (entry.verdicts.get(verdict) ?? 0) + 1);
    byCommit.set(after.commit, entry);
  }
}

writeFileSync(join(DATA, "pixel-history.tsv"), lines.join("\n") + "\n");

const verdictNames = [
  "pixel-identical",
  "too small to see",
  "visible change",
  "resized",
];
/** @type {Map<string, number>} */
const totals = new Map();
const summary = [
  `Each screenshot against its version before, by the commit that changed it.`,
  `A pixel counts as changed where a channel moved more than ${CHANGED} of 255;`,
  `a change to under ${UNSEEN_SHARE * 100}% of the pixels counts as too small to see.`,
  "",
  `date\tcommit\t${verdictNames.join("\t")}\tsubject`,
];
for (const [commit, { date, subject, verdicts }] of [...byCommit].sort(
  ([, a], [, b]) => a.date.localeCompare(b.date),
)) {
  for (const [name, n] of verdicts)
    totals.set(name, (totals.get(name) ?? 0) + n);
  summary.push(
    `${date.slice(0, 10)}\t${commit.slice(0, 8)}\t${verdictNames
      .map((name) => verdicts.get(name) ?? 0)
      .join("\t")}\t${subject.slice(0, 100)}`,
  );
}
summary.push(
  "",
  `all\t\t${verdictNames.map((name) => totals.get(name) ?? 0).join("\t")}`,
);
writeFileSync(
  join(DATA, "pixel-history-summary.txt"),
  summary.join("\n") + "\n",
);
console.log(summary.join("\n"));
