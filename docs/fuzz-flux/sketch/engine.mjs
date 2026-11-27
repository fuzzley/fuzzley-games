/**
 * Plays Fuzz Flux's rules as the design has them: a throwaway sketch, written
 * for the design's bots and its feel sketch, not the game's code.
 *
 * A move is played whole, and what happened is handed back as a record of
 * steps, which a view can then play in its own time.
 */

/**
 * @typedef {'fuzz' | 'frizz' | 'brick' | 'sleepy'} PieceType
 * @typedef {'dash-h' | 'dash-v' | 'puff' | 'wisp'} Special
 */

/**
 * Something that sits in a square.
 * @typedef {object} Piece
 * @property {number} id Stays with the piece for as long as it is on the board.
 * @property {PieceType} t
 * @property {number} k The index of a fuzzball's kind in the level's kinds; -1 otherwise.
 * @property {Special | null} sp
 * @property {boolean} cage
 * @property {boolean} burr
 * @property {number} hp A brick's hits left.
 */

/**
 * @typedef {{ type: 'gather', kind: number, count: number }
 *   | { type: 'dust' | 'brick' | 'cage' | 'sleepy', count: number }} Goal
 */

/**
 * A game under way, in the engine's own space, where things always fall down
 * the board: a wind that blows another way turns the board instead.
 * @typedef {object} State
 * @property {number} w
 * @property {number} h
 * @property {number} rot Quarter turns clockwise from the screen to here.
 * @property {Uint8Array} open 1 where the board has a square.
 * @property {(Piece | null)[]} piece
 * @property {Uint8Array} dust Layers of dust on each square.
 * @property {Uint8Array} bed 1 where a sleepyhead leaves the board.
 * @property {number} kinds How many kinds of fuzzball the level plays with.
 * @property {Goal[]} goals
 * @property {number[]} left What each goal still needs.
 * @property {number} moves Moves left.
 * @property {number} score
 * @property {number} seed
 * @property {number[][]} spawned For each turn of the board, how many fuzzballs each lane has let in.
 * @property {number} nextId
 * @property {number} turn Moves played.
 * @property {{ every: number, turn: number, wait: number } | null} gust
 * @property {boolean} won
 * @property {boolean} lost
 */

/**
 * One square struck in a step, and what the strike did.
 * @typedef {object} Hit
 * @property {number} i The square.
 * @property {number} id The piece it struck, or -1 for a bare square.
 * @property {'gather' | 'uncage' | 'unburr' | 'knock' | 'break' | 'dust' | 'ruffle' | 'born' | 'bed'} what
 * @property {number} rank Its place in the blast's order, 0 at the blast's own square.
 * @property {number} src The blast that struck it, an index into the step's blasts; -1 for a bunch.
 * @property {number} [kind]
 * @property {number} [dustLeft]
 */

/**
 * A special fuzzball going off.
 * @typedef {object} Blast
 * @property {string} what 'dash-h', 'puff', 'frizz', 'cross' and the rest.
 * @property {number} i Where it goes off.
 * @property {number} id The piece that went off, or -1.
 * @property {number} kind The kind it wore, or the kind a frizzball took.
 * @property {number} after The blast that set it off, or -1 for the move itself.
 * @property {number} wait Its rank in the blast that set it off.
 * @property {number[]} cells The squares it struck, in order.
 * @property {number[]} [targets] The squares a wisp flew to.
 * @property {number} [from] The square a wisp took off from.
 */

/**
 * A bunch found in a step.
 * @typedef {object} Bunch
 * @property {number[]} cells
 * @property {number} kind
 * @property {'frizz' | 'puff' | 'dash' | 'wisp' | null} makes
 * @property {number} keeper The square whose fuzzball becomes the special.
 * @property {Special | 'frizz' | null} born What it becomes.
 * @property {number} bornId The id of the special once made.
 */

/**
 * One piece's way down in a step: every square it passes, last where it lands.
 * @typedef {object} Fall
 * @property {number} id
 * @property {number[]} path Squares, the first where it began; -1 for above the board.
 * @property {boolean} spawn
 * @property {number} kind
 * @property {number} lane
 */

/**
 * One wave of a move: the bunches found, what went off, what fell after.
 * @typedef {object} Step
 * @property {number} n 1 for the move's own wave, 2 for the first it sets off.
 * @property {Bunch[]} bunches
 * @property {Blast[]} blasts
 * @property {Hit[]} hits
 * @property {Fall[]} falls
 * @property {number[]} left The goals' counts once the step is done.
 * @property {number} score
 */

/**
 * @typedef {object} Record
 * @property {{ a: number, b: number, ok: boolean }} swap
 * @property {Step[]} steps
 * @property {{ from: number, to: number, id: number } | null} burr
 * @property {{ rot: number, steps: Step[] } | null} gust
 * @property {{ perm: { id: number, from: number, to: number }[] } | null} shuffle
 * @property {boolean} won
 * @property {boolean} lost
 */

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Returns a number in [0, 2^32) from four whole numbers, the same every time.
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 * @returns {number}
 */
export function hash(a, b, c, d) {
  let h = 0x9e3779b9 ^ Math.imul(a | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35) ^ Math.imul(b | 0, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13), 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) ^ Math.imul(d | 0, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  return (h ^ (h >>> 14)) >>> 0;
}

/**
 * Returns a copy of a game that can be played on without changing the first.
 * @param {State} s
 * @returns {State}
 */
export function clone(s) {
  return {
    ...s,
    piece: s.piece.map((p) => (p ? { ...p } : null)),
    dust: s.dust.slice(),
    left: s.left.slice(),
    spawned: s.spawned.map((lane) => lane.slice()),
    gust: s.gust ? { ...s.gust } : null,
  };
}

/**
 * Returns the kind a square's piece bunches as, or -1 where nothing there can.
 * @param {State} s
 * @param {number} i
 * @returns {number}
 */
function kindAt(s, i) {
  const p = s.piece[i];
  return p && p.t === "fuzz" ? p.k : -1;
}

