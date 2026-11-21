#!/usr/bin/env node
/**
 * Works out what Git LFS would serve and store for the screenshots, from
 * the figures the other scripts printed: the screenshots tracked at HEAD
 * (`head.txt`), the checkouts CI made in 30 days (`ci-runs.txt`) and the
 * bytes history gained each month (`history-origin-monthly.tsv`), against
 * the free quotas GitHub's page gives (`sources.txt`).
 *
 *   node docs/repo-size/scripts/screenshots/estimates.mjs
 *
 * Writes `docs/repo-size/data/screenshots/estimates.txt`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/screenshots",
);
const read = (/** @type {string} */ name) =>
  readFileSync(join(DATA, name), "utf8");

// The screenshots at HEAD, served and all.
const head = read("head.txt");
const byFolder = [
  ...head.matchAll(/^(\S+)\t(public|originals)\t(\d+)\t([\d.]+)$/gm),
];
const served = byFolder
  .filter((m) => m[2] === "public")
  .reduce((s, m) => s + Number(m[4]), 0);
const all = byFolder.reduce((s, m) => s + Number(m[4]), 0);

// The checkouts that need them, in the 30 days ci-runs.sh read.
const ci = read("ci-runs.txt");
const jobs = (/** @type {string} */ name) =>
  Number(
    ci.match(
      new RegExp(`^\\s*(\\d+) ${name.replace(/[()]/g, "\\$&")}$`, "m"),
    )?.[1] ?? 0,
  );
const window = ci.match(/created (\S+):/)?.[1] ?? "";
const checkouts = {
  "docker (builds the image)": jobs("docker"),
  "verify (before the split, built the site)": jobs("verify"),
  "build (builds the site)": jobs("build"),
  "test jobs (the Solitaire Collection's spec globs public/)": jobs(
    "test (brick-fuzz-pop, solitaire)",
  ),
  "promote, each a Cloud Build at most": jobs("promote"),
};
const total = Object.values(checkouts).reduce((s, n) => s + n, 0);

// The quota GitHub's page gives GitHub Free.
const quota = Number(
  read("sources.txt").match(/GitHub Free (\d+) GiB (\d+) GiB/)?.[1] ?? NaN,
);

// What history gained a month.
const months = new Map();
for (const line of read("history-origin-monthly.tsv")
  .trim()
  .split("\n")
  .slice(1)) {
  const [month = "", , , , , disk] = line.split("\t");
  months.set(month, (months.get(month) ?? 0) + Number(disk));
}

// What a retake of every Solitaire game costs in time, from the runs
// capture-twice.mjs timed and the remake reencode.mjs timed.
const capture = read("capture-solitaire.txt");
const ids = (capture.match(/game ids: (.+)$/m)?.[1] ?? "")
  .split(" ")
  .filter(Boolean);
