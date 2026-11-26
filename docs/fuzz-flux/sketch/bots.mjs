/**
 * Plays Fuzz Flux's draft levels three ways, to say how hard each is and to
 * prove that each deal can be won: a throwaway sketch, not the game's code.
 */

/** @import { State } from './engine.mjs' */

import { clone, findBunches, legalMoves, play } from "./engine.mjs";

/**
 * Returns how good a board looks to a player who counts what the goals still
 * need, what special fuzzballs stand ready and what is in the way.
 * @param {State} s
 * @returns {number}
 */
export function worth(s) {
  if (s.won) return 10000 + s.moves * 50;
  let v = 0;
  s.goals.forEach((g, gi) => {
    const left = Math.max(0, s.left[gi]);
    if (g.type === "gather") v -= left;
    else if (g.type === "dust") v -= left * 2.5;
    else if (g.type === "brick") v -= left * 3;
    else if (g.type === "cage") v -= left * 5;
    else v -= left * 14;
  });
  const wantsBricks = s.goals.some(
    (g, gi) => g.type === "brick" && s.left[gi] > 0,
  );
  const wantsSleepy = s.goals.some(
    (g, gi) => g.type === "sleepy" && s.left[gi] > 0,
  );
  for (let i = 0; i < s.piece.length; i++) {
    const p = s.piece[i];
    if (!p) continue;
    if (p.t === "frizz") v += 4;
    else if (p.sp === "puff") v += 2.5;
    else if (p.sp === "wisp") v += 1.4;
    else if (p.sp) v += 1.8;
    if (p.burr) v -= 1.6;
    if (p.t === "brick" && wantsBricks) v -= p.hp * 1.2;
    if (p.t === "sleepy" && wantsSleepy) {
      // Every row a sleepyhead still has to sink is a row of work.
      const y = Math.floor(i / s.w);
      v -= (s.h - 1 - y) * 1.1;
    }
  }
  return v;
}

/**
 * Returns a generator of whole numbers below a bound, seeded.
 * @param {number} seed
 * @returns {(n: number) => number}
 */
export function dice(seed) {
  let a = seed >>> 0 || 1;
  return (n) => {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5;
    a >>>= 0;
    return a % n;
  };
}

/**
 * Chooses the move a careful player makes: the one that leaves the board
 * looking best once everything it sets off has settled. It cannot see what
 * will fall in, so it pictures each move with fuzzballs of its own guessing,
 * twice over, and what really falls is something else.
 * @param {State} s
 * @returns {{ a: number, b: number } | null}
 */
export function carefulMove(s) {
  let best = null;
  let bestWorth = -Infinity;
  for (const m of legalMoves(s)) {
    let v = 0;
    for (const guess of [0x5bd1e995, 0x1b873593]) {
      const t = clone(s);
      t.seed = (s.seed ^ guess) >>> 0;
      play(t, m.a, m.b);
      v += worth(t);
    }
    if (v > bestWorth) {
      bestWorth = v;
      best = m;
    }
  }
  return best;
}

/**
 * Returns how a move looks at a glance, before anything falls: how many it
 * bunches, whether it makes or uses a special, and whether it touches a goal.
 * @param {State} s
 * @param {{ a: number, b: number }} m
 * @returns {number}
 */
function glance(s, m) {
  const pa = s.piece[m.a];
  const pb = s.piece[m.b];
  if (!pa || !pb) return 0;
  let v = 0;
  if (pa.sp || pa.t === "frizz") v += 4;
  if (pb.sp || pb.t === "frizz") v += 4;
  s.piece[m.a] = pb;
  s.piece[m.b] = pa;
  for (const bunch of findBunches(s, m.a, m.b)) {
    v += bunch.cells.length;
    if (bunch.makes) v += 3;
    if (
      s.goals.some(
        (g, gi) =>
          g.type === "gather" && g.kind === bunch.kind && s.left[gi] > 0,
      )
    ) {
      v += 1.5;
    }
    for (const i of bunch.cells) {
      if (s.dust[i] > 0) v += 1;
      if (s.piece[i]?.cage) v += 2;
      for (let j = i - s.w; j >= 0; j -= s.w) {
        if (s.piece[j]?.t === "sleepy") v += 1.5;
      }
      for (const j of [i - 1, i + 1, i - s.w, i + s.w]) {
        if (s.piece[j]?.t === "brick" || s.piece[j]?.burr) v += 0.7;
      }
    }
  }
  s.piece[m.a] = pa;
  s.piece[m.b] = pb;
  return v;
}

/**
 * Chooses the move a casual player makes: most often the one that looks best
 * at a glance, and otherwise any move at all.
 * @param {State} s
 * @param {(n: number) => number} roll
 * @param {number} [care] How often, in a hundred moves, it takes the best-looking one.
 * @returns {{ a: number, b: number } | null}
 */
export function casualMove(s, roll, care = 65) {
  const moves = legalMoves(s);
  if (moves.length === 0) return null;
  if (roll(100) >= care) return moves[roll(moves.length)];
  let best = moves[0];
  let bestLook = -1;
  for (const m of moves) {
    const look = glance(s, m) + roll(100) / 200;
    if (look > bestLook) {
      bestLook = look;
      best = m;
    }
  }
  return best;
}

/**
 * Plays a deal to its end with one of the players, and returns how it went.
 * @param {State} s Changed as it is played.
 * @param {(s: State) => ({ a: number, b: number } | null)} choose
 * @returns {{ won: boolean, used: number, line: number[][] }}
 */
export function playOut(s, choose) {
  const line = [];
  const start = s.moves;
  while (!s.won && !s.lost) {
    const m = choose(s);
    if (!m) break;
    line.push([m.a, m.b]);
    play(s, m.a, m.b);
  }
  return { won: s.won, used: start - s.moves, line };
}

/**
 * Looks for a line that wins a deal, keeping the few best boards after every
 * move, and returns the shortest it finds.
 * @param {State} s
 * @param {number} [width] How many boards it keeps a move.
 * @returns {{ won: boolean, used: number, line: number[][] }}
 */
export function certify(s, width = 10) {
  /** @type {{ s: State, line: number[][], v: number }[]} */
  let beam = [{ s, line: [], v: worth(s) }];
  const limit = s.moves;
  for (let depth = 0; depth < limit; depth++) {
    /** @type {{ s: State, line: number[][], v: number }[]} */
    const next = [];
    for (const node of beam) {
      for (const m of legalMoves(node.s)) {
        const t = clone(node.s);
        play(t, m.a, m.b);
        const line = [...node.line, [m.a, m.b]];
        if (t.won) return { won: true, used: line.length, line };
        if (!t.lost) next.push({ s: t, line, v: worth(t) });
      }
    }
    if (next.length === 0) break;
    next.sort((p, q) => q.v - p.v);
    beam = next.slice(0, width);
  }
  return { won: false, used: limit, line: [] };
}