/**
 * Returns whether a square's piece can be picked up and swapped.
 * @param {State} s
 * @param {number} i
 * @returns {boolean}
 */
export function canSwap(s, i) {
  const p = s.piece[i];
  return !!p && (p.t === "fuzz" || p.t === "frizz") && !p.cage && !p.burr;
}

/**
 * Returns whether a square's piece falls when the square under it empties.
 * @param {Piece | null} p
 * @returns {boolean}
 */
function falls(p) {
  return !!p && p.t !== "brick" && !p.cage;
}

/**
 * Returns whether the fuzzball in a square stands in a bunch as the board is.
 * @param {State} s
 * @param {number} i
 * @returns {boolean}
 */
function bunchAt(s, i) {
  const k = kindAt(s, i);
  if (k < 0) return false;
  const { w, h } = s;
  const x = i % w;
  const y = (i - x) / w;
  let run = 1;
  for (let xx = x - 1; xx >= 0 && kindAt(s, y * w + xx) === k; xx--) run++;
  for (let xx = x + 1; xx < w && kindAt(s, y * w + xx) === k; xx++) run++;
  if (run >= 3) return true;
  run = 1;
  for (let yy = y - 1; yy >= 0 && kindAt(s, yy * w + x) === k; yy--) run++;
  for (let yy = y + 1; yy < h && kindAt(s, yy * w + x) === k; yy++) run++;
  if (run >= 3) return true;
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
      if (
        kindAt(s, y * w + xx) === k &&
        kindAt(s, yy * w + x) === k &&
        kindAt(s, yy * w + xx) === k
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns every move the board allows, each a pair of neighboring squares.
 * @param {State} s
 * @returns {{ a: number, b: number }[]}
 */
export function legalMoves(s) {
  const { w, h } = s;
  const moves = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = y * w + x;
      if (!canSwap(s, a)) continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= w || yy >= h) continue;
        const b = yy * w + xx;
        if (!canSwap(s, b)) continue;
        if (swapWorks(s, a, b)) moves.push({ a, b });
      }
    }
  }
  return moves;
}

/**
 * Returns whether swapping two neighboring squares is a move: it is when
 * either is a special fuzzball, or when the swap makes a bunch.
 * @param {State} s
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function swapWorks(s, a, b) {
  const pa = /** @type {Piece} */ (s.piece[a]);
  const pb = /** @type {Piece} */ (s.piece[b]);
  if (pa.sp || pb.sp || pa.t === "frizz" || pb.t === "frizz") return true;
  if (pa.k === pb.k) return false;
  s.piece[a] = pb;
  s.piece[b] = pa;
  const works = bunchAt(s, a) || bunchAt(s, b);
  s.piece[a] = pa;
  s.piece[b] = pb;
  return works;
}

/**
 * Finds every bunch on the board: lines of 3 or more of a kind, squares of 4,
 * and whatever of those touch, taken as one.
 * @param {State} s
 * @param {number} [a] The square a swap moved a fuzzball from, where one was made.
 * @param {number} [b] The square it moved to.
 * @returns {Bunch[]}
 */
export function findBunches(s, a = -1, b = -1) {
  const { w, h } = s;
  const n = w * h;
  /** @type {{ cells: number[], dir: 'h' | 'v' | 's' }[]} */
  const groups = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const k = kindAt(s, y * w + x);
      let x2 = x + 1;
      if (k >= 0) {
        while (x2 < w && kindAt(s, y * w + x2) === k) x2++;
        if (x2 - x >= 3) {
          const cells = [];
          for (let xx = x; xx < x2; xx++) cells.push(y * w + xx);
          groups.push({ cells, dir: "h" });
        }
      }
      x = x2;
    }
  }
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      const k = kindAt(s, y * w + x);
      let y2 = y + 1;
      if (k >= 0) {
        while (y2 < h && kindAt(s, y2 * w + x) === k) y2++;
        if (y2 - y >= 3) {
          const cells = [];
          for (let yy = y; yy < y2; yy++) cells.push(yy * w + x);
          groups.push({ cells, dir: "v" });
        }
      }
      y = y2;
    }
  }
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const k = kindAt(s, i);
      if (
        k >= 0 &&
        kindAt(s, i + 1) === k &&
        kindAt(s, i + w) === k &&
        kindAt(s, i + w + 1) === k
      ) {
        groups.push({ cells: [i, i + 1, i + w, i + w + 1], dir: "s" });
      }
    }
  }
  if (groups.length === 0) return [];

  // Groups that share a square are one bunch.
  const owner = new Int32Array(n).fill(-1);
  const parent = groups.map((_, g) => g);
  /** @param {number} g @returns {number} */
  const find = (g) => {
    while (parent[g] !== g) {
      parent[g] = parent[parent[g]];
      g = parent[g];
    }
    return g;
  };
  groups.forEach((group, g) => {
    for (const i of group.cells) {
      if (owner[i] < 0) owner[i] = g;
      else parent[find(g)] = find(owner[i]);
    }
  });
  /** @type {Map<number, { cells: Set<number>, groups: typeof groups }>} */
  const sets = new Map();
  groups.forEach((group, g) => {
    const root = find(g);
    let set = sets.get(root);
    if (!set) sets.set(root, (set = { cells: new Set(), groups: [] }));
    set.groups.push(group);
    for (const i of group.cells) set.cells.add(i);
  });

  /** @type {Bunch[]} */
  const bunches = [];
  for (const set of sets.values()) {
    const cells = [...set.cells].sort((p, q) => p - q);
    const kind = kindAt(s, cells[0]);
    const lines = set.groups.filter((g) => g.dir !== "s");
    const longest = lines.reduce((m, g) => Math.max(m, g.cells.length), 0);
    const hasH = lines.some((g) => g.dir === "h");
    const hasV = lines.some((g) => g.dir === "v");
    const hasSquare = set.groups.some((g) => g.dir === "s");
    /** @type {Bunch['makes']} */
    let makes = null;
    if (longest >= 5) makes = "frizz";
    else if (hasH && hasV) makes = "puff";
    else if (longest === 4) makes = "dash";
    else if (hasSquare) makes = "wisp";

    let keeper = -1;
    /** @type {Bunch['born']} */
    let born = null;
    if (makes) {
      const swapped = set.cells.has(b) ? b : set.cells.has(a) ? a : -1;
      if (swapped >= 0) keeper = swapped;
      else if (makes === "puff") {
        const across = new Set(
          lines.filter((g) => g.dir === "h").flatMap((g) => g.cells),
        );
        keeper =
          lines
            .filter((g) => g.dir === "v")
            .flatMap((g) => g.cells)
            .find((i) => across.has(i)) ?? cells[cells.length - 1];
      } else if (makes === "wisp") {
        const square = /** @type {{ cells: number[] }} */ (
          set.groups.find((g) => g.dir === "s")
        );
        keeper = square.cells[2];
      } else {
        const line = /** @type {{ cells: number[], dir: string }} */ (
          lines.find((g) => g.cells.length === longest)
        );
        keeper =
          line.dir === "v"
            ? line.cells[line.cells.length - 1]
            : line.cells[Math.floor((line.cells.length - 1) / 2)];
      }
      if (makes === "dash") {
        // A dasher dashes the way it was last moving: along a swap, or down a fall.
        const along =
          swapped >= 0 && Math.abs(a - b) === 1 ? "dash-h" : "dash-v";
        born = along;
      } else born = makes;
    }
    bunches.push({ cells, kind, makes, keeper, born, bornId: -1 });
  }
  return bunches;
}

