/**
 * Plays every draft level with the sketch's players, sets each level's moves
 * from how they did, proves each deal can be won, and writes the numbers down.
 *
 * `node sketch/report.mjs` plays all 36; `node sketch/report.mjs 12 13` plays
 * those two and prints them without writing anything.
 */

/** @import { Level } from './engine.mjs' */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

import { allLevels, SETS } from "../levels/drafts.mjs";
import { carefulMove, casualMove, certify, dice, playOut } from "./bots.mjs";
import { deal, play } from "./engine.mjs";

/** How often a casual player should clear each level of a set, first to last. */
export const TARGETS = [
  [0.99, 0.99, 0.98, 0.98, 0.98, 0.95, 0.92, 0.92, 0.8],
  [0.92, 0.86, 0.8, 0.9, 0.84, 0.76, 0.8, 0.74, 0.6],
  [0.9, 0.8, 0.74, 0.86, 0.76, 0.74, 0.7, 0.7, 0.55],
  [0.9, 0.8, 0.8, 0.74, 0.7, 0.68, 0.7, 0.64, 0.5],
];

const SEEDS = 40;
const TRIALS = 16;
const DEALS = 8;
const OPEN = 99;

/**
 * Returns the value a share of the way up a sorted list.
 * @param {number[]} sorted
 * @param {number} share From 0 to 1.
 * @returns {number}
 */
function at(sorted, share) {
  if (sorted.length === 0) return OPEN;
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

/**
 * Plays one level every way, and returns what the report says of it.
 * @param {Level & { idea: string }} level
 * @param {number} target
 * @returns {object}
 */
function measure(level, target) {
  const open = { ...level, moves: OPEN };
  /** @type {number[]} */
  const casual = [];
  /** @type {number[]} */
  const careful = [];
  /** @type {number[][]} Each deal's casual games, by its seed. */
  const bySeed = [];
  let depth = 0;
  let depthMoves = 0;
  let deepest = 0;
  let specials = 0;
  let shuffles = 0;
  let games = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (let trial = 0; trial < TRIALS; trial++) {
      const roll = dice(seed * 1000 + trial + 17);
      const run = playOut(deal(open, seed), (s) => casualMove(s, roll));
      casual.push(run.won ? run.used : OPEN + 1);
      (bySeed[seed] ??= []).push(run.won ? run.used : OPEN + 1);
    }
    // The careful player's game is kept, to count what a game is made of.
    const s = deal(open, seed);
    games++;
    while (!s.won && !s.lost) {
      const m = carefulMove(s);
      if (!m) break;
      const record = play(s, m.a, m.b, true);
      if (!record) break;
      depthMoves++;
      depth += record.steps.length;
      deepest = Math.max(deepest, record.steps.length);
      for (const step of record.steps)
        specials += step.bunches.filter((b) => b.makes).length;
      if (record.shuffle) shuffles++;
    }
    careful.push(s.won ? OPEN - s.moves : OPEN + 1);
  }
  casual.sort((p, q) => p - q);
  careful.sort((p, q) => p - q);

  // The level's moves: the fewest that let a casual player through as often
  // as its place in the set asks, and never fewer than a careful one needs.
  let moves = at(casual, target - 1e-9);
  moves = Math.max(moves, at(careful, 0.75) + 1);
  const share = (/** @type {number[]} */ list) =>
    list.filter((n) => n <= moves && n <= OPEN).length / list.length;

  /** @type {number[]} */
  const deals = [];
  /** @type {Record<number, number[][]>} */
  const lines = {};
  /** @type {number[]} */
  const proofs = [];
  // The level's deals are the ones a casual player clears nearest as often as
  // the level asks, so that which deal comes up changes little; each is proven.
  const nearest = Array.from({ length: SEEDS }, (_, n) => n + 1)
    .map((seed) => ({ seed, rate: share(bySeed[seed]) }))
    .sort(
      (p, q) =>
        Math.abs(p.rate - target) - Math.abs(q.rate - target) ||
        p.seed - q.seed,
    );
  /** @type {number[]} */
  const rates = [];
  for (const { seed, rate } of nearest) {
    if (deals.length >= DEALS) break;
    const proof = certify(deal({ ...level, moves }, seed));
    if (!proof.won) continue;
    deals.push(seed);
    rates.push(rate);
    lines[seed] = proof.line;
    proofs.push(proof.used);
  }
  proofs.sort((p, q) => p - q);
  const every = nearest.map((n) => n.rate);
  const best = at(careful, 0.5);
  const three = Math.max(1, moves - best);
  const two = Math.max(1, Math.floor(three / 2));
  return {
    id: level.id,
    name: level.name,
    set: level.set,
    target,
    drafted: level.moves,
    moves,
    casual: share(casual),
    careful: share(careful),
    casualMid: at(casual, 0.5),
    carefulMid: best,
    proofMid: at(proofs, 0.5),
    proofWorst: proofs[proofs.length - 1] ?? OPEN,
    deals,
    lines,
    dealt:
      rates.reduce((sum, rate) => sum + rate, 0) / Math.max(1, rates.length),
    range: [Math.min(...rates), Math.max(...rates)],
    rangeOfAll: [Math.min(...every), Math.max(...every)],
    stars: [0, two, three],
    depth: depth / Math.max(1, depthMoves),
    deepest,
    specials: specials / games,
    shuffles: shuffles / games,
  };
}

