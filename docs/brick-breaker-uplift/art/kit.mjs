// The drawing kit for the Brick Breaker uplift plan (../plan.md): every
// brick, the paddle, the capsules, the balls and the backdrops, each as a
// function that returns SVG. `make-art.mjs` lays them out as sheets and
// `../mocks/make-mocks.mjs` draws the levels with them. It illustrates the
// plan and is not the game's code: the game would redraw this art itself, in
// `@fz/phaser/shapes`'s commands.
//
// Brick Breaker's uplift takes the look of its two siblings, Brick Fuzz Pop
// and Rickashay, so this kit borrows its palettes, its fuzzball and its
// drawing commands from ../../archive/brick-fuzz-pop/art/make-art.mjs, the way
// Rickashay's art does: that script draws its sheets as it loads and exports
// nothing, so this one loads its source without the closing call to
// `main()`.
//
// The art is flat, and drawn only with what the game's renderer has:
// rectangles, circles, rings, straight lines, polylines and polygons, in
// solid colors. The fuzzball's fur alone keeps its curves.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;

/** @typedef {[number, number]} Point */

/**
 * @typedef {object} Palette
 * @property {"dark" | "light"} id
 * @property {string} name
 * @property {string} panel
 * @property {string} page
 * @property {string} field
 * @property {string} fieldLine
 * @property {string} text
 * @property {string} muted
 * @property {string} accent
 * @property {string} danger
 * @property {string} warning
 * @property {string} steel
 * @property {Record<string, string>} tints
 */

/** What this kit takes from Brick Fuzz Pop's art. */
const BORROWED = [
  "DARK",
  "LIGHT",
  "FUZZ",
  "STRANDS",
  "TINT_NAMES",
  "mix",
  "contrast",
  "num",
  "attrs",
  "rect",
  "circle",
  "line",
  "polyline",
  "polygon",
  "text",
  "place",
  "polar",
  "arc",
  "turn",
  "scaleMove",
  "ellipse",
  "spark",
  "diamond",
  "outline",
  "boltMark",
  "flameMark",
  "fuzzball",
  "flame",
  "FLAMES",
  "svgFile",
];

/**
 * Loads Brick Fuzz Pop's drawing without writing its files.
 *
 * @returns {Promise<Record<string, any>>}
 */
async function borrow() {
  const path = join(here, "../../archive/brick-fuzz-pop/art/make-art.mjs");
  const source = readFileSync(path, "utf8");
  const call = "\nmain();\n";
  if (!source.endsWith(call)) {
    throw new Error(`${path} no longer ends by calling main()`);
  }
  const missing = BORROWED.filter(
    (name) => !new RegExp(`^(?:function|const) ${name}\\b`, "m").test(source),
  );
  if (missing.length) {
    throw new Error(`${path} no longer has ${missing.join(", ")}`);
  }
  const module = `${source.slice(0, -call.length)}\nexport { ${BORROWED.join(", ")} };\n`;
  return import(
    `data:text/javascript;base64,${Buffer.from(module).toString("base64")}`
  );
}

/** Brick Fuzz Pop's palettes, primitives and fuzzball. */
export const kit = await borrow();

const {
  FUZZ,
  mix,
  num,
  rect,
  circle,
  line,
  polyline,
  polygon,
  polar,
  arc,
  turn,
  scaleMove,
  ellipse,
  spark,
  diamond,
  fuzzball,
  flame,
  FLAMES,
} = kit;

export const WHITE = "#ffffff";
export const BLACK = "#000000";

/** The eight tints' names, in the order a level's rows take them. */
export const TINTS = /** @type {string[]} */ (kit.TINT_NAMES);

// ------------------------------------------------------------------ bricks
// A brick is two units wide and one tall, drawn in a box of 200 by 100. Its
// body lies 4 in from its cell, its corners 16 round: a chunky slab in three
// flat shapes, the family's tile stretched to Brick Breaker's shape.

/** The brick's box. */
export const CELL = { w: 200, h: 100 };

