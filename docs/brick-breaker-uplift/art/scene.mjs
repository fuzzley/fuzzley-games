// What the Brick Breaker uplift plan (../plan.md) draws around the bricks:
// the paddle, the capsules, the backdrops, the field in play, the game bar
// and the panels a wide window has room for. `make-art.mjs` and
// `../mocks/make-mocks.mjs` lay these out; `kit.mjs` holds the bricks and
// the balls. It illustrates the plan and is not the game's code.
//
// Lengths in a field are the game's own units (src/rules/tuning.ts): the
// field is 26 wide and 30 tall, a brick 2 by 1, the paddle 4 by 0.75 with
// its top 27.5 down, a ball 0.36 in radius and a capsule 1.6 by 0.8.

import {
  BLACK,
  CELL,
  TINTS,
  WHITE,
  ball,
  blast,
  bumper,
  cage,
  dustBunny,
  flat,
  gate,
  ghostHidden,
  ghostShown,
  gift,
  key,
  kit,
  placeBall,
  placeBrick,
  plain,
  plated,
  portal,
  rail,
  regrow,
  regrowing,
  slider,
  steel,
  tough,
} from "./kit.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */
/** @typedef {[number, number]} Point */

const {
  mix,
  num,
  rect,
  circle,
  line,
  polyline,
  polygon,
  text,
  polar,
  arc,
  turn,
  scaleMove,
  ellipse,
  spark,
  fuzzball,
} = kit;

/** The field, in the game's units. */
export const FIELD = {
  width: 26,
  height: 30,
  tallest: 45,
  columns: 13,
  rows: 16,
  bricksTop: 2,
  paddleTop: 27.5,
  paddleHeight: 0.75,
  paddleWidth: 4,
  ball: 0.36,
  capsule: { width: 1.6, height: 0.8 },
  netDepth: 1.25,
};

// ------------------------------------------------------------- the legend

/**
 * @typedef {object} Cell
 * @property {string} kind
 * @property {number} [hits]
 * @property {1 | -1} [way]
 * @property {1 | 2} [pair]
 * @property {boolean} [needed]
 */

/**
 * The characters a level's picture is drawn in: the game's own
 * (src/rules/levels/legend.ts), and one for each kind the plan adds.
 *
 * @type {Record<string, Cell>}
 */
export const LEGEND = {
  o: { kind: "plain", needed: true },
  2: { kind: "tough", hits: 2, needed: true },
  3: { kind: "tough", hits: 3, needed: true },
  4: { kind: "tough", hits: 4, needed: true },
  "#": { kind: "steel" },
  "*": { kind: "blast", needed: true },
  "?": { kind: "gift", needed: true },
  "~": { kind: "ghost", needed: true },
  "+": { kind: "regrow" },
  u: { kind: "plated", hits: 1, needed: true },
  U: { kind: "plated", hits: 2, needed: true },
  c: { kind: "cage", needed: true },
  k: { kind: "key", needed: true },
  "=": { kind: "gate" },
  "@": { kind: "portal", pair: 1 },
  "%": { kind: "portal", pair: 2 },
  O: { kind: "bumper" },
  ">": { kind: "slider", way: 1, needed: true },
  "<": { kind: "slider", way: -1, needed: true },
};

/** The tints the cages' friends take, in turn. */
const FRIEND_TINTS = ["pink", "green", "amber", "violet", "teal", "orange"];

/**
 * Draws a level's brick in its box, as it stands when the level starts.
 *
 * @param {Palette} pal
 * @param {Cell} cell
 * @param {string} tint
 * @param {number} nth How many of its kind came before it in the level.
 * @returns {string}
 */
export function brickArt(pal, cell, tint, nth = 0) {
  switch (cell.kind) {
    case "plain":
      return plain(pal, tint);
    case "tough":
      return tough(pal, tint, cell.hits ?? 2);
    case "steel":
      return steel(pal);
    case "blast":
      return blast(pal);
    case "gift":
      return gift(pal);
    case "ghost":
      return ghostHidden(pal, tint);
    case "ghost-shown":
      return ghostShown(pal, tint);
    case "regrow":
      return regrow(pal);
    case "regrowing":
      return regrowing(pal, 0.6);
    case "plated":
      return plated(pal, tint, cell.hits ?? 1);
    case "cage":
      return cage(
        pal,
        FRIEND_TINTS[nth % FRIEND_TINTS.length],
        (cell.hits ?? 2) < 2,
      );
    case "key":
      return key(pal);
    case "gate":
      return gate(pal);
    case "gate-open":
      return `<g opacity="0.28">${gate(pal)}</g>`;
    case "portal":
      return portal(pal, cell.pair ?? 1);
    case "bumper":
      return bumper(pal);
    case "slider":
      return slider(pal, tint, cell.way ?? 1);
    default:
      throw new Error(`No art for ${cell.kind}`);
  }
}

// -------------------------------------------------------------- the paddle
// The paddle is drawn in a box of 100 to a unit: 400 by 75 at its first
// width, its top edge at 0. What a mode adds stands above that edge.

