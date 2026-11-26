/**
 * Keeps the looks that were weighed for a brick beside the one chosen, so that
 * `make-art.mjs` can draw them side by side and the choice can be judged by
 * eye. Only the first of them, `brick` in `fuzz.mjs`, is the design's.
 */

/** @import { Shape } from './fuzz.mjs' */

import { brick, f, pad, rng, rrect } from "./fuzz.mjs";

/**
 * Returns a ring of stitches just inside a pad's edge.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} inset
 * @param {number} [dash]
 * @returns {string}
 */
function stitches(x, y, w, h, inset, dash = 7) {
  const parts = [];
  const corner = inset + 9;
  const across = Math.floor((w - corner * 2 + dash) / (dash * 2));
  const startX = x + (w - (across * 2 - 1) * dash) / 2;
  for (let i = 0; i < across; i++) {
    const sx = startX + i * dash * 2;
    parts.push(`M${f(sx)} ${f(y + inset)}L${f(sx + dash)} ${f(y + inset)}`);
    parts.push(
      `M${f(sx)} ${f(y + h - inset)}L${f(sx + dash)} ${f(y + h - inset)}`,
    );
  }
  const down = Math.floor((h - corner * 2 + dash) / (dash * 2));
  const startY = y + (h - (down * 2 - 1) * dash) / 2;
  for (let i = 0; i < down; i++) {
    const sy = startY + i * dash * 2;
    parts.push(`M${f(x + inset)} ${f(sy)}L${f(x + inset)} ${f(sy + dash)}`);
    parts.push(
      `M${f(x + w - inset)} ${f(sy)}L${f(x + w - inset)} ${f(sy + dash)}`,
    );
  }
  return parts.join("");
}

/**
 * Returns a row of loose threads standing off a line.
 * @param {number} x0
 * @param {number} x1
 * @param {number} y
 * @param {number} count
 * @param {number} tall
 * @param {number} seed
 * @param {number} [way] -1 for threads that stand up, 1 for ones that hang.
 * @returns {string}
 */
function threads(x0, x1, y, count, tall, seed, way = 1) {
  const rand = rng(seed);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + ((i + 0.2 + rand() * 0.6) / count) * (x1 - x0);
    const lean = (rand() - 0.5) * 6;
    const len = tall * (0.8 + rand() * 0.4);
    parts.push(
      `M${f(x)} ${f(y)}Q${f(x + lean * 0.3)} ${f(y + way * len * 0.6)} ${f(x + lean)} ${f(y + way * len)}`,
    );
  }
  return parts.join("");
}

/**
 * Returns a stack of felt sheets seen from above and in front: a sheet a hit,
 * the sheets showing as bands down its front.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function stack(hits) {
  const n = Math.max(1, Math.min(4, hits));
  const band = 8;
  const w = 88;
  const tall = 88 - band * n;
  const top = -44;
  /** @type {Shape[]} */
  const shapes = [];
  for (let level = 1; level <= n; level++) {
    const y = top + band * (n - level);
    shapes.push({
      k: "fill",
      d: pad(-w / 2, y + band, w, tall, 17),
      c: `felt${level}Side`,
    });
    shapes.push({
      k: "fill",
      d: pad(-w / 2, y + (level === n ? 0 : 2.6), w, tall, 17),
      c: `felt${level}`,
    });
  }
  shapes.push({
    k: "stroke",
    d: stitches(-w / 2, top, w, tall, 8.5),
    c: `felt${n}Side`,
    w: 2.8,
  });
  return shapes;
}

