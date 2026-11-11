// Prints what the careless player's rounds looked like over every draft on
// fields 11, 16 and 22 deep, ten games each: how far the fuzzballs flew, what
// they met and broke, what a boon was worth, how often the wall jumped, which
// charges were chosen, and how often a bored fuzzball was called home, by depth.
import { LEVELS } from "./levels.mjs";
import {
  AIMS,
  CHARGE_MAX,
  cloneState,
  makeState,
  score,
  shoot,
} from "./sim.mjs";

/** Returns a seeded source of numbers from 0 up to 1. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns the value a share `p` of the way up a list of numbers, sorted. */
function quantile(numbers, p) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

const dist = [];
const contacts = [];
const broken = [];
// The bricks a round broke, by the boon its shot had.
const brokenBy = { plain: [], hot: [], triple: [] };
const charges = Array(CHARGE_MAX + 1).fill(0);
const byDepth = new Map();
let boredBalls = 0;
let stuck = 0;
let rounds = 0;
let looks = 0;
let games = 0;
let won = 0;
const started = performance.now();
LEVELS.forEach((level, i) => {
  for (const depth of [11, 16, 22]) {
    const here = byDepth.get(depth) ?? {
      rounds: 0,
      bored: 0,
      jumps: 0,
      runs: [],
    };
    byDepth.set(depth, here);
    for (let seed = 1; seed <= 10; seed++) {
      const random = rng(seed * 104729 + i);
      const state = makeState(level, depth);
      // How many jumps have come one after another.
      let run = 0;
      while (!state.lost && !state.cleared && state.rounds < 150) {
        let best = null;
        let bestScore = -Infinity;
        for (let look = 0; look < 16; look++) {
          const aim = Math.floor(random() * AIMS.length);
          const charge = Math.floor(random() * (CHARGE_MAX + 1));
          const tried = cloneState(state);
          shoot(tried, aim, charge);
          looks++;
          const value = score(tried);
          if (value > bestScore) {
            bestScore = value;
            best = [aim, charge];
          }
        }
        const shot = shoot(state, best[0], best[1]);
        rounds++;
        here.rounds++;
        if (shot.tired) here.bored++;
        if (shot.jumped) {
          here.jumps++;
          run++;
        } else {
          if (run) here.runs.push(run);
          run = 0;
        }
        dist.push(shot.dist);
        contacts.push(shot.contacts);
        broken.push(shot.broken);
        brokenBy[shot.boon ?? "plain"].push(shot.broken);
        boredBalls += shot.tired;
        stuck += shot.stuck ?? 0;
        charges[best[1]]++;
      }
      if (run) here.runs.push(run);
      games++;
      if (state.cleared) won++;
    }
  }
});
const micros = ((performance.now() - started) * 1000) / (looks + rounds);
const spread = (numbers) => [0.1, 0.5, 0.9, 1].map((p) => quantile(numbers, p));
console.log({
  games,
  won,
  rounds,
  microsecondsARound: Math.round(micros),
  unitsFlown: [0.5, 0.9, 0.99, 1].map((p) => Math.round(quantile(dist, p))),
  thingsMet: [0.5, 0.9, 0.99, 1].map((p) => quantile(contacts, p)),
  bricksBroken: spread(broken),
  bricksBrokenByBoon: Object.fromEntries(
    Object.entries(brokenBy).map(([boon, counts]) => [
      boon,
      `${counts.length} rounds, ${spread(counts).join(" / ")}`,
    ]),
  ),
  boredBalls,
  stuck,
  roundsByCharge: charges,
  byDepth: Object.fromEntries(
    [...byDepth].map(([depth, here]) => [
      depth,
      {
        rounds: here.rounds,
        roundsWithABoredBall: here.bored,
        jumps: here.jumps,
        longestRunOfJumps: Math.max(0, ...here.runs),
        runsOfThreeOrMore: here.runs.filter((run) => run >= 3).length,
      },
    ]),
  ),
});