/**
 * Draws the paddle: a springy bar in the accent color with a pale pad along
 * its top, a cap at each end, and what its mode adds: velcro hooks for
 * Catch, a cannon at each end for Laser.
 *
 * @param {Palette} pal
 * @param {number} [width] In units.
 * @param {"plain" | "catch" | "laser"} [mode]
 * @returns {string}
 */
export function paddle(pal, width = FIELD.paddleWidth, mode = "plain") {
  const w = width * 100;
  const h = 64;
  const r = h / 2;
  const dark = mix(pal.accent, BLACK, 0.32);
  const cap = mix(pal.accent, pal.text, pal.id === "dark" ? 0.6 : 0.45);
  const pad = mix(pal.accent, WHITE, 0.55);
  const inner = r * 0.95;
  /** @type {string[]} */
  const out = [
    rect(0, 11, w, h, { rx: r, fill: dark }),
    circle(r, r, r, { fill: cap }),
    circle(w - r, r, r, { fill: cap }),
    rect(inner, 0, w - 2 * inner, h, { fill: pal.accent }),
    rect(inner + 9, 8, w - 2 * inner - 18, 11, { rx: 5.5, fill: pad }),
    circle(r * 0.55, r, 5.5, { fill: pal.field }),
    circle(w - r * 0.55, r, 5.5, { fill: pal.field }),
  ];
  if (mode === "catch") {
    for (let x = inner + 12; x <= w - inner - 12 + 0.01; x += 19) {
      out.push(
        line([x, 2], [x, -7], { stroke: pal.text, sw: 3.4 }),
        polyline(arc(x + 4.5, -7, 4.5, 180, 360, 6), {
          stroke: pal.text,
          sw: 3.4,
        }),
      );
    }
  }
  if (mode === "laser") {
    for (const x of [40, w - 40]) {
      out.push(
        rect(x - 10, -26, 20, 30, { rx: 4, fill: pal.warning }),
        rect(x - 16, -6, 32, 12, { rx: 4, fill: dark }),
      );
    }
  }
  return out.join("");
}

/**
 * Draws the paddle as the game draws it now: a plain pill.
 *
 * @param {Palette} pal
 * @param {number} [width]
 * @returns {string}
 */
export function flatPaddle(pal, width = FIELD.paddleWidth) {
  return rect(0, 0, width * 100, 75, { rx: 37.5, fill: pal.accent });
}

// ------------------------------------------------------------ the capsules
// A capsule is drawn in a box of 160 by 80. A good one is a pill and a bad
// one is notched at each end, so its tone shows without its color.

/**
 * @typedef {object} CapsuleInfo
 * @property {string} name
 * @property {"good" | "bad"} tone
 * @property {boolean} [added] Whether the plan adds it.
 * @property {string} about
 */

/**
 * The capsules: the game's eleven (src/rules/catalog/capsules.ts), and the
 * one the plan adds. A bad one pays while it lasts, which its gold lip says.
 *
 * @type {Record<string, CapsuleInfo>}
 */
export const CAPSULES = {
  wide: { name: "Wide paddle", tone: "good", about: "half as wide again" },
  multi: { name: "Multiball", tone: "good", about: "each ball in three" },
  slow: { name: "Slow ball", tone: "good", about: "back to first speed" },
  life: { name: "Extra life", tone: "good", about: "one more, up to six" },
  catch: { name: "Catch", tone: "good", about: "the ball sticks" },
  net: { name: "Net", tone: "good", about: "saves one ball" },
  laser: { name: "Laser", tone: "good", about: "bolts from its ends" },
  fire: { name: "Fire ball", tone: "good", about: "burns through" },
  blast: { name: "Blast ball", tone: "good", about: "hits those around" },
  seek: {
    name: "Seeker",
    tone: "good",
    added: true,
    about: "homes on a brick",
  },
  narrow: { name: "Narrow paddle", tone: "bad", about: "narrower, pays ×2" },
  fast: { name: "Fast ball", tone: "bad", about: "faster, pays ×2" },
};

/**
 * Draws a capsule's symbol about a point, in a square `s` across.
 *
 * @param {string} id
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} color
 * @returns {string}
 */