const SLAB = { x: 4, y: 4, w: 192, h: 92, r: 16, strip: 7, lip: 9 };

/** Where the marks on a slab's face center. */
const FACE = { cx: 100, cy: 45.5 };

/**
 * Returns the lighter strip along a slab's top edge, which follows its
 * rounded corners.
 *
 * @returns {Point[]}
 */
function topStrip() {
  const { x, y, w, r, strip } = SLAB;
  const right = x + w;
  return [
    [x, y + r + strip],
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(right - r, y + r, r, 270, 360),
    [right, y + r + strip],
    ...arc(right - r, y + r + strip, r, 360, 270),
    ...arc(x + r, y + r + strip, r, 270, 180),
  ];
}

const TOP_STRIP = topStrip();

/**
 * Draws the chunky slab every solid brick starts from: a darker lip along
 * the bottom, the body, and a lighter strip along the top.
 *
 * @param {string} tint
 * @returns {string}
 */
export function slab(tint) {
  const { x, y, w, h, r, lip } = SLAB;
  return (
    rect(x, y + lip, w, h - lip, { rx: r, fill: mix(tint, BLACK, 0.24) }) +
    rect(x, y, w, h - lip, { rx: r, fill: tint }) +
    polygon(TOP_STRIP, { fill: mix(tint, WHITE, 0.22) })
  );
}

/**
 * Draws the hits a brick has left as a row of pips, in the field's color, so
 * they look cut out of the brick.
 *
 * @param {Palette} pal
 * @param {number} hits
 * @param {number} [cy]
 * @param {number} [r]
 * @returns {string}
 */
function pipRow(pal, hits, cy = FACE.cy + 3, r = 9) {
  const step = 30;
  return Array.from({ length: hits }, (_, i) =>
    circle(FACE.cx + (i - (hits - 1) / 2) * step, cy, r, { fill: pal.field }),
  ).join("");
}

/**
 * The cracks a tough brick gathers, one for each hit it has taken, each a
 * zigzag in from an edge, clear of the pips.
 *
 * @type {Point[][]}
 */
const CRACKS = [
  [
    [30, 3],
    [37, 17],
    [27, 27],
    [36, 41],
  ],
  [
    [172, 88],
    [164, 73],
    [175, 62],
    [166, 50],
  ],
  [
    [150, 3],
    [144, 15],
    [153, 24],
  ],
];

/**
 * Draws a crack in the field's color.
 *
 * @param {Palette} pal
 * @param {Point[]} points
 * @returns {string}
 */
function crack(pal, points) {
  return polyline(points, {
    stroke: pal.field,
    sw: 4,
    join: "miter",
    cap: "butt",
  });
}

/**
 * Draws a brick: it breaks at a hit and carries no mark.
 *
 * @param {Palette} pal
 * @param {string} [tint]
 * @returns {string}
 */
export function plain(pal, tint = "red") {
  return slab(pal.tints[tint]);
}

/**
 * Draws a tough brick: a pip for each hit it has left, and a crack for each
 * it has taken.
 *
 * @param {Palette} pal
 * @param {string} tint
 * @param {number} hits
 * @param {number} [taken]
 * @returns {string}
 */
export function tough(pal, tint, hits, taken = 0) {
  return (
    slab(mix(pal.tints[tint], pal.text, 0.12)) +
    pipRow(pal, hits) +
    CRACKS.slice(0, taken)
      .map((points) => crack(pal, points))
      .join("")
  );
}

/**
 * Draws a steel brick, which never breaks: a bevelled frame, a rivet in
 * each corner and two strokes of sheen.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function steel(pal) {
  const dark = mix(pal.steel, BLACK, 0.34);
  const sheen = { stroke: mix(pal.steel, WHITE, 0.5), sw: 5 };
  /** @type {Point[]} */
  const rivets = [
    [26, 24],
    [174, 24],
    [26, 67],
    [174, 67],
  ];
  return (
    slab(pal.steel) +
    rect(14, 13, 172, 65, { rx: 8, stroke: dark, sw: 3.6 }) +
    rivets.map(([x, y]) => circle(x, y, 4.4, { fill: dark })).join("") +
    line([84, 58], [106, 36], sheen) +
    line([102, 60], [118, 44], sheen)
  );
}