/**
 * Returns the squares a blast strikes, nearest first, each with its rank.
 * @param {State} s
 * @param {string} what
 * @param {number} i
 * @returns {{ i: number, rank: number }[]}
 */
export function reach(s, what, i) {
  const { w, h } = s;
  const x = i % w;
  const y = (i - x) / w;
  /** @type {{ i: number, rank: number }[]} */
  const out = [];
  /** @param {number} xx @param {number} yy @param {number} rank */
  const add = (xx, yy, rank) => {
    if (xx < 0 || xx >= w || yy < 0 || yy >= h) return;
    const j = yy * w + xx;
    if (s.open[j]) out.push({ i: j, rank });
  };
  if (what === "dash-h" || what === "cross") {
    for (let xx = 0; xx < w; xx++) add(xx, y, Math.abs(xx - x));
  }
  if (what === "dash-v" || what === "cross") {
    for (let yy = 0; yy < h; yy++)
      if (what !== "cross" || yy !== y) add(x, yy, Math.abs(yy - y));
  }
  if (what === "bigcross") {
    const seen = new Set();
    for (let d = -1; d <= 1; d++) {
      for (let xx = 0; xx < w; xx++) {
        const key = (y + d) * w + xx;
        if (!seen.has(key)) {
          seen.add(key);
          add(xx, y + d, Math.abs(xx - x));
        }
      }
      for (let yy = 0; yy < h; yy++) {
        const key = yy * w + x + d;
        if (!seen.has(key) && x + d >= 0 && x + d < w) {
          seen.add(key);
          add(x + d, yy, Math.abs(yy - y));
        }
      }
    }
  }
  if (what === "puff" || what === "bigpuff") {
    const far = what === "puff" ? 2 : 4;
    for (let dy = -far; dy <= far; dy++) {
      for (let dx = -far; dx <= far; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= far) add(x + dx, y + dy, d);
      }
    }
  }
  if (what === "all") {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++)
        add(xx, yy, Math.abs(xx - x) + Math.abs(yy - y));
    }
  }
  out.sort((p, q) => p.rank - q.rank || p.i - q.i);
  return out;
}

/**
 * Chooses where a wisp flies: to the square that most helps a goal still
 * open, the farthest such, and never one already chosen this step.
 * @param {State} s
 * @param {number} from
 * @param {Set<number>} taken
 * @param {Uint8Array} gone Squares already gathered this step.
 * @returns {number} The square, or -1 where nothing is left to strike.
 */