export function symbol(id, cx, cy, s, color) {
  /** @type {(points: Point[]) => Point[]} */
  const at = (points) =>
    points.map(([x, y]) => [cx + (x - 0.5) * s, cy + (y - 0.5) * s]);
  const fill = { fill: color };
  const stroke = { stroke: color, sw: s * 0.14 };
  /** @type {(x: number, y: number, r: number) => string} */
  const dot = (x, y, r) =>
    circle(cx + (x - 0.5) * s, cy + (y - 0.5) * s, r * s, fill);
  switch (id) {
    case "wide":
      return (
        polygon(
          at([
            [0, 0.5],
            [0.32, 0.2],
            [0.32, 0.8],
          ]),
          fill,
        ) +
        polygon(
          at([
            [1, 0.5],
            [0.68, 0.2],
            [0.68, 0.8],
          ]),
          fill,
        ) +
        polygon(
          at([
            [0.3, 0.42],
            [0.7, 0.42],
            [0.7, 0.58],
            [0.3, 0.58],
          ]),
          fill,
        )
      );
    case "narrow":
      return (
        polygon(
          at([
            [0.46, 0.5],
            [0.1, 0.2],
            [0.1, 0.8],
          ]),
          fill,
        ) +
        polygon(
          at([
            [0.54, 0.5],
            [0.9, 0.2],
            [0.9, 0.8],
          ]),
          fill,
        )
      );
    case "multi":
      return (
        dot(0.5, 0.25, 0.17) + dot(0.22, 0.73, 0.17) + dot(0.78, 0.73, 0.17)
      );
    case "slow":
      return polyline(
        at([
          [0.15, 0.3],
          [0.5, 0.68],
          [0.85, 0.3],
        ]),
        stroke,
      );
    case "fast":
      return (
        polyline(
          at([
            [0.15, 0.5],
            [0.5, 0.15],
            [0.85, 0.5],
          ]),
          stroke,
        ) +
        polyline(
          at([
            [0.15, 0.85],
            [0.5, 0.5],
            [0.85, 0.85],
          ]),
          stroke,
        )
      );
    case "life":
      return (
        dot(0.31, 0.36, 0.21) +
        dot(0.69, 0.36, 0.21) +
        polygon(
          at([
            [0.11, 0.44],
            [0.89, 0.44],
            [0.5, 0.9],
          ]),
          fill,
        )
      );
    case "catch":
      return polyline(
        at([
          [0.2, 0.2],
          [0.2, 0.8],
          [0.8, 0.8],
          [0.8, 0.2],
        ]),
        stroke,
      );
    case "net":
      return (
        polyline(
          at([
            [0.05, 0.35],
            [0.275, 0.65],
            [0.5, 0.35],
            [0.725, 0.65],
            [0.95, 0.35],
          ]),
          stroke,
        ) +
        polyline(
          at([
            [0.05, 0.65],
            [0.275, 0.35],
            [0.5, 0.65],
            [0.725, 0.35],
            [0.95, 0.65],
          ]),
          stroke,
        )
      );
    case "laser":
      return (
        polygon(
          at([
            [0.22, 0.15],
            [0.38, 0.15],
            [0.38, 0.85],
            [0.22, 0.85],
          ]),
          fill,
        ) +
        polygon(
          at([
            [0.62, 0.15],
            [0.78, 0.15],
            [0.78, 0.85],
            [0.62, 0.85],
          ]),
          fill,
        )
      );
    case "fire":
      return kit.flameMark(cx, cy, s * 0.5, color, color);
    case "blast":
      return polygon(
        Array.from({ length: 16 }, (_, i) =>
          polar(cx, cy, (i % 2 === 0 ? 0.5 : 0.22) * s, -90 + 22.5 * i),
        ),
        fill,
      );
    case "seek":
      return (
        circle(cx, cy, s * 0.3, stroke) +
        dot(0.5, 0.5, 0.1) +
        [0, 90, 180, 270]
          .map((degrees) =>
            line(
              polar(cx, cy, s * 0.3, degrees),
              polar(cx, cy, s * 0.52, degrees),
              {
                ...stroke,
                cap: "butt",
              },
            ),
          )
          .join("")
      );
    default:
      throw new Error(`No symbol for ${id}`);
  }
}

/**
 * Draws a capsule in its box: a pill for a good one; for a bad one a shape
 * notched at each end over a gold lip, since it pays while it lasts; each
 * outlined in the field's color, with its symbol.
 *
 * @param {Palette} pal
 * @param {string} id
 * @returns {string}
 */
export function capsule(pal, id) {
  const info = CAPSULES[id];
  if (!info) throw new Error(`No capsule ${id}`);
  const good = info.tone === "good";
  const color = good ? pal.accent : pal.danger;
  const dark = mix(color, BLACK, 0.3);
  const light = mix(color, WHITE, 0.5);
  /** @type {(inset: number, drop: number) => Point[]} */
  const notched = (inset, drop) => [
    [24 + inset * 0.4, inset + drop],
    [136 - inset * 0.4, inset + drop],
    [160 - inset * 1.3, 36 + drop],
    [136 - inset * 0.4, 72 - inset + drop],
    [24 + inset * 0.4, 72 - inset + drop],
    [inset * 1.3, 36 + drop],
  ];
  const shape = good
    ? rect(0, 0, 160, 80, { rx: 40, fill: pal.field }) +
      rect(5, 11, 150, 64, { rx: 32, fill: dark }) +
      rect(5, 5, 150, 64, { rx: 32, fill: color }) +
      rect(40, 11, 80, 7, { rx: 3.5, fill: light })
    : polygon(
        [
          [22, 0],
          [138, 0],
          [160, 40],
          [138, 80],
          [22, 80],
          [0, 40],
        ],
        { fill: pal.field },
      ) +
      polygon(notched(5, 8), { fill: pal.warning }) +
      polygon(notched(5, 0), { fill: color });
  return shape + symbol(id, 80, good ? 39 : 36, 40, pal.field);
}

/**
 * Draws a capsule as the game draws it now: a flat pill or notched shape
 * with its symbol, a line of the field's color around it.
 *
 * @param {Palette} pal
 * @param {string} id
 * @returns {string}
 */
