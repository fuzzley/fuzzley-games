// A solver and a careless player over the sketch's rules: see README.md.
import {
  AIMS,
  CHARGE_MAX,
  cloneState,
  makeState,
  score,
  shoot,
  lowestNeeded,
} from "./sim.mjs";
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ACTIONS = [];
for (let a = 0; a < AIMS.length; a++)
  for (let c = 0; c <= CHARGE_MAX; c++) ACTIONS.push([a, c]);
/**
 * Searches for a line of shots that clears a level on a field D deep, keeping
 * the `beam` best walls after each round. With a `margin`, a line counts only
 * if no brick the level needs ever stands in that many rows over the floor's.
 * Returns { won, rounds, line, broke }.
 */
export function solve(level, D, beam = 1, margin = 0, maxRounds = 150) {
  let front = [{ s: makeState(level, D), line: [], broke: [] }];
  for (let round = 0; round < maxRounds; round++) {
    const next = [];
    for (const node of front) {
      for (const [a, c] of ACTIONS) {
        const s = cloneState(node.s);
        const shot = shoot(s, a, c);
        if (s.lost || (!s.cleared && lowestNeeded(s) <= margin)) continue;
        const entry = {
          s,
          line: [...node.line, [a, c]],
          broke: [...node.broke, shot.broken],
          sc: score(s),
        };
        if (s.cleared)
          return {
            won: true,
            rounds: s.rounds,
            jumps: s.jumps,
            line: entry.line,
            broke: entry.broke,
          };
        next.push(entry);
      }
    }
    if (!next.length) return { won: false, rounds: round + 1 };
    next.sort((p, q) => q.sc - p.sc);
    front = [];
    const seen = new Set();
    for (const n of next) {
      const key = n.sc.toFixed(6) + "|" + n.s.x.toFixed(4);
      if (seen.has(key)) continue;
      seen.add(key);
      front.push(n);
      if (front.length >= beam) break;
    }
  }
  return { won: false, rounds: maxRounds };
}
/** Plays a level as a careless player would: each round it looks at a few shots drawn from a seed and takes the best. */
export function casual(level, D, seed, looks = 16, maxRounds = 150) {
  const random = rng(seed);
  const s = makeState(level, D);
  let minLow = Infinity;
  while (!s.lost && !s.cleared && s.rounds < maxRounds) {
    let best = null,
      bestScore = -Infinity;
    for (let i = 0; i < looks; i++) {
      const act = ACTIONS[Math.floor(random() * ACTIONS.length)];
      const t = cloneState(s);
      shoot(t, act[0], act[1]);
      const sc = score(t);
      if (sc > bestScore) {
        bestScore = sc;
        best = act;
      }
    }
    shoot(s, best[0], best[1]);
    if (!s.cleared && !s.lost) minLow = Math.min(minLow, lowestNeeded(s));
  }
  return { won: s.cleared, rounds: s.rounds, jumps: s.jumps, minLow };
}