export function wispTarget(s, from, taken, gone) {
  const { w } = s;
  const needs = new Set();
  const wanted = new Set();
  s.goals.forEach((g, gi) => {
    if (s.left[gi] <= 0) return;
    if (g.type === "gather") wanted.add(g.kind);
    else needs.add(g.type);
  });
  // Under a sleepyhead, whatever holds it up is worth striking.
  const under = new Set();
  if (needs.has("sleepy")) {
    for (let i = 0; i < s.piece.length; i++) {
      if (s.piece[i]?.t !== "sleepy") continue;
      for (let j = i + w; j < s.piece.length; j += w) {
        if (s.open[j] && s.piece[j]) {
          under.add(j);
          break;
        }
      }
    }
  }
  let best = -1;
  let bestScore = -1;
  const fx = from % w;
  const fy = (from - fx) / w;
  for (let i = 0; i < s.piece.length; i++) {
    if (!s.open[i] || taken.has(i) || gone[i] || i === from) continue;
    const p = s.piece[i];
    let worth = 0;
    if (p?.cage) worth = needs.has("cage") ? 90 : 30;
    else if (p?.t === "brick") worth = needs.has("brick") ? 80 - p.hp : 24;
    else if (under.has(i)) worth = 70;
    else if (p?.burr) worth = 60;
    else if (s.dust[i] > 0 && needs.has("dust") && p && p.t !== "sleepy")
      worth = 50 + s.dust[i];
    else if (p?.t === "fuzz" && wanted.has(p.k)) worth = 40;
    else if (p?.t === "fuzz") worth = 10;
    if (worth === 0) continue;
    const x = i % w;
    const y = (i - x) / w;
    const far = Math.abs(x - fx) + Math.abs(y - fy);
    const score = worth * 1000 + far * 10 + (hash(s.seed, s.turn, i, 7) % 10);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * Returns the kind a frizzball takes when nothing chose one for it: the kind
 * with the most fuzzballs on the board.
 * @param {State} s
 * @returns {number}
 */
function commonKind(s) {
  const counts = new Array(s.kinds).fill(0);
  for (const p of s.piece) if (p && p.t === "fuzz") counts[p.k]++;
  let best = 0;
  for (let k = 1; k < counts.length; k++)
    if (counts[k] > counts[best]) best = k;
  return best;
}

/**
 * Plays one wave: gathers the bunches, sets off what they and the move set
 * off, and lets the board fall.
 * @param {State} s
 * @param {number} n The wave's number in its move.
 * @param {Bunch[]} bunches
 * @param {{ what: string, i: number, id: number, kind: number }[]} first Blasts the move itself sets off.
 * @param {{ burrGone: boolean }} flags
 * @param {boolean} keep Whether to write the step down.
 * @returns {Step | null}
 */
function wave(s, n, bunches, first, flags, keep) {
  const { w, h } = s;
  const size = w * h;
  const gone = new Uint8Array(size);
  const safe = new Uint8Array(size);
  /** @type {Hit[]} */
  const hits = [];
  /** @type {Blast[]} */
  const blasts = [];
  /** @type {{ what: string, i: number, id: number, kind: number, after: number, wait: number }[]} */
  const queue = [];
  const taken = new Set();
  const times = Math.min(n, 5);

  /** @param {string} type @param {number} [kind] */
  const count = (type, kind) => {
    s.goals.forEach((g, gi) => {
      if (g.type !== type) return;
      if (g.type === "gather" && g.kind !== kind) return;
      s.left[gi]--;
    });
  };
  /** @param {number} i @param {number} src @param {number} rank */
  const sweep = (i, src, rank) => {
    if (s.dust[i] > 0) {
      s.dust[i]--;
      count("dust");
      s.score += 20 * times;
      if (keep)
        hits.push({ i, id: -1, what: "dust", rank, src, dustLeft: s.dust[i] });
    }
  };
  /**
   * Takes a fuzzball off the board, and sets it off if it is a special one.
   * @param {number} i @param {number} src @param {number} rank
   */
  const gather = (i, src, rank) => {
    const p = /** @type {Piece} */ (s.piece[i]);
    if (p.cage) {
      p.cage = false;
      count("cage");
    }
    if (p.burr) {
      p.burr = false;
      flags.burrGone = true;
    }
    s.piece[i] = null;
    gone[i] = 1;
    if (p.t === "fuzz") count("gather", p.k);
    s.score += 10 * times;
    if (keep) hits.push({ i, id: p.id, what: "gather", rank, src, kind: p.k });
    sweep(i, src, rank);
    if (p.sp)
      queue.push({
        what: p.sp,
        i,
        id: p.id,
        kind: p.k,
        after: src,
        wait: rank,
      });
    else if (p.t === "frizz") {
      queue.push({
        what: "frizz",
        i,
        id: p.id,
        kind: commonKind(s),
        after: src,
        wait: rank,
      });
    }
  };
  /**
   * Strikes a square once, taking the outermost thing there.
   * @param {number} i @param {number} src @param {number} rank
   */
  const strike = (i, src, rank) => {
    if (safe[i]) return;
    const p = s.piece[i];
    if (!p) {
      sweep(i, src, rank);
      return;
    }
    if (p.t === "brick") {
      p.hp--;
      s.score += 20 * times;
      if (p.hp <= 0) {
        s.piece[i] = null;
        count("brick");
        if (keep) hits.push({ i, id: p.id, what: "break", rank, src });
      } else if (keep) hits.push({ i, id: p.id, what: "knock", rank, src });
      return;
    }
    if (p.t === "sleepy") {
      if (keep) hits.push({ i, id: p.id, what: "ruffle", rank, src });
      return;
    }
    if (p.cage) {
      p.cage = false;
      count("cage");
      s.score += 30 * times;
      if (keep) hits.push({ i, id: p.id, what: "uncage", rank, src });
      return;
    }
    if (p.burr) {
      p.burr = false;
      flags.burrGone = true;
      if (keep) hits.push({ i, id: p.id, what: "unburr", rank, src });
      return;
    }
    gather(i, src, rank);
  };

  // The bunches: every fuzzball in one is gathered, but for the one that
  // becomes a special, and a bunch knocks the bricks and burrs beside it.
  /** @type {{ i: number, born: NonNullable<Bunch['born']>, kind: number, bunch: Bunch }[]} */
  const later = [];
  for (const bunch of bunches) {
    for (const i of bunch.cells) {
      const p = /** @type {Piece} */ (s.piece[i]);
      if (bunch.born && i === bunch.keeper && !p.sp) {
        if (p.cage) {
          p.cage = false;
          count("cage");
        }
        if (p.burr) {
          p.burr = false;
          flags.burrGone = true;
        }
        if (bunch.born === "frizz") {
          p.t = "frizz";
          p.k = -1;
        } else p.sp = bunch.born;
        bunch.bornId = p.id;
        safe[i] = 1;
        s.score += 60 * times;
        sweep(i, -1, 0);
        if (keep)
          hits.push({
            i,
            id: p.id,
            what: "born",
            rank: 0,
            src: -1,
            kind: bunch.kind,
          });
      } else {
        if (bunch.born && i === bunch.keeper) {
          later.push({ i, born: bunch.born, kind: bunch.kind, bunch });
          safe[i] = 1;
        }
        gather(i, -1, 0);
      }
    }
    const beside = new Set();
    for (const i of bunch.cells) {
      const x = i % w;
      const y = (i - x) / w;
      for (const [dx, dy] of DIRS) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
        beside.add(yy * w + xx);
      }
    }
    for (const j of beside) {
      const p = s.piece[j];
      if (!p || gone[j] || safe[j]) continue;
      if (p.t === "brick") strike(j, -1, 1);
      else if (p.burr && !bunch.cells.includes(j)) strike(j, -1, 1);
    }
  }

  for (const f of first) queue.push({ ...f, after: -1, wait: 0 });

  // What went off, in the order it was set off.
  while (queue.length > 0) {
    const q = /** @type {(typeof queue)[number]} */ (queue.shift());
    const src = blasts.length;
    /** @type {Blast} */
    const blast = {
      what: q.what,
      i: q.i,
      id: q.id,
      kind: q.kind,
      after: q.after,
      wait: q.wait,
      cells: [],
    };
    blasts.push(blast);
    if (q.what === "wisp" || q.what === "wisp3" || q.what.startsWith("wisp-")) {
      const flights = q.what === "wisp3" ? 3 : 1;
      blast.from = q.i;
      blast.targets = [];
      for (let t = 0; t < flights; t++) {
        const target = wispTarget(s, q.i, taken, gone);
        if (target < 0) break;
        taken.add(target);
        blast.targets.push(target);
        blast.cells.push(target);
        if (q.what === "wisp" || q.what === "wisp3") strike(target, src, 1 + t);
        else {
          // It carries what it was swapped with, which goes off where it lands.
          const carried = q.what.slice(5);
          queue.push({
            what: carried,
            i: target,
            id: -1,
            kind: q.kind,
            after: src,
            wait: 1,
          });
        }
      }
    } else if (q.what === "frizz") {
      const cells = reach(s, "all", q.i).filter(({ i }) => {
        const p = s.piece[i];
        return p && p.t === "fuzz" && p.k === q.kind && !gone[i];
      });
      cells.forEach(({ i }, order) => {
        blast.cells.push(i);
        strike(i, src, order + 1);
      });
    } else if (q.what.startsWith("frizz-") && q.what !== "frizz-frizz") {
      const gives = q.what.slice(6);
      const cells = reach(s, "all", q.i).filter(({ i }) => {
        const p = s.piece[i];
        return (
          p &&
          p.t === "fuzz" &&
          p.k === q.kind &&
          !p.cage &&
          !gone[i] &&
          !safe[i]
        );
      });
      cells.forEach(({ i }, order) => {
        const p = /** @type {Piece} */ (s.piece[i]);
        blast.cells.push(i);
        p.sp = /** @type {Special} */ (
          gives === "dash" ? (order % 2 ? "dash-v" : "dash-h") : gives
        );
        p.burr = false;
      });
      cells.forEach(({ i }, order) => {
        if (!gone[i] && s.piece[i]) gather(i, src, order + 1);
      });
    } else {
      const what = q.what === "frizz-frizz" ? "all" : q.what;
      for (const { i, rank } of reach(s, what, q.i)) {
        blast.cells.push(i);
        strike(i, src, rank);
      }
    }
  }

  // A special made from a fuzzball that was already one stands where it stood.
  for (const { i, born, kind, bunch } of later) {
    const id = s.nextId++;
    s.piece[i] =
      born === "frizz"
        ? { id, t: "frizz", k: -1, sp: null, cage: false, burr: false, hp: 0 }
        : { id, t: "fuzz", k: kind, sp: born, cage: false, burr: false, hp: 0 };
    bunch.bornId = id;
    if (keep) hits.push({ i, id, what: "born", rank: 0, src: -1, kind });
  }

  const fallsDown = settle(s, keep, hits);
  if (!keep) return null;
  return {
    n,
    bunches,
    blasts,
    hits,
    falls: fallsDown,
    left: s.left.slice(),
    score: s.score,
  };
}

/**
 * Lets everything that can fall do so, rolls fuzzballs in under what holds
 * still, lets new ones in at the top, and puts sleepyheads to bed.
 * @param {State} s
 * @param {boolean} keep
 * @param {Hit[]} hits
 * @returns {Fall[]}
 */
function settle(s, keep, hits) {
  const { w, h } = s;
  /** @type {Map<number, Fall>} */
  const moved = new Map();
  const lanes = s.spawned[s.rot];
  /** @param {Piece} p @param {number} from @param {number} to @param {boolean} spawn @param {number} lane */
  const note = (p, from, to, spawn, lane) => {
    if (!keep) return;
    let fall = moved.get(p.id);
    if (!fall)
      moved.set(
        p.id,
        (fall = { id: p.id, path: [from], spawn, kind: p.k, lane }),
      );
    fall.path.push(to);
  };
  let again = true;
  while (again) {
    again = false;
    // Straight down, a column at a time, from the bottom.
    for (let x = 0; x < w; x++) {
      for (let y = h - 1; y >= 0; y--) {
        const i = y * w + x;
        if (!s.open[i] || s.piece[i]) continue;
        let from = -2;
        for (let yy = y - 1; yy >= 0; yy--) {
          const j = yy * w + x;
          if (!s.open[j]) continue;
          const p = s.piece[j];
          if (!p) continue;
          from = falls(p) ? j : -3;
          break;
        }
        if (from === -3) continue;
        if (from >= 0) {
          const p = /** @type {Piece} */ (s.piece[from]);
          s.piece[i] = p;
          s.piece[from] = null;
          note(p, from, i, false, x);
          again = true;
        } else {
          const k = hash(s.seed, s.rot * 64 + x, lanes[x]++, 3) % s.kinds;
          const p = {
            id: s.nextId++,
            t: /** @type {PieceType} */ ("fuzz"),
            k,
            sp: null,
            cage: false,
            burr: false,
            hp: 0,
          };
          s.piece[i] = p;
          note(p, -1, i, true, x);
          again = true;
        }
      }
    }
    if (again) continue;
    // Then a roll: an empty square with something fixed over it takes the
    // fuzzball diagonally above, if that one has come to rest.
    roll: for (let y = h - 1; y >= 1; y--) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!s.open[i] || s.piece[i]) continue;
        const sides = (x + y + s.turn) % 2 === 0 ? [-1, 1] : [1, -1];
        for (const dx of sides) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = (y - 1) * w + xx;
          const p = s.piece[j];
          if (!s.open[j] || !p || !falls(p)) continue;
          s.piece[i] = p;
          s.piece[j] = null;
          note(p, j, i, false, x);
          again = true;
          break roll;
        }
      }
    }
    if (again) continue;
    // A sleepyhead that has reached a bed leaves the board.
    for (let i = 0; i < s.piece.length; i++) {
      const p = s.piece[i];
      if (p && p.t === "sleepy" && s.bed[i]) {
        s.piece[i] = null;
        s.goals.forEach((g, gi) => {
          if (g.type === "sleepy") s.left[gi]--;
        });
        s.score += 200;
        if (keep) hits.push({ i, id: p.id, what: "bed", rank: 0, src: -2 });
        again = true;
      }
    }
  }
  return [...moved.values()];
}