export function flatCapsule(pal, id) {
  const good = CAPSULES[id].tone === "good";
  const color = good ? pal.accent : pal.danger;
  const shape = good
    ? rect(0, 0, 160, 80, { rx: 40, fill: pal.field }) +
      rect(6, 6, 148, 68, { rx: 34, fill: color })
    : polygon(
        [
          [0, 0],
          [160, 0],
          [140, 40],
          [160, 80],
          [0, 80],
          [20, 40],
        ],
        { fill: pal.field },
      ) +
      polygon(
        [
          [12, 6],
          [148, 6],
          [131, 40],
          [148, 74],
          [12, 74],
          [29, 40],
        ],
        { fill: color },
      );
  return (
    shape +
    (id === "net"
      ? rect(51, 34, 58, 12, { fill: pal.field })
      : symbol(id, 80, 40, 36, pal.field))
  );
}

// ------------------------------------------------------------ the backdrops
// Each set of levels has a place, and the place a pattern: a few flat
// shapes in a wash of the text over what lies behind them, repeated across
// the field and, in a wide window, across the page beside it.

/**
 * @typedef {object} Place
 * @property {string} id
 * @property {string} name
 * @property {string} set The set of levels it belongs to.
 * @property {string} says
 */

/** @type {Place[]} */
export const PLACES = [
  {
    id: "playroom",
    name: "The playroom",
    set: "Basics",
    says: "blocks, rings and wedges",
  },
  {
    id: "workshop",
    name: "The workshop",
    set: "Steel",
    says: "a drawing board's grid, and cogs",
  },
  {
    id: "funfair",
    name: "The fun fair",
    set: "Tricks",
    says: "stars and bunting",
  },
  {
    id: "garden",
    name: "The garden",
    set: "Friends",
    says: "leaves on their stems",
  },
  {
    id: "arcade",
    name: "The arcade",
    set: "Machines",
    says: "rings and arrows, as a pinball table's",
  },
  {
    id: "attic",
    name: "The attic",
    set: "Attic",
    says: "a moon, and motes of dust",
  },
];

/**
 * Returns a number from 0 to 1 that a pair of whole numbers always gives.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function noise(a, b) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Draws one motif of a place's pattern about a point.
 *
 * @param {string} place
 * @param {number} cx
 * @param {number} cy
 * @param {number} s The motif's size.
 * @param {number} pick 0 to 1, which motif and how it is turned.
 * @param {string} color
 * @returns {string}
 */
function motif(place, cx, cy, s, pick, color) {
  const stroke = { stroke: color, sw: s * 0.13 };
  const degrees = Math.floor(pick * 12) * 30;
  const which = Math.floor(pick * 3);
  /** @type {(points: Point[]) => Point[]} */
  const at = (points) => scaleMove(turn(points, degrees), s, cx, cy);
  switch (place) {
    case "playroom":
      if (which === 0) return circle(cx, cy, s * 0.42, stroke);
      if (which === 1) {
        return polygon(
          at([
            [-0.4, -0.4],
            [0.4, -0.4],
            [0.4, 0.4],
            [-0.4, 0.4],
          ]),
          {
            ...stroke,
            join: "round",
          },
        );
      }
      return polygon(
        at([
          [0, -0.46],
          [0.44, 0.34],
          [-0.44, 0.34],
        ]),
        {
          ...stroke,
          join: "round",
        },
      );
    case "workshop": {
      if (which === 2) {
        return (
          line([cx - s * 0.4, cy], [cx + s * 0.4, cy], stroke) +
          line([cx, cy - s * 0.4], [cx, cy + s * 0.4], stroke)
        );
      }
      const teeth = 8;
      /** @type {Point[]} */
      const cog = [];
      for (let i = 0; i < teeth; i++) {
        const a = (360 / teeth) * i + degrees;
        cog.push(
          polar(cx, cy, s * 0.36, a - 13),
          polar(cx, cy, s * 0.5, a - 8),
          polar(cx, cy, s * 0.5, a + 8),
          polar(cx, cy, s * 0.36, a + 13),
        );
      }
      return (
        polygon(cog, { ...stroke, join: "round" }) +
        circle(cx, cy, s * 0.13, stroke)
      );
    }
    case "funfair":
      if (which === 0) {
        return polygon(
          at([
            [-0.34, -0.3],
            [0.34, -0.3],
            [0, 0.4],
          ]),
          {
            ...stroke,
            join: "round",
          },
        );
      }
      return polygon(spark(cx, cy, s * (which === 1 ? 0.56 : 0.36), s * 0.14), {
        fill: color,
      });
    case "garden":
      return (
        polyline(
          at([
            [0, 0.5],
            [0, -0.1],
          ]),
          stroke,
        ) +
        polygon(
          scaleMove(
            turn(ellipse(-0.26, -0.24, 0.26, 0.13, 32), degrees),
            s,
            cx,
            cy,
          ),
          { fill: color },
        ) +
        polygon(
          scaleMove(
            turn(ellipse(0.26, -0.24, 0.26, 0.13, -32), degrees),
            s,
            cx,
            cy,
          ),
          { fill: color },
        )
      );
    case "arcade":
      if (which === 0) {
        return (
          circle(cx, cy, s * 0.42, stroke) + circle(cx, cy, s * 0.16, stroke)
        );
      }
      return (
        polyline(
          at([
            [-0.3, 0.16],
            [0, -0.14],
            [0.3, 0.16],
          ]),
          stroke,
        ) +
        polyline(
          at([
            [-0.3, 0.46],
            [0, 0.16],
            [0.3, 0.46],
          ]),
          stroke,
        )
      );
    case "attic":
      if (which === 0) {
        return (
          circle(cx, cy, s * 0.5, { fill: color }) +
          circle(cx + s * 0.22, cy - s * 0.12, s * 0.43, {
            fill: "currentColor",
          })
        );
      }
      if (which === 1) {
        return polygon(spark(cx, cy, s * 0.3, s * 0.09), { fill: color });
      }
      return circle(cx, cy, s * 0.11, { fill: color });
    default:
      throw new Error(`No place ${place}`);
  }
}