/**
 * Draws a blast brick: a round bomb with a lit fuse on the danger color, and
 * a dot toward each brick around it that it reaches.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function blast(pal) {
  const cx = 96;
  const cy = 50;
  /** @type {Point[]} */
  const neck = [
    [-7, -5],
    [7, -5],
    [7, 5],
    [-7, 5],
  ];
  const dots = [22, 178].flatMap((x) =>
    [22, 46, 70].map((y) => circle(x, y, 4, { fill: pal.field })),
  );
  return (
    slab(pal.danger) +
    dots.join("") +
    circle(cx, cy, 23, { fill: pal.field }) +
    polygon(scaleMove(turn(neck, -45), 1.1, cx + 17.5, cy - 17.5), {
      fill: pal.field,
    }) +
    polyline(
      [
        [cx + 21, cy - 21],
        [cx + 27, cy - 29],
        [cx + 34, cy - 33],
      ],
      { stroke: pal.field, sw: 4 },
    ) +
    polyline(arc(cx, cy, 15, 196, 250, 6), { stroke: pal.danger, sw: 4 }) +
    polygon(spark(cx + 40, cy - 34, 16, 6.6), { fill: pal.field }) +
    polygon(spark(cx + 40, cy - 34, 11, 3.8), { fill: pal.warning })
  );
}

/**
 * Draws a gift brick: a parcel in the accent color, a ribbon down its
 * middle and a bow on top, since it always lets a capsule fall.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function gift(pal) {
  const ribbon = mix(pal.accent, WHITE, pal.id === "dark" ? 0.62 : 0.72);
  /** @type {(side: 1 | -1) => Point[]} */
  const loop = (side) => [
    [100, 22],
    [100 + side * 34, 6],
    [100 + side * 40, 30],
  ];
  return (
    slab(pal.accent) +
    rect(89, 4, 22, 83, { fill: ribbon }) +
    polygon(loop(1), { fill: pal.field }) +
    polygon(loop(-1), { fill: pal.field }) +
    polygon(scaleMove(loop(1), 1, 0, 0), {
      fill: ribbon,
      stroke: pal.field,
      sw: 3,
    }) +
    polygon(loop(-1), { fill: ribbon, stroke: pal.field, sw: 3 }) +
    circle(100, 22, 8, { fill: ribbon, stroke: pal.field, sw: 3 })
  );
}

/**
 * Draws a ghost brick before it is first hit: a dashed outline and two
 * faint eyes.
 *
 * @param {Palette} pal
 * @param {string} tint
 * @returns {string}
 */
export function ghostHidden(pal, tint) {
  const color = mix(pal.tints[tint], pal.field, 0.35);
  const { x, y, w, h, r, lip } = SLAB;
  return (
    `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - lip - 4}" rx="${r - 2}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="16 12" stroke-linecap="round"/>` +
    polygon(ellipse(86, 44, 6, 9, 0), { fill: color }) +
    polygon(ellipse(114, 44, 6, 9, 0), { fill: color })
  );
}

/**
 * Draws a ghost brick once a hit has shown it: a slab whose hem is
 * scalloped, as a sheet's, and two eyes.
 *
 * @param {Palette} pal
 * @param {string} tint
 * @returns {string}
 */
export function ghostShown(pal, tint) {
  const color = mix(pal.tints[tint], WHITE, pal.id === "dark" ? 0.3 : 0.18);
  const { x, y, w, r } = SLAB;
  const right = x + w;
  const hem = 72;
  const scallops = 6;
  const step = w / scallops;
  /** @type {Point[]} */
  const body = [
    [x, hem],
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(right - r, y + r, r, 270, 360),
    [right, hem],
  ];
  const drops = Array.from({ length: scallops }, (_, i) =>
    circle(x + step * (i + 0.5), hem, step / 2 - 0.5, { fill: color }),
  );
  return (
    polygon(body, { fill: color }) +
    drops.join("") +
    polygon(ellipse(84, 42, 8, 12, 0), { fill: pal.field }) +
    polygon(ellipse(116, 42, 8, 12, 0), { fill: pal.field })
  );
}