/**
 * Plays waves until the board is still.
 * @param {State} s
 * @param {Bunch[]} bunches The first wave's bunches.
 * @param {{ what: string, i: number, id: number, kind: number }[]} first
 * @param {{ burrGone: boolean }} flags
 * @param {boolean} keep
 * @param {number} [from] The first wave's number.
 * @returns {Step[]}
 */
function cascade(s, bunches, first, flags, keep, from = 1) {
  /** @type {Step[]} */
  const steps = [];
  let n = from;
  let found = bunches;
  let start = first;
  while (found.length > 0 || start.length > 0) {
    const step = wave(s, n, found, start, flags, keep);
    if (step) steps.push(step);
    n++;
    found = findBunches(s);
    start = [];
    if (n > 60) break;
  }
  return steps;
}

/**
 * Returns whether every goal is met.
 * @param {State} s
 * @returns {boolean}
 */
export function goalsMet(s) {
  return s.left.every((n) => n <= 0);
}

/**
 * Plays a move on a game, changing it, and returns what happened.
 * @param {State} s
 * @param {number} a The square picked up.
 * @param {number} b The neighbor it is swapped with.
 * @param {boolean} [keep] Whether to write the move down for a view.
 * @returns {Record | null} Null where nothing was kept; the game is changed either way.
 */