let clips = 0;

/**
 * Draws a place's pattern over a rectangle, in a wash of the text over
 * what lies behind it.
 *
 * @param {Palette} pal
 * @param {string} place
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} step The distance from one motif to the next.
 * @param {string} behind The color behind the pattern.
 * @param {number} [wash] How much of the text the pattern takes.
 * @returns {string}
 */
export function backdrop(pal, place, x, y, w, h, step, behind, wash = 0.07) {
  const color = mix(behind, pal.text, wash);
  const id = `clip-${++clips}`;
  /** @type {string[]} */
  const out = [];
  if (place === "workshop") {
    const grid = mix(behind, pal.text, wash * 0.55);
    for (let gx = x + step / 2; gx < x + w; gx += step / 2) {
      out.push(
        line([gx, y], [gx, y + h], { stroke: grid, sw: 1, cap: "butt" }),
      );
    }
    for (let gy = y + step / 2; gy < y + h; gy += step / 2) {
      out.push(
        line([x, gy], [x + w, gy], { stroke: grid, sw: 1, cap: "butt" }),
      );
    }
  }
  const columns = Math.ceil(w / step) + 1;
  const rows = Math.ceil(h / step) + 1;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const pick = noise(column + 3, row + 7);
      const size = step * (0.34 + 0.2 * noise(row + 11, column + 5));
      const cx =
        x +
        (column + (row % 2) * 0.5) * step +
        (noise(column, row) - 0.5) * step * 0.3;
      const cy =
        y + (row + 0.3) * step + (noise(row, column) - 0.5) * step * 0.3;
      out.push(motif(place, cx, cy, size, pick, color));
    }
  }
  return (
    `<clipPath id="${id}"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"/></clipPath>` +
    `<g clip-path="url(#${id})" color="${behind}">${out.join("")}</g>`
  );
}

// --------------------------------------------------------------- the field

/**
 * @typedef {object} BallSpec
 * @property {number} x
 * @property {number} y
 * @property {"normal" | "fire" | "blast"} [kind]
 * @property {0 | 1 | 2 | 3} [step] The streak's step its fur shows.
 * @property {string} [tint] A friend's tint.
 * @property {Point[]} [trail] Where it has been, oldest first.
 * @property {number} [squash] How far it is squashed against a face, 0 to 1.
 */

/**
 * @typedef {object} FieldSpec
 * @property {number} u A unit, in pixels.
 * @property {string[]} rows The level's picture, from the top.
 * @property {string[]} [tints] Its tints, if it has its own.
 * @property {Record<string, Cell>} [legend] Characters of its own.
 * @property {number} [height] The field's height, in units.
 * @property {string} [place] Its set's place, for the backdrop.
 * @property {{ x: number, width?: number, mode?: "plain" | "catch" | "laser" }} [paddle]
 * @property {BallSpec[]} [balls]
 * @property {{ x: number, y: number, id: string }[]} [capsules]
 * @property {{ x: number, y: number }[]} [bunnies]
 * @property {{ x: number, y: number }[]} [bolts]
 * @property {boolean} [net]
 * @property {Record<string, Cell | null>} [states] By "row,column": a brick as it stands now, or null for one broken.
 * @property {[number, number][]} [glow] The rows and columns of the last bricks, which glow.
 * @property {{ x: number, y: number, words: string, color?: string, size?: number }[]} [popups]
 * @property {{ x: number, y: number, tint: string }[]} [shards] Where a brick has just burst.
 * @property {{ id: string, share: number }[]} [tags] The effects in play, under the paddle.
 * @property {boolean} [old] Draw it as the game does now.
 * @property {boolean} [bare] Leave out the frame's rim.
 */

/**
 * Returns the tint a brick takes: its picture's, or its row's.
 *
 * @param {FieldSpec} spec
 * @param {number} row
 * @param {number} column
 * @returns {string}
 */
function tintOf(spec, row, column) {
  const own = spec.tints?.[row]?.[column];
  if (own && own !== ".") return TINTS[Number(own) - 1];
  return TINTS[row % TINTS.length];
}

/**
 * Draws a field in play.
 *
 * @param {Palette} pal
 * @param {FieldSpec} spec
 * @returns {{ width: number, height: number, rim: number, svg: string }}
 */
