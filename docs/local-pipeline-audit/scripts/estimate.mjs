#!/usr/bin/env node
// Estimates what `yarn verify` plus `yarn check:layout` would take on each
// commit of history.mjs's TSV if every workspace's step were skipped when
// its inputs hadn't changed, the steps still run one after another.
//
//   node estimate.mjs <history.tsv> <workspace-times-alone.tsv> <full_s> [fixed_s]
//
// A commit that reaches every workspace takes full_s, the measured full run.
// Any other takes, for each step, the longest of its workspaces' times alone
// or their sum over the lanes that run at once (12 for a foreach on 24
// cores, 4 for the tests), whichever is longer, plus fixed_s, what runs
// every time: the skills', constraints' and dedupe checks, the root's
// ESLint and tsc, and Prettier's check. The site's build, which copies the
// games' builds, runs once the site or a game does.
import { readFileSync } from "node:fs";

const [historyFile, timesFile, fullArg, fixedArg = "6"] = process.argv.slice(2);
if (historyFile === undefined || timesFile === undefined || !fullArg) {
  console.error(
    "Usage: node estimate.mjs <history.tsv> <workspace-times-alone.tsv> <full_s> [fixed_s]",
  );
  process.exit(2);
}
const full = Number(fullArg);
const fixed = Number(fixedArg);
/** @type {Record<string, number>} */
const LANES = { lint: 12, typecheck: 12, test: 4, build: 12, layout: 12 };

const [header = "", ...rows] = readFileSync(timesFile, "utf8")
  .trim()
  .split("\n");
const steps = header.split("\t").slice(1);
/** @type {Map<string, Record<string, number>>} */
const times = new Map(
  rows.map((row) => {
    const [name = "", ...values] = row.split("\t");
    return [
      name,
      Object.fromEntries(steps.map((s, i) => [s, Number(values[i])])),
    ];
  }),
);
const siteBuild = times.get("site")?.["build"] ?? 0;

/**
 * Returns a workspace's name from its folder.
 *
 * @param {string} folder
 * @returns {string}
 */
function nameOf(folder) {
  return folder.startsWith("frontend/lib/")
    ? `@fz/${folder.slice("frontend/lib/".length)}`
    : folder.slice(folder.lastIndexOf("/") + 1);
}

/**
 * Returns the estimated wall time of the steps over some workspaces.
 *
 * @param {string[]} names
 * @returns {number}
 */
function wall(names) {
  let total = fixed;
  for (const step of steps) {
    const ts = names
      .filter((n) => step !== "build" || n !== "site")
      .map((n) => times.get(n)?.[step] ?? 0)
      .filter((t) => t > 0);
    if (ts.length === 0) continue;
    const sum = ts.reduce((a, b) => a + b, 0);
    total += Math.max(Math.max(...ts), sum / (LANES[step] ?? 1));
  }
  const builds = names.some(
    (n) => n === "site" || (times.get(n)?.["build"] ?? 0) > 0,
  );
  return builds ? total + siteBuild : total;
}

const everything = [...times.keys()];
/** @type {number[]} */
const estimates = [];
for (const line of readFileSync(historyFile, "utf8").trim().split("\n")) {
  const [, , count = "0", stale = ""] = line.split("\t");
  if (Number(count) === everything.length) {
    estimates.push(full);
    continue;
  }
  const names = stale
    .split(",")
    .filter((p) => p.startsWith("frontend/"))
    .map(nameOf);
  estimates.push(names.length === 0 ? fixed : wall(names));
}
estimates.sort((a, b) => a - b);
/**
 * Returns the estimate at a share of the commits, from the least.
 *
 * @param {number} q
 * @returns {number}
 */
const at = (q) => estimates[Math.floor(q * (estimates.length - 1))] ?? 0;
const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
/**
 * Returns the share of the commits an estimate passes, as a percentage.
 *
 * @param {(e: number) => boolean} test
 * @returns {string}
 */
const shareOf = (test) =>
  ((100 * estimates.filter(test).length) / estimates.length).toFixed(1);
console.log(`every workspace: ${full.toFixed(0)} s, measured`);
console.log(
  `per commit with a cache: mean ${mean.toFixed(0)} s, median ${at(0.5).toFixed(0)} s, p25 ${at(0.25).toFixed(0)} s, p75 ${at(0.75).toFixed(0)} s, p90 ${at(0.9).toFixed(0)} s`,
);
console.log(
  `commits within 30 s: ${shareOf((e) => e <= 30)}%, at the full time: ${shareOf((e) => e >= full)}%`,
);