/**
 * Draws a regrowing brick: an earthy slab under a scalloped cap of moss,
 * with a two-leaved sprout in the cap.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function regrow(pal) {
  const green = pal.tints.green;
  const light = mix(green, WHITE, pal.id === "dark" ? 0.3 : 0.12);
  const shade = mix(green, BLACK, 0.38);
  const { x, y, w, r } = SLAB;
  const capBottom = 30;
  /** @type {Point[]} */
  const cap = [
    [x, capBottom],
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(x + w - r, y + r, r, 270, 360),
    [x + w, capBottom],
  ];
  const bump = 12;
  const bumps = Array.from(
    { length: 9 },
    (_, i) => x + bump + ((w - 2 * bump) * i) / 8,
  );
  return (
    slab(pal.tints.amber) +
    bumps
      .map((bx) => circle(bx, capBottom + 4, bump, { fill: shade }))
      .join("") +
    polygon(cap, { fill: light }) +
    bumps.map((bx) => circle(bx, capBottom, bump, { fill: light })).join("") +
    sproutMark(pal.field, 100, 34, 1)
  );
}

/**
 * Draws a sprout: a stem and two leaves, its foot at a place.
 *
 * @param {string} color
 * @param {number} cx
 * @param {number} foot
 * @param {number} k Its size, 1 for a brick's cap.
 * @returns {string}
 */
export function sproutMark(color, cx, foot, k) {
  return (
    line([cx, foot], [cx, foot - 16 * k], { stroke: color, sw: 4 * k }) +
    polygon(ellipse(cx - 11 * k, foot - 20 * k, 10 * k, 5.2 * k, 32), {
      fill: color,
    }) +
    polygon(ellipse(cx + 11 * k, foot - 20 * k, 10 * k, 5.2 * k, -32), {
      fill: color,
    })
  );
}

/**
 * Draws the place a regrowing brick has left, while it grows back: a
 * sprout, and a ring that fills as its time comes.
 *
 * @param {Palette} pal
 * @param {number} share How much of its time has gone, 0 to 1.
 * @returns {string}
 */
export function regrowing(pal, share) {
  const green = pal.tints.green;
  return (
    circle(100, 50, 30, { stroke: mix(green, pal.field, 0.7), sw: 6 }) +
    polyline(arc(100, 50, 30, -90, -90 + 360 * share, 24), {
      stroke: green,
      sw: 6,
    }) +
    sproutMark(green, 100, 66, 1.1)
  );
}

/**
 * Draws a plated brick: a tough brick with a steel plate under it, two
 * rivets in the plate and a row of teeth below, since a ball from below
 * turns off it without a hit.
 *
 * @param {Palette} pal
 * @param {string} tint
 * @param {number} hits
 * @returns {string}
 */
export function plated(pal, tint, hits) {
  const dark = mix(pal.steel, BLACK, 0.34);
  const top = 66;
  const teeth = 9;
  const step = 176 / teeth;
  /** @type {Point[]} */
  const saw = [[12, top + 20]];
  for (let i = 0; i < teeth; i++) {
    saw.push(
      [12 + step * (i + 0.5), top + 31],
      [12 + step * (i + 1), top + 20],
    );
  }
  return (
    slab(mix(pal.tints[tint], pal.text, 0.12)) +
    pipRow(pal, hits, 38, 8.5) +
    polygon(saw, { fill: dark }) +
    rect(2, top, 196, 22, { rx: 6, fill: pal.steel }) +
    rect(2, top, 196, 7, { rx: 3.5, fill: mix(pal.steel, WHITE, 0.4) }) +
    circle(22, top + 13, 4.4, { fill: dark }) +
    circle(178, top + 13, 4.4, { fill: dark })
  );
}