export function fieldScene(pal, spec) {
  const u = spec.u;
  const down = spec.height ?? FIELD.height;
  const width = FIELD.width * u;
  const height = down * u;
  const rim = spec.bare || spec.old ? 0 : Math.max(4, Math.round(u * 0.3));
  const wall = Math.max(2, Math.round(u * 0.09));
  const paddleTop = (down - (FIELD.height - FIELD.paddleTop)) * u;
  const legend = { ...LEGEND, ...(spec.legend ?? {}) };
  /** @type {string[]} */
  const out = [];

  // The rim, the field, its backdrop and the gutter under the paddle.
  if (rim) {
    const rimColor = mix(pal.field, pal.text, 0.2);
    out.push(
      rect(-rim, -rim, width + 2 * rim, height + rim, {
        rx: rim * 1.6,
        fill: mix(rimColor, BLACK, 0.3),
      }),
      rect(-rim, -rim, width + 2 * rim, height + rim - rim * 0.35, {
        rx: rim * 1.6,
        fill: rimColor,
      }),
    );
  }
  out.push(rect(0, 0, width, height, { fill: pal.field }));
  if (!spec.old) {
    if (spec.place) {
      out.push(
        backdrop(
          pal,
          spec.place,
          0,
          0,
          width,
          height,
          u * 4.2,
          pal.field,
          0.045,
        ),
      );
    }
    const gutterTop = paddleTop + (FIELD.paddleHeight + 0.45) * u;
    out.push(
      rect(0, gutterTop, width, height - gutterTop, {
        fill: mix(pal.field, pal.danger, 0.1),
      }),
    );
    for (let x = u; x < width; x += 2 * u) {
      out.push(
        polyline(
          [
            [x - u * 0.28, gutterTop + u * 0.38],
            [x, gutterTop + u * 0.62],
            [x + u * 0.28, gutterTop + u * 0.38],
          ],
          {
            stroke: mix(pal.field, pal.danger, 0.3),
            sw: Math.max(1, u * 0.09),
          },
        ),
      );
    }
  } else {
    out.push(
      polyline(
        [
          [0, height],
          [0, 0],
          [width, 0],
          [width, height],
        ],
        {
          stroke: mix(pal.field, pal.text, 0.2),
          sw: wall,
          cap: "butt",
          join: "miter",
        },
      ),
    );
  }

  // The rails under the sliders' rows, then the bricks.
  /** @type {Record<string, number>} */
  const seen = {};
  /** @type {string[]} */
  const bricks = [];
  spec.rows.forEach((picture, row) => {
    if (!spec.old && /[<>]/.test(picture)) {
      for (let column = 0; column < FIELD.columns; column++) {
        out.push(
          placeBrick(
            rail(pal),
            column * 2 * u,
            (FIELD.bricksTop + row) * u,
            2 * u,
          ),
        );
      }
    }
    [...picture].forEach((character, column) => {
      const state = spec.states?.[`${row},${column}`];
      if (state === null) return;
      const cell = state ?? legend[character];
      if (character === "." && !state) return;
      if (!cell) throw new Error(`No "${character}" in the legend`);
      const tint = tintOf(spec, row, column);
      const x = column * 2 * u;
      const y = (FIELD.bricksTop + row) * u;
      const nth = seen[cell.kind] ?? 0;
      seen[cell.kind] = nth + 1;
      bricks.push(
        placeBrick(
          spec.old
            ? oldBrickArt(pal, cell, tint)
            : brickArt(pal, cell, tint, nth),
          x,
          y,
          2 * u,
        ),
      );
    });
  });
  out.push(...bricks);

  for (const [row, column] of spec.glow ?? []) {
    out.push(
      rect(
        column * 2 * u - 1,
        (FIELD.bricksTop + row) * u - 1,
        2 * u + 2,
        u + 2,
        {
          rx: u * 0.2,
          stroke: pal.text,
          sw: Math.max(2, u * 0.1),
        },
      ),
    );
  }
  for (const shard of spec.shards ?? []) {
    const color = pal.tints[shard.tint];
    for (let i = 0; i < 9; i++) {
      const [sx, sy] = polar(
        shard.x * u,
        shard.y * u,
        u * (0.5 + 0.9 * noise(i, 3)),
        i * 40 + 12,
      );
      out.push(
        polygon(
          scaleMove(
            turn(
              [
                [-0.5, -0.4],
                [0.5, -0.2],
                [0.1, 0.5],
              ],
              i * 67,
            ),
            u * 0.34,
            sx,
            sy,
          ),
          { fill: i % 3 === 0 ? mix(color, WHITE, 0.3) : color },
        ),
      );
    }
  }

  // The net, the paddle and what rides under it.
  if (spec.net) {
    const y = paddleTop + FIELD.netDepth * u;
    const half = u * 0.16;
    /** @type {Point[]} */
    const up = [];
    /** @type {Point[]} */
    const dn = [];
    for (let i = 0; i <= 52; i++) {
      up.push([(i * width) / 52, y + (i % 2 ? -half : half)]);
      dn.push([(i * width) / 52, y + (i % 2 ? half : -half)]);
    }
    const paint = { stroke: pal.accent, sw: Math.max(1.5, u * 0.07) };
    out.push(polyline(up, paint), polyline(dn, paint));
  }
  if (spec.paddle) {
    const w = spec.paddle.width ?? FIELD.paddleWidth;
    const left = (spec.paddle.x - w / 2) * u;
    const art = spec.old
      ? flatPaddle(pal, w)
      : paddle(pal, w, spec.paddle.mode);
    out.push(
      `<g transform="translate(${num(left)} ${num(paddleTop)}) scale(${num(u / 100, 4)})">${art}</g>`,
    );
    const tags = spec.tags ?? [];
    tags.forEach((tag, i) => {
      const cx =
        (spec.paddle?.x ?? 13) * u + (i - (tags.length - 1) / 2) * u * 1.3;
      const cy = paddleTop + u * 1.55;
      const good = CAPSULES[tag.id].tone === "good";
      const color = good ? pal.accent : pal.danger;
      out.push(
        circle(cx, cy, u * 0.46, {
          stroke: mix(pal.field, color, 0.3),
          sw: u * 0.1,
        }),
        polyline(arc(cx, cy, u * 0.46, -90, -90 + 360 * tag.share, 20), {
          stroke: color,
          sw: u * 0.1,
        }),
        symbol(tag.id, cx, cy, u * 0.5, color),
      );
    });
  }
  for (const bolt of spec.bolts ?? []) {
    out.push(
      rect(bolt.x * u - u * 0.08, bolt.y * u, u * 0.16, u * 0.8, {
        rx: u * 0.08,
        fill: pal.warning,
      }),
    );
  }

  // What falls and what flies.
  for (const falling of spec.capsules ?? []) {
    const w = FIELD.capsule.width * u;
    const art = spec.old
      ? flatCapsule(pal, falling.id)
      : capsule(pal, falling.id);
    out.push(
      `<g transform="translate(${num(falling.x * u - w / 2)} ${num(falling.y * u - w / 4)}) scale(${num(w / 160, 4)})">${art}</g>`,
    );
  }
  for (const bunny of spec.bunnies ?? []) {
    out.push(placeBall(dustBunny(pal), bunny.x * u, bunny.y * u, u * 0.62));
  }
  for (const flying of spec.balls ?? []) {
    const r = FIELD.ball * u;
    const color = flying.tint ? pal.tints[flying.tint] : undefined;
    const trail = flying.trail ?? [];
    trail.forEach(([tx, ty], i) => {
      const share = (i + 1) / (trail.length + 1);
      out.push(
        circle(tx * u, ty * u, r * (0.35 + 0.5 * share), {
          fill: mix(
            pal.field,
            flying.kind === "fire" ? pal.warning : (color ?? pal.text),
            0.12 + 0.3 * share,
          ),
        }),
      );
    });
    // The ball's fur reaches its edge, so its body is drawn smaller than it.
    const body = spec.old ? r * 0.74 : r * 0.78;
    const art = ball(
      pal,
      flying.kind ?? "normal",
      spec.old ? 0 : (flying.step ?? 0),
      color,
    );
    const squash = flying.squash ?? 0;
    const placed = placeBall(art, 0, 0, body);
    out.push(
      `<g transform="translate(${num(flying.x * u)} ${num(flying.y * u + r * squash * 0.35)}) scale(${num(1 + squash * 0.28, 3)} ${num(1 - squash * 0.3, 3)})">` +
        circle(0, 0, r * 1.06, { fill: pal.field }) +
        placed +
        "</g>",
    );
  }
  for (const popup of spec.popups ?? []) {
    const size = popup.size ?? u * 0.95;
    out.push(
      `<text x="${num(popup.x * u)}" y="${num(popup.y * u)}" font-family="system-ui, sans-serif" font-size="${num(size)}" font-weight="800" text-anchor="middle" fill="${popup.color ?? pal.warning}" stroke="${pal.field}" stroke-width="${num(size * 0.22)}" paint-order="stroke" stroke-linejoin="round">${popup.words}</text>`,
    );
  }
  return { width, height, rim, svg: out.join("\n") };
}

