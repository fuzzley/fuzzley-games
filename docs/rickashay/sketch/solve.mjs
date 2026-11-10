// A solver and two players over the sketch's rules: see README.md.
import {
  AIMS,
  cloneState,
  fly,
  lowestNeeded,
  makeState,
  score,
  shoot,
} from "./sim.mjs";

/** Returns a source of numbers from 0 to 1 that a seed fixes. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Searches for a line of shots that clears a level on a field D deep, keeping
 * the `beam` best walls after each round and trying every `stride`th aim.
 * With a `margin`, a line counts only if no brick the level needs ever stands
 * in that many rows over the floor's. Returns { won, rounds, line, rallies }.
 */
export function solve(
  level,
  D,
  beam = 1,
  margin = 0,
  stride = 4,
  maxRounds = 150,
) {
  let front = [{ s: makeState(level, D), line: [], rallies: [] }];
  for (let round = 0; round < maxRounds; round++) {
    const next = [];
    for (const node of front) {
      for (let a = 0; a < AIMS.length; a += stride) {
        const s = cloneState(node.s);
        const shot = shoot(s, a);
        if (s.lost || (!s.cleared && lowestNeeded(s) <= margin)) continue;
        const entry = {
          s,
          line: [...node.line, a],
          rallies: [...node.rallies, shot.rally],
          sc: score(s),
        };
        if (s.cleared)
          return {
            won: true,
            rounds: s.rounds,
            jumps: s.jumps,
            line: entry.line,
            rallies: entry.rallies,
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

/**
 * Plays a level as a careless player would: each round it looks at a few
 * aims drawn from a seed and takes the one that leaves the wall best.
 * Returns whether it won, its rounds and jumps, each round's rally, and the
 * lowest a brick the level needs ever stood.
 */
export function casual(level, D, seed, looks = 16, maxRounds = 150) {
  const random = rng(seed);
  const s = makeState(level, D);
  const rallies = [];
  let minLow = Infinity,
    saves = 0;
  while (!s.lost && !s.cleared && s.rounds < maxRounds) {
    let best = 0,
      bestScore = -Infinity;
    for (let i = 0; i < looks; i++) {
      const aim = Math.floor(random() * AIMS.length);
      const t = cloneState(s);
      shoot(t, aim);
      const sc = score(t);
      if (sc > bestScore) {
        bestScore = sc;
        best = aim;
      }
    }
    const shot = shoot(s, best);
    rallies.push(shot.rally);
    saves += shot.saves;
    if (!s.cleared && !s.lost) minLow = Math.min(minLow, lowestNeeded(s));
  }
  return {
    won: s.cleared,
    rounds: s.rounds,
    jumps: s.jumps,
    rallies,
    saves,
    minLow,
  };
}

/**
 * Plays a level blind: every round's aim drawn from a seed, with no look at
 * what it would do. It is the floor a level's own shape gives a flight, and
 * what a player's choice is measured against.
 */
export function blind(level, D, seed, maxRounds = 150) {
  const random = rng(seed);
  const s = makeState(level, D);
  const rallies = [];
  while (!s.lost && !s.cleared && s.rounds < maxRounds)
    rallies.push(shoot(s, Math.floor(random() * AIMS.length)).rally);
  return { won: s.cleared, rounds: s.rounds, jumps: s.jumps, rallies };
}

/**
 * Plays a level by the aim guide alone: each round it sweeps the aims a
 * degree apart, sees of each flight only its first `turns` turns, and takes
 * the one that has struck the most by then and is still in the air, the
 * higher the better. It is what a guide of that length lets a player plan.
 */
export function guided(level, D, seed, turns, maxRounds = 150) {
  const random = rng(seed);
  const s = makeState(level, D);
  const rallies = [];
  while (!s.lost && !s.cleared && s.rounds < maxRounds) {
    let best = 0,
      bestValue = -Infinity;
    for (let aim = 0; aim < AIMS.length; aim += 4) {
      const shot = fly(cloneState(s), aim, null, turns);
      const value =
        (shot.cut ? 100 + 10 * shot.rally + shot.height : shot.rally) +
        random() * 0.01;
      if (value > bestValue) {
        bestValue = value;
        best = aim;
      }
    }
    rallies.push(shoot(s, best).rally);
  }
  return { won: s.cleared, rounds: s.rounds, jumps: s.jumps, rallies };
}

/**
 * Flies every aim from where the fuzzball waits and returns each one's
 * rally, without changing the state.
 */
export function everyAim(s) {
  return AIMS.map((_, aim) => shoot(cloneState(s), aim).rally);
}

/**
 * Returns the widest run of neighboring aims that each rally `mark` or more,
 * in degrees: how much room a hand has to find a long flight.
 */
export function sweetSpot(rallies, mark) {
  let run = 0,
    widest = 0;
  for (const rally of rallies) {
    run = rally >= mark ? run + 1 : 0;
    widest = Math.max(widest, run);
  }
  return widest / 4;
}
