#!/usr/bin/env node
// Prints each workspace's time in each step of a `bench.sh` run, as a TSV,
// from that run's logs: the `foreach -vv` lines of lint, typecheck, the
// games' builds and the layout check, and the table `yarn test` prints.
//
//   node workspace-times.mjs <bench logs folder> > workspace-times-warm.tsv
//
// The times are those of a full run, with twelve workspaces at once, so
// they overstate what a workspace takes alone; `alone.sh` times that.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The steps, by the log each is read from. */
const FOREACH_LOGS = {
  lint: "lint-foreach.log",
  typecheck: "typecheck-foreach.log",
  build: "build-games.log",
  layout: "check-layout.log",
};

/**
 * Returns a log's text without its color codes.
 *
 * @param {string} path
 * @returns {string}
 */
function plain(path) {
  return readFileSync(path, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Returns the seconds Yarn writes as "1m 2s 345ms".
 *
 * @param {string} text
 * @returns {number}
 */
function secondsOf(text) {
  let seconds = 0;
  for (const [, count, unit] of text.matchAll(/(\d+)(ms|s|m)\b/g)) {
    const n = Number(count);
    seconds += unit === "m" ? n * 60 : unit === "s" ? n : n / 1000;
  }
  return seconds;
}

const folder = process.argv[2];
if (folder === undefined) {
  console.error("Usage: node workspace-times.mjs <bench logs folder>");
  process.exit(2);
}
/** @type {Map<string, Record<string, number>>} */
const times = new Map();
/**
 * Records a workspace's time in a step.
 *
 * @param {string} name
 * @param {string} step
 * @param {number} seconds
 * @returns {void}
 */
function record(name, step, seconds) {
  const row = times.get(name) ?? {};
  row[step] = seconds;
  times.set(name, row);
}
for (const [step, log] of Object.entries(FOREACH_LOGS)) {
  const text = plain(join(folder, log));
  for (const [, name = "", took = ""] of text.matchAll(
    /^\[([^\]]+)\]: Process exited \(exit code \d+\), completed in (.*)$/gm,
  )) {
    record(name, step, secondsOf(took));
  }
}
const tests = plain(join(folder, "test.log"));
for (const [, took = "", name = ""] of tests.matchAll(
  /^\s+[\d.]+ s\s+([\d.]+) s\s+(\S+)$/gm,
)) {
  record(name, "test", Number(took));
}
const steps = ["lint", "typecheck", "test", "build", "layout"];
console.log(["workspace", ...steps, "total"].join("\t"));
for (const [name, row] of [...times].sort(([a], [b]) => a.localeCompare(b))) {
  const values = steps.map((step) => row[step] ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  console.log(
    [name, ...values.map((v) => v.toFixed(1)), total.toFixed(1)].join("\t"),
  );
}