/**
 * Draws a brick as the game does now, for the kinds it has.
 *
 * @param {Palette} pal
 * @param {Cell} cell
 * @param {string} tint
 * @returns {string}
 */
function oldBrickArt(pal, cell, tint) {
  return flat(pal, /** @type {any} */ (cell.kind), tint, cell.hits ?? 2);
}

// ------------------------------------------------------- the bar and panels

/**
 * Draws a rounded panel in the field's color.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {string}
 */
export function panelBox(pal, x, y, w, h) {
  return rect(x, y, w, h, {
    rx: 14,
    fill: pal.field,
    stroke: pal.fieldLine,
    sw: 1.5,
  });
}

/**
 * Draws a small heading in capitals, as the panels' sections have.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @returns {string}
 */
export function heading(pal, x, y, words) {
  return text(x, y, words.toUpperCase(), {
    size: 11,
    weight: 700,
    fill: pal.muted,
    spacing: 1.1,
  });
}

/**
 * Draws the game bar: the game's name, its speed and its figures.
 *
 * @param {Palette} pal
 * @param {number} width
 * @param {{ level: string, score: string, lives: number, times?: string, compact?: boolean, stars?: number }} figures
 * @returns {{ height: number, svg: string }}
 */
export function gameBar(pal, width, figures) {
  const compact = figures.compact ?? false;
  const height = compact ? 44 : 56;
  const middle = height / 2;
  /** @type {string[]} */
  const out = [panelBox(pal, 0, 0, width, height)];
  let left = 14;
  if (!compact) {
    out.push(kit.place(fuzzball(pal.accent), 14, middle - 15.5, 30, 32));
    left = 54;
  }
  out.push(
    text(left, middle + (compact ? 5.5 : 7), "Brick Breaker", {
      size: compact ? 15 : 20,
      weight: 700,
      fill: pal.text,
    }),
  );
  if (!compact) {
    out.push(
      rect(left + 152, middle - 12, 78, 24, { rx: 12, fill: pal.page }),
      text(left + 191, middle + 4.5, "Normal ▾", {
        size: 12,
        weight: 600,
        fill: pal.muted,
        anchor: "middle",
      }),
    );
  }
  const chipHeight = compact ? 34 : 42;
  const top = middle - chipHeight / 2;
  /** @type {[string, string, number][]} */
  const chips = [
    ["LEVEL", figures.level, compact ? 46 : 84],
    ["SCORE", figures.score, compact ? 62 : 104],
  ];
  if (figures.times) chips.push(["STREAK", figures.times, compact ? 50 : 84]);
  let right = width - (compact ? 5 : 8);
  // The lives, as balls.
  const livesWidth = compact ? 58 : 34 + figures.lives * 22;
  out.push(
    rect(right - livesWidth, top, livesWidth, chipHeight, {
      rx: 9,
      fill: pal.page,
    }),
  );
  if (compact) {
    out.push(
      placeBall(ball(pal), right - livesWidth + 18, middle, 6.5),
      text(right - 14, middle + 5.5, `× ${figures.lives}`, {
        size: 14,
        weight: 700,
        fill: pal.text,
        anchor: "end",
      }),
    );
  } else {
    out.push(
      text(right - livesWidth / 2, top + 15.5, "LIVES", {
        size: 11,
        weight: 600,
        fill: pal.muted,
        anchor: "middle",
        spacing: 0.9,
      }),
    );
    for (let i = 0; i < figures.lives; i++) {
      out.push(
        placeBall(
          ball(pal),
          right - livesWidth / 2 + (i - (figures.lives - 1) / 2) * 22,
          top + 29,
          6.5,
        ),
      );
    }
  }
  right -= livesWidth + (compact ? 5 : 10);
  for (const [name, value, chipWidth] of chips.reverse()) {
    const cx = right - chipWidth / 2;
    out.push(
      rect(right - chipWidth, top, chipWidth, chipHeight, {
        rx: 9,
        fill: pal.page,
      }),
      text(cx, top + (compact ? 12.5 : 15.5), name, {
        size: compact ? 8.5 : 11,
        weight: 600,
        fill: pal.muted,
        anchor: "middle",
        spacing: compact ? 0.5 : 0.9,
      }),
      text(cx, top + (compact ? 28 : 34.5), value, {
        size: compact ? 14.5 : 18,
        weight: 700,
        fill: name === "STREAK" ? pal.warning : pal.text,
        anchor: "middle",
      }),
    );
    right -= chipWidth + (compact ? 5 : 10);
  }
  return { height, svg: out.join("\n") };
}