/**
 * Draws a cage: a steel frame and bars with a fuzzball behind them, one bar
 * bent once it has taken its first hit.
 *
 * @param {Palette} pal
 * @param {string} [friend] The friend's tint.
 * @param {boolean} [hit]
 * @returns {string}
 */
export function cage(pal, friend = "pink", hit = false) {
  const k = 2.35;
  const fuzz = `<g transform="translate(${num(100 - FUZZ.body.cx * k)} ${num(47 - FUZZ.body.cy * k)}) scale(${k})">${fuzzball(pal.tints[friend])}</g>`;
  const bent = { stroke: pal.steel, sw: 7, cap: "butt", join: "miter" };
  const bars = [34, 60, 87, 113, 140, 166].map((x) =>
    hit && x === 113
      ? polyline(
          [
            [x, 14],
            [x, 26],
            [x + 12, 38],
          ],
          bent,
        ) +
        polyline(
          [
            [x, 78],
            [x, 68],
            [x - 10, 58],
          ],
          bent,
        )
      : rect(x - 3.5, 14, 7, 64, { fill: pal.steel }),
  );
  return (
    slab(pal.steel) +
    rect(14, 14, 172, 64, { rx: 5, fill: mix(pal.field, pal.steel, 0.18) }) +
    fuzz +
    bars.join("") +
    (hit
      ? crack(pal, [
          [150, 3],
          [144, 9],
          [153, 13],
        ])
      : "")
  );
}

/**
 * Draws a key brick: a slab in the warning color with a key on it.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function key(pal) {
  const ink = pal.field;
  return (
    slab(pal.warning) +
    circle(64, 46, 17, { stroke: ink, sw: 9 }) +
    line([82, 46], [146, 46], { stroke: ink, sw: 9, cap: "butt" }) +
    rect(118, 46, 9, 17, { fill: ink }) +
    rect(137, 46, 9, 22, { fill: ink })
  );
}

/**
 * Draws a gate: a steel slab barred in the warning color, with a keyhole,
 * which stands until the level's last key brick breaks.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function gate(pal) {
  const dark = mix(pal.steel, BLACK, 0.4);
  /** @type {Point[]} */
  const slot = [
    [94, 46],
    [106, 46],
    [111, 68],
    [89, 68],
  ];
  return (
    slab(pal.steel) +
    rect(4, 4, 30, 83, { rx: 12, fill: pal.warning }) +
    rect(166, 4, 30, 83, { rx: 12, fill: pal.warning }) +
    rect(22, 4, 12, 83, { fill: pal.steel }) +
    rect(166, 4, 12, 83, { fill: pal.steel }) +
    circle(100, 40, 13, { fill: dark }) +
    polygon(slot, { fill: dark })
  );
}

/**
 * Draws a portal: a thick ring with spiral arms and a dark middle, and on
 * the ring a dot for one pair or a diamond for the other.
 *
 * @param {Palette} pal
 * @param {1 | 2} pair
 * @returns {string}
 */
export function portal(pal, pair) {
  const tint = pal.tints[pair === 1 ? "violet" : "teal"];
  const bright = mix(tint, pal.text, 0.34);
  const arms = [0, 120, 240].map((from) =>
    polyline(
      Array.from({ length: 15 }, (_, i) =>
        polar(100, 50, 8 + (22 * i) / 14, from + (215 * i) / 14),
      ),
      { stroke: bright, sw: 5 },
    ),
  );
  const [bx, by] = polar(100, 50, 40, -45);
  return (
    circle(100, 50, 37, { fill: pal.page }) +
    arms.join("") +
    circle(100, 50, 40, { stroke: tint, sw: 11 }) +
    circle(bx, by, 14.5, { fill: pal.field }) +
    (pair === 1
      ? circle(bx, by, 9, { fill: bright })
      : polygon(diamond(bx, by, 11), { fill: bright }))
  );
}