export function play(s, a, b, keep = false) {
  /** @type {Record} */
  const record = {
    swap: { a, b, ok: false },
    steps: [],
    burr: null,
    gust: null,
    shuffle: null,
    won: false,
    lost: false,
  };
  const alone = a === b;
  const apart =
    Math.abs((a % s.w) - (b % s.w)) +
    Math.abs(Math.floor(a / s.w) - Math.floor(b / s.w));
  if (
    s.won ||
    s.lost ||
    apart > 1 ||
    !canSwap(s, a) ||
    !canSwap(s, b) ||
    (!alone && !swapWorks(s, a, b))
  ) {
    return keep ? record : null;
  }
  const pa = /** @type {Piece} */ (s.piece[a]);
  const pb = /** @type {Piece} */ (s.piece[b]);
  const flags = { burrGone: false };
  /** @type {{ what: string, i: number, id: number, kind: number }[]} */
  const first = [];
  /** @type {Bunch[]} */
  let bunches = [];
  const specialA = pa.sp || (pa.t === "frizz" ? "frizz" : null);
  const specialB = pb.sp || (pb.t === "frizz" ? "frizz" : null);
  if (alone && !specialA) return keep ? record : null;
  record.swap.ok = true;

  if (alone) {
    // A special picked up and put down again goes off where it stands.
    s.piece[a] = null;
    if (pa.t === "fuzz") {
      s.goals.forEach((g, gi) => {
        if (g.type === "gather" && g.kind === pa.k) s.left[gi]--;
      });
    }
    first.push({
      what: /** @type {string} */ (specialA),
      i: a,
      id: pa.id,
      kind: pa.t === "frizz" ? commonKind(s) : pa.k,
    });
  } else if (specialA && specialB) {
    // Two specials swapped go off together, where the first was carried to.
    s.piece[a] = null;
    s.piece[b] = null;
    for (const p of [pa, pb]) {
      if (p.t === "fuzz") {
        s.goals.forEach((g, gi) => {
          if (g.type === "gather" && g.kind === p.k) s.left[gi]--;
        });
      }
    }
    const kinds = [specialA, specialB].map((sp) =>
      sp.startsWith("dash") ? "dash" : sp,
    );
    const has = (/** @type {string} */ k) => kinds.includes(k);
    const kind = pa.t === "fuzz" ? pa.k : pb.k;
    let what = "cross";
    if (has("frizz")) {
      const other = kinds[0] === "frizz" ? kinds[1] : kinds[0];
      what = `frizz-${other}`;
    } else if (has("wisp")) {
      const other = kinds[0] === "wisp" ? kinds[1] : kinds[0];
      const carried =
        other === "dash"
          ? specialA.startsWith("dash")
            ? specialA
            : specialB
          : other;
      what = other === "wisp" ? "wisp3" : `wisp-${carried}`;
    } else if (has("puff") && has("dash")) what = "bigcross";
    else if (has("puff")) what = "bigpuff";
    const frizzKind = pa.t === "frizz" ? pb.k : pa.k;
    first.push({
      what,
      i: b,
      id: pa.id,
      kind: has("frizz") ? frizzKind : kind,
    });
    if (keep) record.swap = { a, b, ok: true };
  } else if (specialA === "frizz" || specialB === "frizz") {
    // A frizzball takes the kind of the fuzzball it is swapped with.
    const frizzAt = specialA === "frizz" ? b : a;
    const frizz = specialA === "frizz" ? pa : pb;
    const other = specialA === "frizz" ? pb : pa;
    s.piece[a] = pb;
    s.piece[b] = pa;
    s.piece[frizzAt] = null;
    first.push({ what: "frizz", i: frizzAt, id: frizz.id, kind: other.k });
  } else {
    s.piece[a] = pb;
    s.piece[b] = pa;
    bunches = findBunches(s, a, b);
    // A special swapped goes off where it lands, bunch or no bunch.
    for (const [p, at] of /** @type {[Piece, number][]} */ ([
      [pa, b],
      [pb, a],
    ])) {
      if (!p.sp) continue;
      if (bunches.some((bunch) => bunch.cells.includes(at))) continue;
      s.piece[at] = null;
      s.goals.forEach((g, gi) => {
        if (g.type === "gather" && g.kind === p.k) s.left[gi]--;
      });
      first.push({ what: p.sp, i: at, id: p.id, kind: p.k });
    }
  }

  record.steps = cascade(s, bunches, first, flags, keep);
  s.moves--;
  s.turn++;

  if (goalsMet(s)) {
    s.won = true;
    record.won = true;
    return keep ? record : null;
  }

  // Burrs spread after a move that brushed none off.
  if (!flags.burrGone) {
    const spread = spreadBurr(s);
    if (spread) record.burr = spread;
  }

  // The wind turns, and everything falls the new way.
  if (s.gust) {
    s.gust.wait--;
    if (s.gust.wait <= 0) {
      s.gust.wait = s.gust.every;
      turnBoard(s, s.gust.turn);
      /** @type {Hit[]} */
      const hits = [];
      const fallsDown = settle(s, keep, hits);
      const steps = cascade(s, findBunches(s), [], flags, keep, 1);
      record.gust = {
        rot: s.rot,
        steps: [
          {
            n: 0,
            bunches: [],
            blasts: [],
            hits,
            falls: fallsDown,
            left: s.left.slice(),
            score: s.score,
          },
          ...steps,
        ],
      };
      if (goalsMet(s)) {
        s.won = true;
        record.won = true;
        return keep ? record : null;
      }
    }
  }

  if (s.moves <= 0) {
    s.lost = true;
    record.lost = true;
    return keep ? record : null;
  }
  if (legalMoves(s).length === 0) record.shuffle = shuffle(s);
  return keep ? record : null;
}