/**
 * Draws a star, lit or not.
 *
 * @param {Palette} pal
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {boolean} lit
 * @returns {string}
 */
export function star(pal, cx, cy, r, lit) {
  const points = Array.from({ length: 10 }, (_, i) =>
    polar(cx, cy, i % 2 === 0 ? r : r * 0.46, -90 + 36 * i),
  );
  return lit
    ? polygon(points, { fill: pal.warning, stroke: pal.warning, sw: r * 0.16 })
    : polygon(points, {
        fill: "none",
        stroke: mix(pal.field, pal.text, 0.34),
        sw: r * 0.16,
      });
}

/**
 * Draws a small picture of a level's wall: a bar for each brick.
 *
 * @param {Palette} pal
 * @param {string[]} rows
 * @param {string[] | undefined} tints
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @returns {{ height: number, svg: string }}
 */
export function wallThumb(pal, rows, tints, x, y, w) {
  const cw = w / FIELD.columns;
  const ch = cw / 2;
  const height = ch * (FIELD.rows + 3);
  /** @type {string[]} */
  const out = [rect(x, y, w, height, { rx: 6, fill: pal.page })];
  rows.forEach((picture, row) => {
    [...picture].forEach((character, column) => {
      if (character === ".") return;
      const cell = LEGEND[character];
      const own = tints?.[row]?.[column];
      const tint = own && own !== "." ? TINTS[Number(own) - 1] : TINTS[row % 8];
      const color =
        cell.kind === "steel" || cell.kind === "gate" || cell.kind === "cage"
          ? pal.steel
          : cell.kind === "blast"
            ? pal.danger
            : cell.kind === "gift"
              ? pal.accent
              : cell.kind === "key"
                ? pal.warning
                : pal.tints[tint];
      out.push(
        rect(
          x + column * cw + 0.6,
          y + (row + 1.5) * ch + 0.6,
          cw - 1.2,
          ch - 1.2,
          {
            rx: 1.5,
            fill: cell.kind === "ghost" ? mix(pal.page, color, 0.4) : color,
          },
        ),
      );
    });
  });
  return { height, svg: out.join("") };
}
