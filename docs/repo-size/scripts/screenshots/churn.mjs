#!/usr/bin/env node
/**
 * Sorts the commits that added screenshots by why they took them, from
 * their subjects, and totals what each reason added to history, by game.
 *
 *   node docs/repo-size/scripts/screenshots/churn.mjs
 *
 * Reads `data/screenshots/history-origin-commits.tsv`, which `history.mjs`
 * writes. The reason for each commit is set by hand below, from its subject,
 * so a reader can check it against the subject printed beside it.
 *
 * Writes `docs/repo-size/data/screenshots/churn.txt`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "../../data/screenshots");

/** Why a commit took screenshots, by the reasons the findings use. */
const REASONS = {
  first: "a game's first screenshots",
  look: "the game's look changed",
  setup: "the capture's scene, palette, seed or tool changed",
  format: "the format or size changed",
};

/** @type {Record<string, keyof typeof REASONS>} */
const WHY = {
  ee5fc7dc: "first",
  "21eaaab6": "first",
  "1c2544b9": "first",
  "596bafdc": "first",
  "79474e16": "first",
  "31bb1d01": "first",
  "24cd1e74": "first",
  b37252ec: "first",
  d9abc29b: "first",
  "795810cc": "first",
  "9c191a04": "format",
  "3abe7ba2": "look",
  a7deaf18: "look",
  "4641a1c1": "first",
  "9f23109f": "first",
  c3f20fb8: "first",
  "21e5bc3c": "first",
  e83b96cc: "first",
  "034b6db2": "first",
  "4f942dbc": "first",
  a80fc351: "first",
  "174aa9af": "first",
  "9c836cdc": "first",
  "9b81d1ff": "first",
  d89a5cec: "first",
  "0abbf3b4": "first",
  95564873: "first",
  "8013e47f": "first",
  "73c71ab9": "first",
  "2349f17c": "first",
  a3dc2162: "first",
  a84c90ab: "first",
  aeff6784: "first",
  f8783eac: "first",
  "503567ba": "setup",
  "811e476d": "look",
  e704711d: "format",
  "9bb3809c": "first",
  "5bbda669": "look",
  "7e03b0ba": "setup",
  "67a5dbb3": "format",
  "908dcb35": "format",
  a822e6cc: "look",
  "06362c2a": "first",
  a3d033d2: "look",
  "0adaecc3": "first",
  a9af4b96: "look",
  "9eaf65f5": "first",
  e967b60b: "setup",
  "663ee4a4": "first",
  d83e32fd: "setup",
  "7206317a": "setup",
  a5420072: "setup",
  d1710593: "first",
  "3c78f61d": "setup",
  c3381ee4: "look",
  "98d4ba5a": "look",
  "2cbfb0bb": "look",
};

const rows = readFileSync(join(DATA, "history-origin-commits.tsv"), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [
      date = "",
      commit = "",
      game = "",
      folder = "",
      blobs,
      ,
      disk,
      formats = "",
      subject = "",
    ] = line.split("\t");
    return {
      date,
      commit,
      game,
      folder,
      blobs: Number(blobs),
      disk: Number(disk) * 1024,
      formats,
      subject,
    };
  });

const missing = [...new Set(rows.map((r) => r.commit))].filter(
  (c) => !(c in WHY),
);
if (missing.length > 0)
  throw new Error(`no reason set for ${missing.join(", ")}`);

const mib = (/** @type {number} */ bytes) => (bytes / 1024 / 1024).toFixed(2);
const all = rows.reduce((sum, r) => sum + r.disk, 0);
const lines = [
  `Screenshot blobs added, on disk: ${mib(all)} MiB, in ${new Set(rows.map((r) => r.commit)).size} commits`,
  "",
];

lines.push(
  "By game (game, commits, blobs, blobs a commit: median and most, MiB on disk):",
);
const byGame = Object.groupBy(rows, (r) => r.game);
for (const [game, list = []] of Object.entries(byGame).sort(
  ([, a = []], [, b = []]) =>
    b.reduce((s, r) => s + r.disk, 0) - a.reduce((s, r) => s + r.disk, 0),
)) {
  const perCommit = Object.values(Object.groupBy(list, (r) => r.commit)).map(
    (group = []) => group.reduce((s, r) => s + r.blobs, 0),
  );
  perCommit.sort((a, b) => a - b);
  const median = perCommit[Math.floor((perCommit.length - 1) / 2)];
  lines.push(
    `${game}\t${perCommit.length}\t${perCommit.reduce((s, n) => s + n, 0)}\t${median}\t${perCommit.at(-1)}\t${mib(list.reduce((s, r) => s + r.disk, 0))}`,
  );
}

lines.push(
  "",
  "By reason (reason, commits, blobs, MiB on disk, share of all):",
);
for (const [key, name] of Object.entries(REASONS)) {
  const list = rows.filter((r) => WHY[r.commit] === key);
  const disk = list.reduce((s, r) => s + r.disk, 0);
  lines.push(
    `${name}\t${new Set(list.map((r) => r.commit)).size}\t${list.reduce((s, r) => s + r.blobs, 0)}\t${mib(disk)}\t${((100 * disk) / all).toFixed(0)}%`,
  );
}

lines.push(
  "",
  "Retakes of every Solitaire game at once (date, commit, reason, blobs, MiB on disk, subject):",
);
const solitaire = Object.values(
  Object.groupBy(
    rows.filter((r) => r.game === "solitaire"),
    (r) => r.commit,
  ),
)
  .map((group = []) => ({
    first: group[0],
    blobs: group.reduce((s, r) => s + r.blobs, 0),
    disk: group.reduce((s, r) => s + r.disk, 0),
  }))
  .filter(({ blobs }) => blobs >= 41);
let retakes = 0;
for (const { first, blobs, disk } of solitaire) {
  if (!first) continue;
  retakes += disk;
  lines.push(
    `${first.date}\t${first.commit}\t${REASONS[WHY[first.commit] ?? "first"]}\t${blobs}\t${mib(disk)}\t${first.subject.slice(0, 90)}`,
  );
}
lines.push(
  `all ${solitaire.length}\t\t\t\t${mib(retakes)}\t${((100 * retakes) / all).toFixed(0)}% of all screenshot bytes`,
);

lines.push(
  "",
  "Every commit, with its reason (date, commit, game, folder, blobs, KiB on disk, reason, subject):",
);
for (const r of rows) {
  lines.push(
    `${r.date}\t${r.commit}\t${r.game}\t${r.folder}\t${r.blobs}\t${Math.round(r.disk / 1024)}\t${WHY[r.commit]}\t${r.subject.slice(0, 100)}`,
  );
}

writeFileSync(join(DATA, "churn.txt"), lines.join("\n") + "\n");
console.log(lines.slice(0, 40).join("\n"));