/**
 * Spreads one burr to a fuzzball beside a burred one, where any can spread.
 * @param {State} s
 * @returns {{ from: number, to: number, id: number } | null}
 */
function spreadBurr(s) {
  const { w, h } = s;
  /** @type {{ from: number, to: number }[]} */
  const ways = [];
  for (let i = 0; i < s.piece.length; i++) {
    if (!s.piece[i]?.burr) continue;
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of DIRS) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
      const j = yy * w + xx;
      const p = s.piece[j];
      if (p && p.t === "fuzz" && !p.burr && !p.cage && !p.sp)
        ways.push({ from: i, to: j });
    }
  }
  if (ways.length === 0) return null;
  const way = ways[hash(s.seed, s.turn, ways.length, 11) % ways.length];
  const p = /** @type {Piece} */ (s.piece[way.to]);
  p.burr = true;
  return { ...way, id: p.id };
}

/**
 * Deals the plain fuzzballs out again among their squares, so that the board
 * has a move and no bunch.
 * @param {State} s
 * @returns {{ perm: { id: number, from: number, to: number }[] }}
 */
function shuffle(s) {
  const cells = [];
  for (let i = 0; i < s.piece.length; i++) {
    const p = s.piece[i];
    if (p && p.t === "fuzz" && !p.cage && !p.burr && !p.sp) cells.push(i);
  }
  const pieces = cells.map((i) => /** @type {Piece} */ (s.piece[i]));
  let best = cells.slice();
  for (let salt = 0; salt < 200; salt++) {
    const order = cells
      .map((i, n) => ({ i, key: hash(s.seed, s.turn, n, 100 + salt) }))
      .sort((p, q) => p.key - q.key)
      .map((o) => o.i);
    order.forEach((i, n) => (s.piece[i] = pieces[n]));
    best = order;
    if (findBunches(s).length === 0 && legalMoves(s).length > 0) break;
  }
  return {
    perm: pieces.map((p, n) => ({ id: p.id, from: cells[n], to: best[n] })),
  };
}

/**
 * Turns the board by quarter turns, so that a wind blowing a new way still
 * drops things down the engine's board.
 * @param {State} s
 * @param {number} quarters Clockwise.
 */
export function turnBoard(s, quarters) {
  const times = ((quarters % 4) + 4) % 4;
  for (let t = 0; t < times; t++) {
    const { w, h } = s;
    const open = new Uint8Array(w * h);
    const dust = new Uint8Array(w * h);
    const bed = new Uint8Array(w * h);
    /** @type {(Piece | null)[]} */
    const piece = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const from = y * w + x;
        const to = x * h + (h - 1 - y);
        open[to] = s.open[from];
        dust[to] = s.dust[from];
        bed[to] = s.bed[from];
        const p = s.piece[from];
        if (p?.sp === "dash-h") p.sp = "dash-v";
        else if (p?.sp === "dash-v") p.sp = "dash-h";
        piece[to] = p;
      }
    }
    s.open = open;
    s.dust = dust;
    s.bed = bed;
    s.piece = piece;
    s.w = h;
    s.h = w;
    s.rot = (s.rot + 1) % 4;
  }
}

/**
 * Returns where a square of the engine's board is on the screen.
 * @param {State} s
 * @param {number} i
 * @returns {{ x: number, y: number }}
 */
export function onScreen(s, i) {
  let x = i % s.w;
  let y = (i - x) / s.w;
  let w = s.w;
  let h = s.h;
  for (let t = 0; t < s.rot; t++) {
    // Undo one clockwise turn: (x, y) came from (y, w - 1 - x) of a board h wide.
    const px = y;
    const py = w - 1 - x;
    x = px;
    y = py;
    const pw = h;
    h = w;
    w = pw;
  }
  return { x, y };
}

/**
 * A level as its file has it.
 * @typedef {object} Level
 * @property {number} id
 * @property {string} name
 * @property {string} set
 * @property {string[]} kinds
 * @property {number} moves
 * @property {({ type: 'gather', kind: string, count: number } | { type: 'dust' | 'brick' | 'cage' | 'sleepy', count?: number })[]} goals
 * @property {string[]} board A row a string, a square a letter.
 * @property {string[]} [dust] The same shape, a digit a square.
 * @property {{ x: number, y: number, kind: string, sp: Special | 'frizz' }[]} [specials]
 * @property {{ dir: 'down' | 'right' | 'up' | 'left', every?: number, turn?: number }} [wind]
 * @property {number[]} [deals]
 */

const LETTERS = {
  b: "blue",
  r: "red",
  a: "amber",
  g: "green",
  v: "violet",
  p: "pink",
};
const WINDS = { down: 0, right: 1, up: 2, left: 3 };