/**
 * Returns a pile of felt pads seen from above, each smaller than the one
 * under it, a pad a hit.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function tiers(hits) {
  const n = Math.max(1, Math.min(4, hits));
  /** @type {Shape[]} */
  const shapes = [];
  for (let level = 1; level <= n; level++) {
    const size = 88 - (level - 1) * 19;
    const y = -size / 2 - (level - 1) * 3 - 3 + (n - 1) * 1.5;
    const r = Math.max(9, 17 - (level - 1) * 3);
    shapes.push({
      k: "fill",
      d: pad(-size / 2, y + 6, size, size, r, 1.6),
      c: `felt${level}Side`,
    });
    shapes.push({
      k: "fill",
      d: pad(-size / 2, y, size, size, r, 1.6),
      c: `felt${level}`,
    });
    if (level === n && size > 40) {
      shapes.push({
        k: "stroke",
        d: stitches(-size / 2, y, size, size, 8),
        c: `felt${level}Side`,
        w: 2.8,
      });
    }
  }
  return shapes;
}

/**
 * Returns a shaggy block: a felt top over rows of fringe, a row a hit.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function shaggy(hits) {
  const n = Math.max(1, Math.min(4, hits));
  const band = 9;
  const w = 86;
  const tall = 52;
  const top = 42 - (4 - n) * 2.5 - tall - band * n;
  /** @type {Shape[]} */
  const shapes = [];
  for (let level = 1; level <= n; level++) {
    const y = top + tall - 8 + band * (n - level);
    shapes.push({
      k: "fill",
      d: rrect(-w / 2 + 1, y - 10, w - 2, 14, 7),
      c: `felt${level}Side`,
    });
    shapes.push({
      k: "stroke",
      d: threads(-41, 41, y, 11, band + 4, 30 + level),
      c: level === n ? `felt${level}` : `felt${level}Side`,
      w: 7.4,
    });
  }
  shapes.push({ k: "fill", d: pad(-w / 2, top, w, tall, 16), c: `felt${n}` });
  shapes.push({
    k: "stroke",
    d: stitches(-w / 2, top, w, tall, 8.5),
    c: `felt${n}Side`,
    w: 2.8,
  });
  return shapes;
}

/**
 * Returns a bale of fluff tied with cords, a cord for every hit but the last:
 * the fewer cords, the looser it sits.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function bale(hits) {
  const n = Math.max(1, Math.min(4, hits));
  const loose = (4 - n) / 3;
  const half = 35 + loose * 5;
  const puff = 5 + loose * 4;
  /** @type {[number, number][]} */
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  /**
   * Returns the bale's cloudy edge, set down a little for its underside.
   * @param {number} drop
   * @returns {string}
   */
  const edge = (drop) => {
    const parts = [`M${f(-half)} ${f(-half + drop)}`];
    for (let side = 0; side < 4; side++) {
      const [ax, ay] = corners[side];
      const [bx, by] = corners[(side + 1) % 4];
      const nx = (by - ay) / (half * 2);
      const ny = -(bx - ax) / (half * 2);
      for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        const end = (i + 1) / 4;
        parts.push(
          `Q${f(ax + (bx - ax) * t + nx * puff * 2)} ${f(ay + (by - ay) * t + ny * puff * 2 + drop)} ${f(ax + (bx - ax) * end)} ${f(ay + (by - ay) * end + drop)}`,
        );
      }
    }
    return `${parts.join("")}Z`;
  };
  /** @type {Shape[]} */
  const shapes = [
    { k: "fill", d: edge(6), c: "felt1Side" },
    { k: "fill", d: edge(0), c: "felt1" },
  ];
  const across = (/** @type {number} */ y) =>
    `M${f(-half - 2)} ${y}L${f(half + 2)} ${y}`;
  const down = `M0 ${f(-half - 2)}L0 ${f(half + 4)}`;
  const cords = [
    [],
    [across(0)],
    [across(0), down],
    [across(-13), across(13), down],
  ][n - 1];
  if (cords.length > 0) {
    shapes.push({ k: "stroke", d: cords.join(""), c: "felt4Side", w: 6.5 });
    shapes.push({
      k: "circle",
      x: 0,
      y: cords.length > 2 ? -13 : 0,
      r: 6.5,
      c: "felt4Side",
    });
  }
  return shapes;
}

