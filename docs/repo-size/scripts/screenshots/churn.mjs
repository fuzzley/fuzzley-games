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
  db5ca04b: "first",
  b6e5d1aa: "first",
  "0cc7f174": "first",
  "030768df": "first",
  "50f11034": "first",
  "51bdbb6e": "first",
  "5c53604d": "first",
  "02a0ecef": "first",
  "13f3c9d3": "first",
  "5123641f": "first",
  "562b8d9b": "format",
  "529c3153": "look",
  "3ae509ee": "look",
  "9c74b390": "first",
  ce20a3ba: "first",
  "5f66c4f0": "first",
  fcf74330: "first",
  e3d6ad2f: "first",
  "34913b87": "first",
  "3a586181": "first",
  ffc9915c: "first",
  "274b169f": "first",
  "37e5b7ac": "first",
  e80efe46: "first",
  b29699b8: "first",
  "27cdf804": "first",
  "9ceb836c": "first",
  "579310ed": "first",
  "5b0027bf": "first",
  "9906006b": "first",
  ca257c00: "first",
  d4759f55: "first",
  e1aa1716: "first",
  "38f09609": "first",
  "3cb045ea": "setup",
  ec685c42: "look",
  c6b8178d: "format",
  "543ab8f7": "first",
  "1b20d9f4": "look",
  "65588f7c": "setup",
  "39b14edf": "format",
  "093d0607": "format",
  ba9e2808: "look",
  "2244bde0": "first",
  "4b68178d": "look",
  "6826ffbb": "first",
  "5b0b534e": "look",
  a647d2d3: "first",
  "1856269b": "setup",
  "2330fa2e": "first",
  69956338: "setup",
  c8ad2156: "setup",
  "8c359e75": "setup",
  aef58c7c: "first",
  "4cc97240": "setup",
  "0a7edc49": "look",
  f734330a: "look",
  "21fdc172": "look",
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
