#!/usr/bin/env node
// Prints, from a `bench.sh` run's test log, each workspace's time in
// `yarn test`'s lane beside the `Duration` its Vitest reports, and what is
// left, its start-up and its Vite server's, as a TSV, then the sums.
//
//   node test-startup.mjs <bench logs folder> > test-startup.tsv
import { readFileSync } from "node:fs";
import { join } from "node:path";

const folder = process.argv[2];
if (folder === undefined) {
  console.error("Usage: node test-startup.mjs <bench logs folder>");
  process.exit(2);
}
const log = readFileSync(join(folder, "test.log"), "utf8").replace(
  /\x1b\[[0-9;]*m/g,
  "",
);
/** @type {Map<string, number>} Each workspace's Vitest `Duration`, in seconds. */
const durations = new Map();
let current = "";
for (const line of log.split("\n")) {
  const started = /^➤ (\S+): test exited/.exec(line);
  if (started) current = started[1] ?? "";
  const duration = /^\s+Duration\s+([\d.]+)(ms|s)\b/.exec(line);
  if (duration && current !== "") {
    const value = Number(duration[1]);
    durations.set(current, duration[2] === "ms" ? value / 1000 : value);
  }
}
console.log(["workspace", "lane_s", "vitest_s", "outside_s"].join("\t"));
let lanes = 0;
let vitest = 0;
for (const [, took = "", name = ""] of log.matchAll(
  /^\s+[\d.]+ s\s+([\d.]+) s\s+(\S+)$/gm,
)) {
  const lane = Number(took);
  const inside = durations.get(name) ?? 0;
  lanes += lane;
  vitest += inside;
  console.log(
    [name, lane.toFixed(1), inside.toFixed(1), (lane - inside).toFixed(1)].join(
      "\t",
    ),
  );
}
console.log(
  [
    "all",
    lanes.toFixed(1),
    vitest.toFixed(1),
    (lanes - vitest).toFixed(1),
  ].join("\t"),
);