/**
 * Draws a bumper, which is round: a disc in the accent color, a ring cut
 * out of it, a cap in its middle and four ticks kicking outward.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function bumper(pal) {
  const ticks = [35, 145, 215, 325].map((degrees) =>
    line(polar(100, 50, 45, degrees), polar(100, 50, 53, degrees), {
      stroke: pal.accent,
      sw: 6,
    }),
  );
  return (
    ticks.join("") +
    circle(100, 53, 40, { fill: mix(pal.accent, BLACK, 0.28) }) +
    circle(100, 48.5, 40, { fill: pal.accent }) +
    circle(100, 48.5, 26, { stroke: pal.field, sw: 8 }) +
    circle(100, 48.5, 11.5, { fill: mix(pal.accent, WHITE, 0.52) })
  );
}

/**
 * Draws a slider: a brick with a chevron toward each end of its row, on a
 * rail, since it slides a cell at a time.
 *
 * @param {Palette} pal
 * @param {string} tint
 * @param {1 | -1} [way] The way it slides next: 1 right, -1 left.
 * @returns {string}
 */
export function slider(pal, tint, way = 1) {
  /** @type {(x: number, lit: boolean) => string} */
  const chevron = (x, lit) =>
    polyline(
      [
        [x - way * 9, 30],
        [x + way * 9, 46],
        [x - way * 9, 62],
      ],
      {
        stroke: lit ? pal.field : mix(pal.field, pal.tints[tint], 0.55),
        sw: 8,
      },
    );
  return (
    rail(pal) +
    slab(pal.tints[tint]) +
    chevron(100 - way * 34, false) +
    chevron(100, false) +
    chevron(100 + way * 34, true)
  );
}

/**
 * Draws the rail a slider runs on, across its cell.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function rail(pal) {
  const color = mix(pal.field, pal.text, 0.22);
  return (
    rect(0, 46, 200, 8, { fill: color }) +
    [25, 75, 125, 175]
      .map((x) => rect(x - 3, 40, 6, 20, { rx: 2, fill: color }))
      .join("")
  );
}

// -------------------------------------------------------- the look it has
// What the game draws today (src/view/art/brick_art.ts), for the sheets that
// set the two looks side by side: a flat rounded rectangle 0.05 of a unit in
// from its cell, and a mark in the field's color.

/**
 * Draws a brick as the game draws it now.
 *
 * @param {Palette} pal
 * @param {"plain" | "tough" | "steel" | "blast" | "gift" | "ghost" | "regrow"} kind
 * @param {string} [tint]
 * @param {number} [hits]
 * @returns {string}
 */
export function flat(pal, kind, tint = "red", hits = 2) {
  const body = (/** @type {string} */ fill) =>
    rect(5, 5, 190, 90, { rx: 12, fill });
  const mark = pal.field;
  const base = pal.tints[tint];
  switch (kind) {
    case "plain":
      return body(base);
    case "tough":
      return (
        body(mix(base, pal.text, 0.25)) +
        Array.from({ length: hits }, (_, i) =>
          circle(100 + (i - (hits - 1) / 2) * 32, 50, 9, { fill: mark }),
        ).join("")
      );
    case "steel":
      return (
        body(mix(pal.field, pal.text, 0.55)) +
        circle(50, 50, 9, { fill: mark }) +
        circle(150, 50, 9, { fill: mark })
      );
    case "blast":
      return (
        body(pal.danger) +
        polygon(
          Array.from({ length: 16 }, (_, i) =>
            polar(100, 50, i % 2 === 0 ? 38 : 16, -90 + 22.5 * i),
          ),
          { fill: mark },
        )
      );
    case "gift":
      return (
        body(pal.accent) +
        rect(46, 23, 108, 54, { rx: 27, fill: mark }) +
        rect(51, 28, 98, 44, { rx: 22, fill: pal.accent })
      );
    case "ghost":
      return `<rect x="7" y="7" width="186" height="86" fill="none" stroke="${base}" stroke-width="4" stroke-dasharray="25 25"/>`;
    case "regrow":
      return (
        body(base) +
        line([100, 86], [100, 39], { stroke: mark, sw: 4 }) +
        polygon(
          [
            [100, 54],
            [71, 36],
            [89, 25],
          ],
          { fill: mark },
        ) +
        polygon(
          [
            [100, 46],
            [129, 25],
            [111, 18],
          ],
          { fill: mark },
        )
      );
    default:
      throw new Error(`No flat ${String(kind)}`);
  }
}