/**
 * Deals a level: lays its board out, fills the squares it leaves open with
 * fuzzballs from the deal's seed, with no bunch standing and a move to make.
 * @param {Level} level
 * @param {number} seed
 * @returns {State}
 */
export function deal(level, seed) {
  const h = level.board.length;
  const w = level.board[0].length;
  const kinds = level.kinds.length;
  for (let salt = 0; salt < 500; salt++) {
    /** @type {State} */
    const s = {
      w,
      h,
      rot: 0,
      open: new Uint8Array(w * h),
      piece: new Array(w * h).fill(null),
      dust: new Uint8Array(w * h),
      bed: new Uint8Array(w * h),
      kinds,
      goals: [],
      left: [],
      moves: level.moves,
      score: 0,
      seed,
      spawned: [0, 1, 2, 3].map((r) => new Array(r % 2 === 0 ? w : h).fill(0)),
      nextId: 1,
      turn: 0,
      gust: null,
      won: false,
      lost: false,
    };
    /** @type {number[]} */
    const free = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c = level.board[y][x];
        if (c === "_") continue;
        s.open[i] = 1;
        s.dust[i] = level.dust ? Number(level.dust[y][x]) || 0 : 0;
        const base = { id: 0, sp: null, cage: false, burr: false, hp: 0 };
        const lower = c.toLowerCase();
        if (c >= "1" && c <= "4") {
          s.piece[i] = {
            ...base,
            id: s.nextId++,
            t: "brick",
            k: -1,
            hp: Number(c),
          };
        } else if (c === "z") {
          s.piece[i] = { ...base, id: s.nextId++, t: "sleepy", k: -1 };
        } else if (lower in LETTERS) {
          const k = level.kinds.indexOf(
            LETTERS[/** @type {keyof typeof LETTERS} */ (lower)],
          );
          s.piece[i] = {
            ...base,
            id: s.nextId++,
            t: "fuzz",
            k,
            cage: c !== lower,
          };
        } else {
          // '.', a fuzzball of any kind; '?', one in a cage; '*', one with a burr.
          s.piece[i] = {
            ...base,
            id: s.nextId++,
            t: "fuzz",
            k: -1,
            cage: c === "?",
            burr: c === "*",
          };
          free.push(i);
        }
      }
    }
    for (const sp of level.specials ?? []) {
      const i = sp.y * w + sp.x;
      const k = level.kinds.indexOf(sp.kind);
      s.piece[i] =
        sp.sp === "frizz"
          ? {
              id: s.nextId++,
              t: "frizz",
              k: -1,
              sp: null,
              cage: false,
              burr: false,
              hp: 0,
            }
          : {
              id: s.nextId++,
              t: "fuzz",
              k,
              sp: sp.sp,
              cage: false,
              burr: false,
              hp: 0,
            };
      const at = free.indexOf(i);
      if (at >= 0) free.splice(at, 1);
    }
    // Where a level has sleepyheads, the lowest square of every column is a
    // bed, so one that rolls aside on its way down is never left stranded.
    if (s.piece.some((p) => p?.t === "sleepy")) {
      for (let x = 0; x < w; x++) {
        for (let y = h - 1; y >= 0; y--) {
          if (s.open[y * w + x]) {
            s.bed[y * w + x] = 1;
            break;
          }
        }
      }
    }
    // Each free square takes the first kind, in the seed's order, that makes
    // no bunch with what is already laid.
    for (const i of free) {
      const p = /** @type {Piece} */ (s.piece[i]);
      const start = hash(seed, salt, i, 1);
      for (let t = 0; t < kinds; t++) {
        p.k = (start + t) % kinds;
        if (!bunchAt(s, i)) break;
      }
    }
    if (findBunches(s).length > 0) continue;
    if (legalMoves(s).length < 2) continue;

    s.goals = level.goals.map((g) => {
      if (g.type === "gather") {
        return {
          type: "gather",
          kind: level.kinds.indexOf(g.kind),
          count: g.count,
        };
      }
      let count = g.count ?? 0;
      if (!g.count) {
        if (g.type === "dust") count = s.dust.reduce((sum, d) => sum + d, 0);
        else if (g.type === "brick")
          count = s.piece.filter((p) => p?.t === "brick").length;
        else if (g.type === "cage")
          count = s.piece.filter((p) => p?.cage).length;
        else count = s.piece.filter((p) => p?.t === "sleepy").length;
      }
      return { type: g.type, count };
    });
    s.left = s.goals.map((g) => g.count);
    if (level.wind) {
      turnBoard(s, WINDS[level.wind.dir]);
      if (level.wind.every) {
        s.gust = {
          every: level.wind.every,
          turn: level.wind.turn ?? 1,
          wait: level.wind.every,
        };
      }
    }
    return s;
  }
  throw new Error(`Level ${level.id} would not deal from seed ${seed}`);
}

/**
 * Turns the moves a won game has left into special fuzzballs and sets them
 * off, one a move, which is the level's last flourish and scores for each.
 * @param {State} s
 * @param {boolean} [keep]
 * @returns {Step[][]} What each spare move did.
 */
export function encore(s, keep = false) {
  /** @type {Step[][]} */
  const out = [];
  const flags = { burrGone: false };
  let spare = Math.min(s.moves, 12);
  while (spare-- > 0) {
    const plain = [];
    for (let i = 0; i < s.piece.length; i++) {
      const p = s.piece[i];
      if (p && p.t === "fuzz" && !p.sp && !p.cage && !p.burr) plain.push(i);
    }
    if (plain.length === 0) break;
    const i = plain[hash(s.seed, s.turn, spare, 21) % plain.length];
    const p = /** @type {Piece} */ (s.piece[i]);
    const what = spare % 3 === 2 ? "puff" : spare % 2 ? "dash-h" : "dash-v";
    s.piece[i] = null;
    s.moves--;
    s.score += 100;
    const steps = cascade(
      s,
      [],
      [{ what, i, id: p.id, kind: p.k }],
      flags,
      keep,
    );
    out.push(steps);
  }
  return out;
}