if (!isMainThread) {
  const { level, target } = workerData;
  /** @type {import('node:worker_threads').MessagePort} */ (
    parentPort
  ).postMessage(measure(level, target));
} else if (import.meta.main) {
  const only = process.argv.slice(2).map(Number);
  const levels = allLevels().filter(
    (level) => only.length === 0 || only.includes(level.id),
  );
  const started = Date.now();
  /** @type {any[]} */
  const results = [];
  let next = 0;
  await Promise.all(
    new Array(Math.min(16, levels.length)).fill(0).map(async () => {
      while (next < levels.length) {
        const level = levels[next++];
        const setAt = SETS.findIndex((set) => set.id === level.set);
        const inSet = SETS[setAt].levels.findIndex(
          (l) => l.name === level.name,
        );
        const target = TARGETS[setAt][inSet];
        const result = await new Promise((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url), {
            workerData: { level, target },
          });
          worker.once("message", resolve);
          worker.once("error", reject);
        });
        results.push(result);
      }
    }),
  );
  results.sort((p, q) => p.id - q.id);

  const pct = (/** @type {number} */ n) => `${Math.round(n * 100)}%`;
  const rows = results.map(
    (r) =>
      `| ${r.id} | ${r.name} | ${r.moves} | ${pct(r.target)} | ${pct(r.casual)} | ${pct(r.careful)} | ${r.casualMid} | ${r.carefulMid} | ${r.proofMid} | ${r.proofWorst} | ${r.deals.length} | ${pct(r.dealt)} | ${pct(r.range[0])} to ${pct(r.range[1])} | ${pct(r.rangeOfAll[0])} to ${pct(r.rangeOfAll[1])} | ${r.stars[1]}, ${r.stars[2]} | ${r.depth.toFixed(2)} | ${r.deepest} | ${r.specials.toFixed(1)} | ${r.shuffles.toFixed(2)} |`,
  );
  const table = [
    "| # | Level | Moves | Asked | Casual | Careful | Casual's middle | Careful's middle | Proof's middle | Proof's longest | Deals | Casual on its deals | Its deals range | All 40 deals range | Moves to spare for 2 and 3 stars | Waves a move | Most waves | Specials a game | Shuffles a game |",
    "| - | ----- | ----- | ----- | ------ | ------- | --------------- | ---------------- | -------------- | --------------- | ----- | ------------------- | --------------- | ------------------ | -------------------------------- | ------------ | ---------- | --------------- | --------------- |",
    ...rows,
  ].join("\n");
  console.log(table);
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s`);

  if (only.length === 0) {
    const here = dirname(fileURLToPath(import.meta.url));
    /** @type {Record<number, { moves: number, deals: number[], stars: number[] }>} */
    const tuned = {};
    /** @type {Record<number, Record<number, number[][]>>} */
    const proofs = {};
    for (const r of results) {
      tuned[r.id] = { moves: r.moves, deals: r.deals, stars: r.stars };
      proofs[r.id] = r.lines;
    }
    writeFileSync(
      join(here, "results.json"),
      JSON.stringify({ levels: tuned }, null, 2) + "\n",
    );
    writeFileSync(
      join(here, "certificates.json"),
      JSON.stringify(proofs) + "\n",
    );
    writeFileSync(join(here, "results-table.md"), table + "\n");
  }
}