// ------------------------------------------------------------- the fuzzball

/**
 * Draws a ball on the fuzzball's grid of 32 units: the fuzzball in its
 * kind's color, its fur lifted by the streak's step, a fire ball under
 * tongues of flame and a blast ball's fur on end with sparks about it.
 *
 * @param {Palette} pal
 * @param {"normal" | "fire" | "blast"} [kind]
 * @param {0 | 1 | 2 | 3} [step] The streak's step: none, ×2, ×3 or ×4.
 * @param {string} [color] A friend's color, in place of the kind's.
 * @returns {string}
 */
export function ball(pal, kind = "normal", step = 0, color = undefined) {
  if (kind === "fire") {
    return (
      FLAMES.map((/** @type {number[]} */ [degrees, to, width, lean]) =>
        polygon(flame(degrees, to, width, lean), { fill: pal.warning }),
      ).join("") +
      fuzzball(pal.danger, 1) +
      eyes(pal, pal.danger)
    );
  }
  if (kind === "blast") {
    return fuzzball(pal.danger, 1, pal.warning) + eyes(pal, pal.danger);
  }
  const charge = /** @type {const} */ ([0, 0.5, 1, 1])[step];
  const body = color ?? pal.text;
  return (
    fuzzball(body, charge, step === 3 ? pal.warning : undefined) +
    eyes(pal, body)
  );
}

/**
 * Draws a ball's eyes over the fuzzball's own, in the field's color, as the
 * game draws them, so they show on a ball of any color in any palette.
 *
 * @param {Palette} pal
 * @param {string} body The ball's color, which the glints take.
 * @returns {string}
 */
function eyes(pal, body) {
  return (
    FUZZ.eyes
      .map(
        (/** @type {{cx: number, cy: number, rx: number, ry: number}} */ eye) =>
          polygon(ellipse(eye.cx, eye.cy, eye.rx + 0.15, eye.ry + 0.15, 0), {
            fill: pal.field,
          }),
      )
      .join("") +
    FUZZ.glints
      .map((/** @type {{cx: number, cy: number, r: number}} */ g) =>
        circle(g.cx, g.cy, g.r, { fill: body }),
      )
      .join("")
  );
}

/**
 * Draws a dust bunny on the fuzzball's grid: a grey fuzzball with a frown,
 * which drifts down the field and bursts at a touch.
 *
 * @param {Palette} pal
 * @returns {string}
 */
export function dustBunny(pal) {
  const grey = mix(pal.steel, pal.field, 0.25);
  const { body } = FUZZ;
  /** @type {(side: 1 | -1) => string} */
  const ear = (side) =>
    polygon(
      ellipse(body.cx + side * 5.4, body.cy - 12.4, 2.5, 6.2, side * 14),
      {
        fill: grey,
      },
    );
  /** @type {(side: 1 | -1) => string} */
  const brow = (side) =>
    line(
      [body.cx + side * 6.4, body.cy - 5.6],
      [body.cx + side * 1.6, body.cy - 3.2],
      { stroke: FUZZ.ink, sw: 1.3 },
    );
  return ear(1) + ear(-1) + fuzzball(grey, 0.5) + brow(1) + brow(-1);
}

/**
 * Places a drawing made on the fuzzball's grid so its body's middle lies at
 * a point, its body `r` in radius.
 *
 * @param {string} art
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {string}
 */
export function placeBall(art, cx, cy, r) {
  const k = r / FUZZ.body.r;
  return `<g transform="translate(${num(cx - FUZZ.body.cx * k)} ${num(cy - FUZZ.body.cy * k)}) scale(${num(k, 4)})">${art}</g>`;
}

/**
 * Places a brick drawn in its box at a place and a width.
 *
 * @param {string} art
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {string}
 */
export function placeBrick(art, x, y, width) {
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(width / CELL.w, 4)})">${art}</g>`;
}