/**
 * Returns a ball of wound yarn, bigger the more hits it has left.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function yarn(hits) {
  const n = Math.max(1, Math.min(4, hits));
  const r = 20 + n * 5.5;
  /** @type {string[]} */
  const winds = [];
  const count = 2 + n;
  for (let i = 0; i < count; i++) {
    const y = ((i + 0.5) / count - 0.5) * r * 1.7;
    const half = Math.sqrt(Math.max(0, r * r - y * y)) * 0.96;
    winds.push(`M${f(-half)} ${f(y)}Q0 ${f(y - r * 0.42)} ${f(half)} ${f(y)}`);
  }
  const turns = Math.max(1, n - 1);
  for (let i = 0; i < turns; i++) {
    const x = ((i + 0.5) / turns - 0.5) * r * 1.1;
    const half = Math.sqrt(Math.max(0, r * r - x * x)) * 0.96;
    winds.push(`M${f(x)} ${f(-half)}Q${f(x + r * 0.42)} 0 ${f(x)} ${f(half)}`);
  }
  return [
    { k: "circle", x: 0, y: 4, r: f(r), c: "felt2Side" },
    { k: "circle", x: 0, y: 0, r: f(r), c: "felt2" },
    { k: "stroke", d: winds.join(""), c: "felt2Side", w: 3 },
    {
      k: "stroke",
      d: `M${f(r * 0.6)} ${f(r * 0.76)}Q${f(r * 1.1)} ${f(r * 1.25)} ${f(r * 1.25)} ${f(r * 0.7)}`,
      c: "felt2",
      w: 4,
    },
  ];
}

/**
 * Returns the brick the design began with: a tile with a die's pips.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
function pips(hits) {
  /** @type {Shape[]} */
  const shapes = [
    { k: "fill", d: rrect(-45, -37, 90, 84, 15), c: "felt2Side" },
    { k: "fill", d: rrect(-45, -45, 90, 84, 15), c: "felt2" },
    {
      k: "fill",
      d: `M-45 -26V-30Q-45 -45 -30 -45H30Q45 -45 45 -30V-26Q45 -39 30 -39H-30Q-45 -39 -45 -26Z`,
      c: "felt1",
    },
  ];
  const spots =
    [
      [],
      [],
      [
        [-17, -17],
        [17, 13],
      ],
      [
        [-19, -19],
        [0, -3],
        [19, 13],
      ],
      [
        [-17, -19],
        [17, -19],
        [-17, 13],
        [17, 13],
      ],
    ][hits] ?? [];
  for (const [x, y] of spots) {
    shapes.push({ k: "circle", x, y, r: 7.2, c: "field" });
  }
  return shapes;
}

/**
 * The looks weighed for a brick: the one chosen first, the one it replaced
 * last, each with what a hit does to it.
 * @type {{ id: string, name: string, hit: string, make: (hits: number) => Shape[] }[]}
 */
export const OPTIONS = [
  {
    id: "cushions",
    name: "Pile of cushions (chosen)",
    hit: "the top cushion is knocked off, the rest plump up",
    make: brick,
  },
  {
    id: "stack",
    name: "Stack of felt sheets",
    hit: "the top sheet peels away",
    make: stack,
  },
  {
    id: "tiers",
    name: "Pads, seen from above",
    hit: "the smallest pad lifts off",
    make: tiers,
  },
  {
    id: "shaggy",
    name: "Shaggy block",
    hit: "a row of fringe is shorn",
    make: shaggy,
  },
  {
    id: "bale",
    name: "Tied bale",
    hit: "a cord snaps and the bale loosens",
    make: bale,
  },
  {
    id: "yarn",
    name: "Ball of yarn",
    hit: "a length unwinds and the ball shrinks",
    make: yarn,
  },
  {
    id: "pips",
    name: "Tile with pips (before)",
    hit: "a pip goes",
    make: pips,
  },
];