const runs = [...capture.matchAll(/^run (\d+): ([\d.]+) s/gm)].map((m) =>
  Number(m[2]),
);
const steady = Math.min(...runs) / ids.length;
const thumbs = Number(
  read("reencode.txt").match(
    /build:thumbs remade .* in ([\d.]+) s \((\d+) games/,
  )?.[1] ?? NaN,
);
const solitaireGames = 41;
const whole = read("capture-solitaire-all.txt");
const wholeRun = Number(whole.match(/^run 1: ([\d.]+) s/m)?.[1] ?? NaN);
const wholeIds = (whole.match(/game ids: (.+)$/m)?.[1] ?? "")
  .split(" ")
  .filter(Boolean).length;
const heads = [
  ...whole.matchAll(
    /^ {2}HEAD: \d+ bytes, (byte-identical|bytes differ); pixels: (.*)$/gm,
  ),
];
const largestAgainstHead = Math.max(
  ...heads.map((m) => Number(m[2]?.match(/largest change (\d+)/)?.[1] ?? 0)),
);

// What the Solitaire Collection's full retakes added, and what the same
// number would add at each plan reencode.mjs priced.
const churn = read("churn.txt");
const retakes = churn.match(/^all (\d+)\t+([\d.]+)\t/m);
const plans = [
  ...read("reencode.txt").matchAll(/^ {3}([\d.]+) MiB \(\d+%\)\t(.+)$/gm),
].map((m) => ({
  mib: Number(m[1]),
  name: m[2] ?? "",
}));

// How a retake divides, and what each setting saves against today's.
const plan = (/** @type {string} */ start) =>
  plans.find((p) => p.name.startsWith(start))?.mib ?? NaN;
const todayPlan = plan("today:");
const webpAlone = plan("today's WebP alone");
const noOverview = plan("no originals; the rules page");
/** @type {Map<string, number>} */
const settings = new Map();
for (const line of read("reencode-settings.tsv").trim().split("\n").slice(1)) {
  const [image, width, height, q, effort, , kib] = line.split("\t");
  settings.set(`${image} ${width}x${height} q${q} e${effort}`, Number(kib));
}
const against = (/** @type {string} */ key, /** @type {string} */ base) =>
  `${key}: ${settings.get(key)} KiB against ${base}'s ${settings.get(base)}, ` +
  `${(100 * (1 - (settings.get(key) ?? 0) / (settings.get(base) ?? 1))).toFixed(0)}% smaller`;

// Where the fresh captures differ from HEAD's originals.
const shares = heads.map((m) =>
  Number(m[2]?.match(/\(([\d.]+)%\)/)?.[1] ?? NaN),
);
const rows = heads.flatMap((m) => {
  const y = m[2]?.match(/y (\d+)-(\d+) of/);
  return y ? [Number(y[1]), Number(y[2])] : [];
});
const rewrite = read("reencode.txt").match(/would rewrite ([\d.]+) MiB/)?.[1];

const gib = (/** @type {number} */ mib) => (mib / 1024).toFixed(2);
const lines = [
  `Screenshots at HEAD: ${served.toFixed(2)} MiB served (public/), ${all.toFixed(2)} MiB with the Solitaire Collection's originals`,
  "",
  `Checkouts in the ${window} window that need the served screenshots:`,
  ...Object.entries(checkouts).map(([name, n]) => `  ${n}\t${name}`),
  `  ${total}\tin all`,
  "",
  `GitHub Free's Git LFS quota: ${quota} GiB of bandwidth a month and ${quota} GiB of storage`,
  `If every checkout fetched the served screenshots: ${gib(total * served)} GiB a month (${((100 * total * served) / 1024 / quota).toFixed(0)}% of the bandwidth)`,
  `If every checkout fetched the originals too:     ${gib(total * all)} GiB a month (${((100 * total * all) / 1024 / quota).toFixed(0)}% of the bandwidth)`,
  "",
  "What history gained each month, MiB on disk (an LFS store would keep the same):",
  ...[...months].map(([month, mib]) => `  ${month}\t${mib.toFixed(2)}`),
  `  at October's rate, ${quota} GiB of storage lasts ${((quota * 1024) / (months.get("2026-10") ?? 1)).toFixed(0)} months`,
  "",
  `Solitaire capture: runs of ${ids.length} games took ${runs.join(" s and ")} s; the faster is ${steady.toFixed(1)} s a game`,
  `  every one of the ${solitaireGames} games at that pace: ${((steady * solitaireGames) / 60).toFixed(1)} min, then build:thumbs ${thumbs.toFixed(0)} s`,
  `  measured: all ${wholeIds} in one run took ${wholeRun} s (${(wholeRun / 60).toFixed(1)} min, the dev server's first compile included)`,
  `  against HEAD: ${heads.filter((m) => m[1] === "byte-identical").length} of ${heads.length} originals byte-identical, ` +
    `${heads.filter((m) => m[2] === "pixel-identical").length} pixel-identical, the largest channel change in any ${largestAgainstHead}`,
  `  each differs from HEAD's in ${Math.min(...shares)}-${Math.max(...shares)}% of its pixels, all within rows ${Math.min(...rows)}-${Math.max(...rows)} of 1620`,
  `  a retake from this capture would rewrite ${rewrite} MiB (reencode.txt, step 2)`,
  "",
  `One full Solitaire retake today: ${todayPlan} MiB. The originals are ${((100 * (todayPlan - webpAlone)) / todayPlan).toFixed(0)}% of it, ` +
    `overview.webp ${((100 * (webpAlone - noOverview)) / todayPlan).toFixed(0)}%, and the thumbnails and previews ${((100 * noOverview) / todayPlan).toFixed(0)}%`,
  `  ${against("preview 2560x1440 q70 e4", "preview 2560x1440 q80 e4")}`,
  `  ${against("preview 2560x1440 q50 e4", "preview 2560x1440 q80 e4")}`,
  `  ${against("preview 1920x1080 q80 e4", "preview 2560x1440 q80 e4")}`,
  `  ${against("preview 2560x1440 q80 e6", "preview 2560x1440 q80 e4")}`,
  `  ${against("thumb 576x324 q80 e6", "thumb 576x324 q80 e4")}`,
  `  ${against("thumb 576x324 q70 e4", "thumb 576x324 q80 e4")}`,
  "",
  `The Solitaire Collection's ${retakes?.[1]} full retakes added ${retakes?.[2]} MiB. The same number of retakes at today's sizes, by plan:`,
  ...plans.map(
    ({ mib, name }) =>
      `  ${(mib * Number(retakes?.[1] ?? 0)).toFixed(1)} MiB\t${name}`,
  ),
];
writeFileSync(join(DATA, "estimates.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
