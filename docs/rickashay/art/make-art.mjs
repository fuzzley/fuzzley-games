// Draws the concept art for the Rickashay design (../design.md): the brick
// catalog sheet, how a flight turns, and the field in play. It illustrates
// the design and is not the game's code: the game would redraw this art
// itself.
//
// Run it with `node docs/rickashay/art/make-art.mjs`. It needs nothing but
// Node, writes every file beside itself, and writes the same bytes each time.
//
// Rickashay is Brick Fuzz Pop's sibling and shares its palettes, its
// fuzzball and its way of drawing, so this script borrows those from
// ../../brick-fuzz-pop/art/make-art.mjs, the way that plan's mocks do: that
// script draws its sheets as it loads and exports nothing, so this one loads
// its source without the closing call to `main()`. The flights it draws are
// not made up: they are the sketch's (../sketch/), played on the draft
// levels.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../sketch/levels.mjs";
import { AIMS, C, cloneState, fly, makeState, shoot } from "../sketch/sim.mjs";
import { everyAim } from "../sketch/solve.mjs";

const here = import.meta.dirname;

/** @typedef {[number, number]} Point */

/** What this script takes from Brick Fuzz Pop's art. */
const BORROWED = [
  "DARK",
  "LIGHT",
  "FUZZ",
  "TINT_NAMES",
  "mix",
  "rect",
  "circle",
  "line",
  "polyline",
  "polygon",
  "text",
  "place",
  "ellipse",
  "fuzzball",
  "hotShot",
  "pips",
  "plate",
  "portal",
  "dashedLine",
  "jumpRows",
  "svgFile",
];

/**
 * Loads Brick Fuzz Pop's drawing without writing its files.
 *
 * @returns {Promise<Record<string, any>>}
 */
async function borrow() {
  const path = join(here, "../../brick-fuzz-pop/art/make-art.mjs");
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

const WHITE = "#ffffff";
const BLACK = "#000000";

// ------------------------------------------------------------------- tiles
// A tile is one square cell, drawn in a box of 100 units. A brick's body is
// a square 4 in from the cell with its corners cut at 45°, which is how a
// flight meets it ("The flight" in the design): the cut is the brick's own,
// not a softened edge.

const TILE = { x: 4, y: 4, size: 92, cut: 11, strip: 5, lip: 7 };

/** Where the marks on a tile's face center. */
const FACE = { cx: 50, cy: 48 };

/**
 * Returns a rectangle with its corners cut at 45°, as a polygon's points.
 *
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} cut How far along each side a cut starts.
 * @returns {Point[]}
 */
function octagon(x0, y0, x1, y1, cut) {
  return [
    [x0 + cut, y0],
    [x1 - cut, y0],
    [x1, y0 + cut],
    [x1, y1 - cut],
    [x1 - cut, y1],
    [x0 + cut, y1],
    [x0, y1 - cut],
    [x0, y0 + cut],
  ];
}

/**
 * Draws the cut tile every solid brick starts from, in three flat shapes: a
 * darker lip along the bottom, the body, and a lighter strip along the top.
 *
 * @param {string} tint
 * @returns {string}
 */
export function cutTile(tint) {
  const { x, y, size, cut, strip, lip } = TILE;
  const right = x + size;
  const bottom = y + size;
  return (
    kit.polygon(octagon(x, y + lip, right, bottom, cut), {
      fill: kit.mix(tint, BLACK, 0.22),
    }) +
    kit.polygon(octagon(x, y, right, bottom - lip, cut), { fill: tint }) +
    kit.polygon(
      [
        [x, y + cut + strip],
        [x, y + cut],
        [x + cut, y],
        [right - cut, y],
        [right, y + cut],
        [right, y + cut + strip],
        [right - cut, y + strip],
        [x + cut, y + strip],
      ],
      { fill: kit.mix(tint, WHITE, 0.22) },
    )
  );
}

/**
 * The cracks a tough brick gathers, one for each hit it has taken.
 *
 * @type {Point[][]}
 */
const CRACKS = [
  [
    [30, 3],
    [36, 13],
    [28, 20],
    [37, 31],
  ],
  [
    [97, 66],
    [85, 62],
    [80, 73],
    [68, 70],
  ],
];

/**
 * Draws a brick: it breaks at one strike, and carries no mark.
 *
 * @param {any} pal
 * @param {string} [tint]
 * @returns {string}
 */
export function brick(pal, tint = "red") {
  return cutTile(pal.tints[tint]);
}

/**
 * Draws a tough brick: a die's pips for the hits it has left, and a crack
 * for each it has taken.
 *
 * @param {any} pal
 * @param {string} tint
 * @param {number} hits
 * @param {number} [taken]
 * @returns {string}
 */
export function tough(pal, tint, hits, taken = 0) {
  return (
    cutTile(pal.tints[tint]) +
    kit.pips(pal, hits) +
    CRACKS.slice(0, taken)
      .map((points) =>
        kit.polyline(points, {
          stroke: pal.field,
          sw: 3.2,
          join: "miter",
          cap: "butt",
        }),
      )
      .join("")
  );
}

/**
 * Draws a steel brick, which never breaks: a bevelled frame, four rivets and
 * two strokes of sheen.
 *
 * @param {any} pal
 * @returns {string}
 */
export function steel(pal) {
  const dark = kit.mix(pal.steel, BLACK, 0.34);
  const sheen = { stroke: kit.mix(pal.steel, WHITE, 0.5), sw: 4.6 };
  /** @type {Point[]} */
  const rivets = [
    [27, 26],
    [73, 26],
    [27, 68],
    [73, 68],
  ];
  return (
    cutTile(pal.steel) +
    kit.polygon(octagon(14.5, 14, 85.5, 79.5, 7), { stroke: dark, sw: 3.4 }) +
    rivets.map(([x, y]) => kit.circle(x, y, 4, { fill: dark })).join("") +
    kit.line([38, 57], [56, 39], sheen) +
    kit.line([50, 61], [63, 48], sheen)
  );
}

/**
 * Draws a ramp: a steel wedge, half a cell, its long face at 45°. It is
 * named for the corner its right angle sits in: `L` bottom left, `J` bottom
 * right, `F` top left, `7` top right. Its two sharp ends are cut square.
 *
 * @param {any} pal
 * @param {"L" | "J" | "F" | "7"} corner
 * @returns {string}
 */
export function ramp(pal, corner) {
  const flipX = corner === "J" || corner === "7";
  const flipY = corner === "F" || corner === "7";
  /** @type {(points: Point[]) => Point[]} */
  const turned = (points) =>
    points.map(([x, y]) => [flipX ? 100 - x : x, flipY ? 100 - y : y]);
  const dark = kit.mix(pal.steel, BLACK, 0.34);
  /** @type {Point[]} */
  const rivets = turned([
    [18, 60],
    [18, 82],
    [40, 82],
  ]);
  return (
    kit.polygon(
      turned([
        [4, 4],
        [14, 4],
        [96, 86],
        [96, 96],
        [15, 96],
        [4, 85],
      ]),
      { fill: pal.steel },
    ) +
    // The long face is what a fuzzball turns off, so it is the bright edge.
    kit.polygon(
      turned([
        [14, 4],
        [96, 86],
        [96, 96],
        [88, 96],
        [8, 16],
        [8, 4],
      ]),
      { fill: kit.mix(pal.steel, WHITE, 0.42) },
    ) +
    rivets.map(([x, y]) => kit.circle(x, y, 4, { fill: dark })).join("")
  );
}

/**
 * Draws a hatch: a thin steel bar along the top of its cell, chevrons
 * under it pointing the way a fuzzball passes, and a pip for each time the
 * hatches will still hold a flight up. Open, its two leaves hang down.
 *
 * @param {any} pal
 * @param {number} [holds] How often the hatches will still hold this flight.
 * @param {boolean} [open]
 * @returns {string}
 */
export function hatch(pal, holds = 3, open = false) {
  const way = { stroke: pal.muted, sw: 6 };
  const chevrons = [0, 24]
    .map((dy) =>
      kit.polyline(
        [
          [33, 60 + dy],
          [50, 44 + dy],
          [67, 60 + dy],
        ],
        way,
      ),
    )
    .join("");
  if (open) {
    const hung = { fill: kit.mix(pal.steel, pal.field, 0.45) };
    return (
      chevrons +
      kit.rect(0, 2, 9, 50, hung) +
      kit.rect(91, 2, 9, 50, hung) +
      kit.circle(4.5, 6.5, 3, { fill: pal.field }) +
      kit.circle(95.5, 6.5, 3, { fill: pal.field })
    );
  }
  const marks = Array.from({ length: holds }, (_, i) =>
    kit.circle(50 + (i - (holds - 1) / 2) * 14, 11, 3.6, { fill: pal.field }),
  );
  return (
    chevrons +
    kit.rect(0, 2, 100, 18, { fill: pal.steel }) +
    kit.rect(0, 2, 100, 4, { fill: kit.mix(pal.steel, WHITE, 0.42) }) +
    kit.rect(49, 6, 2, 14, { fill: kit.mix(pal.steel, BLACK, 0.34) }) +
    marks.join("")
  );
}

/**
 * Returns a coil spring as a polyline's points: a plate, turns, a plate.
 *
 * @param {number} cx
 * @param {number} top
 * @param {number} bottom
 * @param {number} half Half its width.
 * @param {number} turns
 * @returns {Point[][]} The top plate, the coil and the bottom plate.
 */
function coil(cx, top, bottom, half, turns) {
  /** @type {Point[]} */
  const zigzag = [[cx, top]];
  const step = (bottom - top) / (turns + 1);
  for (let i = 0; i < turns; i++) {
    zigzag.push([cx + (i % 2 === 0 ? half : -half), top + step * (i + 1)]);
  }
  zigzag.push([cx, bottom]);
  return [
    [
      [cx - half, top],
      [cx + half, top],
    ],
    zigzag,
    [
      [cx - half, bottom],
      [cx + half, bottom],
    ],
  ];
}

/**
 * Draws a spring brick, which gives the flight that breaks it a floor
 * bounce: a tile with a coil spring cut out of it.
 *
 * @param {any} pal
 * @returns {string}
 */
export function spring(pal) {
  const cut = { stroke: pal.field, sw: 6.4, join: "miter" };
  return (
    cutTile(pal.tints.pink) +
    coil(50, 24, 72, 19, 4)
      .map((points) => kit.polyline(points, cut))
      .join("")
  );
}

/**
 * Draws a floor bounce, as the floor's band and the panels show the ones a
 * flight holds: a small coil on a foot, lit when held.
 *
 * @param {any} pal
 * @param {boolean} lit
 * @returns {string}
 */
export function floorBounce(pal, lit) {
  const paint = {
    stroke: lit ? pal.warning : kit.mix(pal.field, pal.text, 0.28),
    sw: 9,
    join: "miter",
  };
  return coil(50, 20, 80, 26, 3)
    .map((points) => kit.polyline(points, paint))
    .join("");
}

/**
 * Draws a gem: a brick set on its point, so every face of it is a slope.
 *
 * @param {any} pal
 * @param {string} [tint]
 * @returns {string}
 */
export function gem(pal, tint = "teal") {
  const ink = pal.tints[tint];
  const t = 6;
  return (
    kit.polygon(
      [
        [50 - t, 3],
        [50 + t, 3],
        [97, 50 - t],
        [97, 50 + t],
        [50 + t, 97],
        [50 - t, 97],
        [3, 50 + t],
        [3, 50 - t],
      ],
      { fill: ink },
    ) +
    kit.polygon(
      [
        [50 - t, 3],
        [50 + t, 3],
        [97, 50 - t],
        [97, 50],
        [3, 50],
        [3, 50 - t],
      ],
      { fill: kit.mix(ink, WHITE, 0.24) },
    ) +
    kit.polygon(
      [
        [3, 50 + t],
        [50 - t, 97],
        [50 + t, 97],
        [97, 50 + t],
        [97, 50],
        [84, 50],
        [50, 84],
        [16, 50],
        [3, 50],
      ],
      { fill: kit.mix(ink, BLACK, 0.24) },
    ) +
    kit.polygon(
      [
        [50, 24],
        [76, 50],
        [50, 76],
        [24, 50],
      ],
      { fill: ink },
    ) +
    kit.line([34, 44], [46, 32], {
      stroke: kit.mix(ink, WHITE, 0.6),
      sw: 4.6,
    })
  );
}

/**
 * Draws a plated brick: a tough brick with a steel plate over each armored
 * face, its pips moved to the middle of what shows.
 *
 * @param {any} pal
 * @param {number} hits
 * @param {("bottom" | "left" | "top" | "right")[]} [sides]
 * @returns {string}
 */
export function plated(pal, hits, sides = ["bottom"]) {
  /** @type {(side: string) => number} */
  const has = (side) => (sides.includes(/** @type {any} */ (side)) ? 1 : 0);
  const cx = FACE.cx + (has("left") - has("right")) * 10;
  const cy = FACE.cy + (has("top") - has("bottom")) * 6.5 + has("top") * 2.5;
  const narrow = has("left") + has("right") === 2;
  return (
    cutTile(pal.tints.orange) +
    kit.pips(pal, hits, cx, cy, narrow ? 14.5 : 19, narrow ? 6 : 6.6) +
    sides.map((side) => kit.plate(pal, side)).join("")
  );
}

/**
 * Draws a moss brick, which grows a hit back each round: an earthy tile
 * under a scalloped cap of moss, a two-leaved sprout cut out of the cap.
 *
 * @param {any} pal
 * @param {number} hits
 * @returns {string}
 */
export function moss(pal, hits) {
  const green = pal.tints.green;
  const light = kit.mix(green, WHITE, pal.id === "dark" ? 0.3 : 0.12);
  const shade = kit.mix(green, BLACK, 0.38);
  const { x, y, size, cut } = TILE;
  const capBottom = 27;
  /** @type {Point[]} */
  const cap = [
    [x, capBottom],
    [x, y + cut],
    [x + cut, y],
    [x + size - cut, y],
    [x + size, y + cut],
    [x + size, capBottom],
  ];
  const bump = 9.2;
  const bumps = Array.from(
    { length: 6 },
    (_, i) => x + bump + ((size - 2 * bump) * i) / 5,
  );
  return (
    cutTile(pal.tints.amber) +
    bumps
      .map((bx) => kit.circle(bx, capBottom + 3.4, bump, { fill: shade }))
      .join("") +
    kit.polygon(cap, { fill: light }) +
    bumps
      .map((bx) => kit.circle(bx, capBottom, bump, { fill: light }))
      .join("") +
    kit.line([50, 30], [50, 17], { stroke: pal.field, sw: 3.4 }) +
    kit.polygon(kit.ellipse(40.5, 13.2, 8.2, 4.4, 32), { fill: pal.field }) +
    kit.polygon(kit.ellipse(59.5, 13.2, 8.2, 4.4, -32), { fill: pal.field }) +
    kit.pips(pal, hits, 50, 64.5, 15.5, 5.6)
  );
}

/**
 * Draws a lock: a tile with one, two or three bolts across it. A bolt
 * slides back for every four turns its flight has made, the top one first,
 * and the lock takes no hit until all of them have.
 *
 * @param {any} pal
 * @param {1 | 2 | 3} bolts
 * @param {number} [drawn] How many have slid back.
 * @returns {string}
 */
export function lock(pal, bolts, drawn = 0) {
  const tint = pal.tints.violet;
  const slot = kit.mix(tint, BLACK, 0.45);
  const bar = kit.mix(pal.steel, WHITE, 0.35);
  const rows = { 1: [48], 2: [35, 61], 3: [26, 48, 70] }[bolts];
  return (
    cutTile(tint) +
    rows
      .map((y, i) => {
        const back = i < drawn;
        return (
          kit.rect(15, y - 8, 70, 16, { rx: 8, fill: slot }) +
          kit.rect(back ? 61 : 19, y - 5, back ? 20 : 62, 10, {
            rx: 5,
            fill: back ? kit.mix(bar, slot, 0.45) : bar,
          }) +
          (back ? "" : kit.circle(30, y, 2.6, { fill: slot }))
        );
      })
      .join("")
  );
}

/**
 * The kinds, in the order the levels bring them in: an id, a name, what one
 * does in a few words, and its picture.
 *
 * @type {{ id: string, name: string, does: string, draw: (pal: any) => string }[]}
 */
export const KINDS = [
  {
    id: "brick",
    name: "Brick",
    does: "Breaks at a strike",
    draw: (pal) => brick(pal),
  },
  {
    id: "tough",
    name: "Tough brick",
    does: "A strike a pip",
    draw: (pal) => tough(pal, "blue", 3),
  },
  { id: "steel", name: "Steel brick", does: "Never breaks", draw: steel },
  {
    id: "ramp",
    name: "Ramp",
    does: "A quarter turn",
    draw: (pal) => ramp(pal, "L"),
  },
  {
    id: "hatch",
    name: "Hatch",
    does: "Up through, then held",
    draw: (pal) => hatch(pal),
  },
  {
    id: "spring",
    name: "Spring brick",
    does: "A floor bounce",
    draw: spring,
  },
  {
    id: "gem",
    name: "Gem",
    does: "Every face a slope",
    draw: (pal) => gem(pal),
  },
  {
    id: "portal",
    name: "Portal",
    does: "In one, out its twin",
    draw: (pal) => kit.portal(pal, 1),
  },
  {
    id: "plated",
    name: "Plated brick",
    does: "Steel on a face",
    draw: (pal) => plated(pal, 2),
  },
  {
    id: "moss",
    name: "Moss brick",
    does: "Grows a hit back",
    draw: (pal) => moss(pal, 2),
  },
  {
    id: "lock",
    name: "Lock",
    does: "Opens late in a flight",
    draw: (pal) => lock(pal, 2),
  },
];

/**
 * The kind each character of a wall stands for; a digit is a tough brick.
 *
 * @param {string} mark
 * @returns {string}
 */
export function kindOf(mark) {
  if (/[2-6]/.test(mark)) return "tough";
  if ("LJF7".includes(mark)) return "ramp";
  if ("vVU".includes(mark)) return "plated";
  if ("MN".includes(mark)) return "moss";
  if ("xyz".includes(mark)) return "lock";
  if ("@&".includes(mark)) return "portal";
  return { o: "brick", "#": "steel", "=": "hatch", S: "spring", G: "gem" }[
    mark
  ];
}

/**
 * @typedef {object} Standing A brick as the sketch holds it.
 * @property {string} ch Its mark in the wall's picture.
 * @property {number} c Its column.
 * @property {number} w Its row in the wall, from the wall's lowest.
 * @property {number} hp
 * @property {number} full
 * @property {number} lock
 */

/**
 * @typedef {object} Flight What a flight has done so far, for the bricks
 *   that show it.
 * @property {number} [turns] Its turns, which slide the locks' bolts back.
 * @property {number} [propped] How often the hatches have held it up.
 */

/**
 * Returns a brick's picture, and a key no other picture shares.
 *
 * @param {any} pal
 * @param {Standing} b
 * @param {string} tint Its row's tint, which bricks, tough bricks and gems
 *   take.
 * @param {Flight} [flight]
 * @returns {{ key: string, draw: () => string }}
 */
export function pictureOf(pal, b, tint, flight = {}) {
  const taken = b.full - b.hp;
  switch (kindOf(b.ch)) {
    case "brick":
      return { key: `o${tint}`, draw: () => brick(pal, tint) };
    case "tough":
      return {
        key: `t${tint}${b.hp}${taken}`,
        draw: () => tough(pal, tint, b.hp, taken),
      };
    case "steel":
      return { key: "#", draw: () => steel(pal) };
    case "ramp":
      return {
        key: `r${b.ch}`,
        draw: () => ramp(pal, /** @type {any} */ (b.ch)),
      };
    case "hatch": {
      const holds = Math.max(0, 3 - (flight.propped ?? 0));
      return { key: `h${holds}`, draw: () => hatch(pal, holds, holds === 0) };
    }
    case "spring":
      return { key: "S", draw: () => spring(pal) };
    case "gem":
      return { key: `G${tint}`, draw: () => gem(pal, tint) };
    case "portal": {
      const pair = b.ch === "@" ? 1 : 2;
      return { key: `p${pair}`, draw: () => kit.portal(pal, pair) };
    }
    case "plated": {
      /** @type {("bottom" | "left" | "top" | "right")[]} */
      const sides = b.ch === "U" ? ["left", "right", "bottom"] : ["bottom"];
      return {
        key: `v${b.ch}${b.hp}`,
        draw: () => plated(pal, b.hp, sides),
      };
    }
    case "moss":
      return { key: `m${b.hp}`, draw: () => moss(pal, b.hp) };
    case "lock": {
      const bolts = /** @type {1 | 2 | 3} */ (b.lock / 4);
      const drawn = Math.min(bolts, Math.floor((flight.turns ?? 0) / 4));
      return {
        key: `l${bolts}${drawn}`,
        draw: () => lock(pal, bolts, drawn),
      };
    }
  }
  throw new Error(`no brick is drawn for "${b.ch}"`);
}

/**
 * The bricks one file places, each drawn once in its `<defs>` and used as
 * often as it likes, which keeps a sheet a tenth of the size.
 */
export class Symbols {
  /** @type {Map<string, { id: string, drawn: string }>} */
  #drawn = new Map();

  /**
   * Places a picture drawn in a 100-unit square.
   *
   * @param {string} key What tells it apart from every other picture.
   * @param {() => string} draw
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @returns {string}
   */
  use(key, draw, x, y, size) {
    let symbol = this.#drawn.get(key);
    if (symbol === undefined) {
      symbol = { id: `b${this.#drawn.size}`, drawn: draw() };
      this.#drawn.set(key, symbol);
    }
    return `<use href="#${symbol.id}" x="${num(x)}" y="${num(y)}" width="${num(size)}" height="${num(size)}"/>`;
  }

  /**
   * Returns the `<defs>` a file's body needs.
   *
   * @param {string} body
   * @returns {string}
   */
  defsFor(body) {
    const used = new Set(body.match(/(?<=href="#)b\d+/g));
    const symbols = [...this.#drawn.values()]
      .filter(({ id }) => used.has(id))
      .map(
        ({ id, drawn }) =>
          `<symbol id="${id}" viewBox="0 0 100 100" overflow="visible">${drawn}</symbol>`,
      );
    return `<defs>${symbols.join("")}</defs>`;
  }
}

/**
 * Writes a number with at most two decimals.
 *
 * @param {number} n
 * @returns {string}
 */
function num(n) {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
}

/**
 * Wraps a group of drawings, moved to (x, y).
 *
 * @param {number} x
 * @param {number} y
 * @param {string} body
 * @returns {string}
 */
export function at(x, y, body) {
  return `<g transform="translate(${num(x)} ${num(y)})">${body}</g>`;
}

// --------------------------------------------------------------- the field
// A field is drawn from the left end of its lintel's top: the lintel, the
// field itself, then the floor's band.

/**
 * @typedef {object} Look How a field is drawn.
 * @property {number} depth Its rows.
 * @property {number} cell A cell's side, in pixels.
 * @property {number} lintel The lintel's height, in units.
 * @property {number} band The floor band's height, in units.
 */

/**
 * The two screens the design shows a level on, as "The field" in Brick Fuzz
 * Pop's plan works out for a phone of 390 by 844 and a window of 1280 by
 * 800.
 */
export const SCREENS = {
  phone: { name: "A phone held upright", depth: 17, band: 1.1, lintel: 0.9 },
  wide: { name: "A wide window", depth: 11, band: 0.6, lintel: 0.5 },
};

/**
 * Returns a field's sizes in pixels.
 *
 * @param {Look} look
 * @returns {{ width: number, lintel: number, deep: number, band: number, height: number }}
 */
export function sizeOf(look) {
  const lintel = Math.round(look.lintel * look.cell);
  const deep = look.depth * look.cell;
  const band = Math.round(look.band * look.cell);
  return {
    width: C * look.cell,
    lintel,
    deep,
    band,
    height: lintel + deep + band,
  };
}

/**
 * Returns where a place in the field is drawn: `x` across from the left
 * wall and `y` up from the floor, both in units.
 *
 * @param {Look} look
 * @param {number} x
 * @param {number} y
 * @returns {Point}
 */
export function spot(look, x, y) {
  return [x * look.cell, sizeOf(look).lintel + (look.depth - y) * look.cell];
}

/**
 * Draws what lies behind a field's bricks: the lintel, with how many rows
 * wait over it, the field and its dots, and the floor's band.
 *
 * @param {any} pal
 * @param {Look} look
 * @param {number} waiting How many rows of the wall wait over the ceiling.
 * @returns {string}
 */
export function fieldBack(pal, look, waiting) {
  const { cell, depth } = look;
  const k = cell / 40;
  const { width, lintel, deep, band } = sizeOf(look);
  const wash = { fill: kit.mix(pal.field, pal.text, 0.13) };
  /** @type {string[]} */
  const out = [
    kit.rect(0, 0, width, lintel, wash),
    kit.rect(0, lintel, width, deep, { fill: pal.field }),
    kit.rect(0, lintel + deep, width, band, wash),
  ];
  for (let column = 1; column < C; column++) {
    for (let row = 1; row < depth; row++) {
      out.push(
        kit.circle(column * cell, lintel + row * cell, 1.1 * k, {
          fill: pal.fieldLine,
        }),
      );
    }
  }
  const middle = lintel / 2;
  const size = Math.max(10, 11.5 * Math.min(1, k * 1.2));
  const words = waiting === 1 ? "1 row waiting" : `${waiting} rows waiting`;
  const left = width / 2 - (words.length * size * 0.26 + 8);
  out.push(
    ...[-2.5, 2.5].map((dy) =>
      kit.polyline(
        [
          [left, middle + dy + 2],
          [left + 4, middle + dy - 2],
          [left + 8, middle + dy + 2],
        ],
        { stroke: pal.muted, sw: 1.6 },
      ),
    ),
    kit.text(left + 15, middle + size * 0.35, words, {
      size,
      fill: pal.text,
    }),
  );
  return out.join("");
}

/**
 * Draws a field's two lines: the jump line, dashed in the accent, and the
 * danger line along the top of the floor's row.
 *
 * @param {any} pal
 * @param {Look} look
 * @returns {string}
 */
export function fieldLines(pal, look) {
  const { cell, depth } = look;
  const k = cell / 40;
  const { width, lintel, deep } = sizeOf(look);
  return (
    kit.dashedLine(width, lintel + kit.jumpRows(depth) * cell, 14 * k, 8 * k, {
      stroke: pal.accent,
      sw: 2.4 * k,
    }) +
    kit.dashedLine(width, lintel + deep - cell, 8 * k, 6 * k, {
      stroke: pal.danger,
      sw: 2 * k,
    })
  );
}

/**
 * Draws a field's frame.
 *
 * @param {any} pal
 * @param {Look} look
 * @returns {string}
 */
export function fieldFrame(pal, look) {
  const { width, height } = sizeOf(look);
  return kit.rect(0, 0, width, height, { stroke: pal.fieldLine, sw: 2 });
}

/**
 * Returns each row's tint, by its place in the wall from the lowest up: the
 * rows with bricks take the eight in turn, and air takes none.
 *
 * @param {string[]} wall Its rows, top first.
 * @returns {string[]}
 */
export function tintsFromBelow(wall) {
  let next = 0;
  return [...wall]
    .reverse()
    .map((row) =>
      /^\.+$/.test(row) ? "" : kit.TINT_NAMES[next++ % kit.TINT_NAMES.length],
    );
}

/**
 * Draws the bricks of a game that stand in its field.
 *
 * @param {any} pal
 * @param {Symbols} symbols
 * @param {Look} look
 * @param {any} state The sketch's game.
 * @param {string[]} tints Each of the wall's rows' tint, lowest first.
 * @param {Flight} [flight]
 * @returns {string}
 */
export function drawBricks(pal, symbols, look, state, tints, flight) {
  const { lintel } = sizeOf(look);
  /** @type {string[]} */
  const out = [];
  for (const b of state.bricks.values()) {
    const row = state.base + b.w;
    if (row >= look.depth) continue;
    const { key, draw } = pictureOf(pal, b, tints[b.w], flight);
    out.push(
      symbols.use(
        `${pal.id}${key}`,
        draw,
        b.c * look.cell,
        lintel + (look.depth - 1 - row) * look.cell,
        look.cell,
      ),
    );
  }
  return out.join("");
}

/**
 * Returns a flight's path as runs of points on the screen, a new run where
 * a portal moved it.
 *
 * @param {Look} look
 * @param {(Point | null)[]} trace The sketch's, a point a turn.
 * @returns {Point[][]}
 */
export function runsOf(look, trace) {
  /** @type {Point[][]} */
  const runs = [[]];
  for (const point of trace) {
    if (point === null) runs.push([]);
    else runs[runs.length - 1].push(spot(look, point[0], point[1]));
  }
  return runs.filter((run) => run.length > 1);
}

/**
 * Draws a flight's path as a thin line.
 *
 * @param {Look} look
 * @param {(Point | null)[]} trace
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 * @returns {string}
 */
export function drawPath(look, trace, color, width, opacity) {
  const lines = runsOf(look, trace)
    .map((run) => kit.polyline(run, { stroke: color, sw: width }))
    .join("");
  return `<g opacity="${opacity}">${lines}</g>`;
}

/**
 * Draws the aim guide: dots along a flight's first legs, and a ring where
 * it turns.
 *
 * @param {any} pal
 * @param {Look} look
 * @param {(Point | null)[]} trace The flight as far as the guide shows it.
 * @param {number} tail How far past its last turn the dots run on, in units.
 * @returns {string}
 */
export function drawGuide(pal, look, trace, tail) {
  const { cell } = look;
  const pitch = 0.36;
  /** @type {string[]} */
  const out = [];
  const points = /** @type {Point[]} */ (trace.filter((p) => p !== null));
  let carried = pitch;
  points.slice(0, -1).forEach((from, i) => {
    const to = points[i + 1];
    const last = i === points.length - 2;
    const whole = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const length = last ? Math.min(whole, tail) : whole;
    for (let along = carried; along <= length; along += pitch) {
      const [x, y] = spot(
        look,
        from[0] + ((to[0] - from[0]) * along) / whole,
        from[1] + ((to[1] - from[1]) * along) / whole,
      );
      out.push(kit.circle(x, y, 0.06 * cell, { fill: pal.text }));
    }
    carried = pitch - ((length - carried) % pitch);
    if (!last) {
      const [x, y] = spot(look, to[0], to[1]);
      out.push(
        kit.circle(x, y, 0.2 * cell, { stroke: pal.text, sw: 0.05 * cell }),
      );
    }
  });
  return out.join("");
}

/**
 * Draws a fuzzball with its middle at a place in the field.
 *
 * @param {Look} look
 * @param {number} x
 * @param {number} y
 * @param {string} art A fuzzball, on its grid of 32 units.
 * @returns {string}
 */
export function fuzzAt(look, x, y, art) {
  const k = look.cell / 40;
  const [px, py] = spot(look, x, y);
  return kit.place(
    art,
    px - kit.FUZZ.body.cx * k,
    py - kit.FUZZ.body.cy * k,
    32 * k,
    32,
  );
}

/**
 * Draws the floor bounces a flight holds, in the floor's band, at its right
 * end: three small coils, lit from the left.
 *
 * @param {any} pal
 * @param {Look} look
 * @param {number} held
 * @returns {string}
 */
export function bandBounces(pal, look, held) {
  const { width, lintel, deep, band } = sizeOf(look);
  const size = Math.min(band - 6, 0.55 * look.cell);
  const top = lintel + deep + (band - size) / 2;
  return [0, 1, 2]
    .map((i) =>
      kit.place(
        floorBounce(pal, i < held),
        width - (3 - i) * (size + 4) - 4,
        top,
        size,
      ),
    )
    .join("");
}

/**
 * Returns the fuzzball as a flight's rally has it: its fur lifts with each
 * floor bounce the rally has earned, at 10, 25 and 45.
 *
 * @param {any} pal
 * @param {number} rally
 * @returns {string}
 */
export function fuzzballAt(pal, rally) {
  if (rally >= 45) return kit.fuzzball(pal.accent, 1, pal.warning);
  if (rally >= 25) return kit.fuzzball(pal.accent, 1);
  if (rally >= 10) return kit.fuzzball(pal.accent, 0.5);
  return kit.fuzzball(pal.accent);
}

/**
 * Returns the aim from where a game's fuzzball waits that strikes the most
 * bricks, with its flight: the path, a point a turn, and what it did.
 *
 * @param {any} state The sketch's game, which is left as it was.
 * @returns {{ aim: number, degrees: number, trace: (Point | null)[], shot: any }}
 */
export function longestFlight(state) {
  const rallies = everyAim(state);
  const aim = rallies.indexOf(Math.max(...rallies));
  /** @type {(Point | null)[]} */
  const trace = [];
  const shot = fly(cloneState(state), aim, trace);
  return { aim, degrees: AIMS[aim][2], trace, shot };
}

// --------------------------------------------------------- the brick sheet

const SHEET_WIDTH = 1640;
const MARGIN = 48;
const CONTENT = SHEET_WIDTH - 2 * MARGIN;

/**
 * The states the sheet shows, each under its label.
 *
 * @type {[string, (pal: any) => string][]}
 */
const STATES = [
  ["tough, 2 hits", (pal) => tough(pal, "blue", 2)],
  ["tough, 4 hits", (pal) => tough(pal, "blue", 4)],
  ["tough, 5 hits", (pal) => tough(pal, "blue", 5)],
  ["tough, 6 hits", (pal) => tough(pal, "blue", 6)],
  ["4 left, 2 taken", (pal) => tough(pal, "blue", 4, 2)],
  ["ramp, low left", (pal) => ramp(pal, "L")],
  ["ramp, low right", (pal) => ramp(pal, "J")],
  ["ramp, top left", (pal) => ramp(pal, "F")],
  ["ramp, top right", (pal) => ramp(pal, "7")],
  ["hatch, 3 holds", (pal) => hatch(pal, 3)],
  ["hatch, 1 hold", (pal) => hatch(pal, 1)],
  ["hatch, open", (pal) => hatch(pal, 0, true)],
  ["gem, a row's ink", (pal) => gem(pal, "amber")],
  ["gem, another's", (pal) => gem(pal, "pink")],
  ["plate: bottom", (pal) => plated(pal, 3, ["bottom"])],
  ["plate: three faces", (pal) => plated(pal, 2, ["left", "right", "bottom"])],
  ["moss, 3 hits", (pal) => moss(pal, 3)],
  ["moss, 1 hit", (pal) => moss(pal, 1)],
  ["lock, 1 bolt", (pal) => lock(pal, 1)],
  ["lock, 2 bolts", (pal) => lock(pal, 2)],
  ["lock, 3 bolts", (pal) => lock(pal, 3)],
  ["3 bolts, 1 back", (pal) => lock(pal, 3, 1)],
  ["3 bolts, 2 back", (pal) => lock(pal, 3, 2)],
  ["lock, open", (pal) => lock(pal, 3, 3)],
  ["portal, pair 1", (pal) => kit.portal(pal, 1)],
  ["portal, pair 2", (pal) => kit.portal(pal, 2)],
];

/**
 * Draws one palette's panel of the brick sheet: the kinds, their states,
 * the fuzzball and the floor bounces, and every kind small.
 *
 * @param {any} pal
 * @returns {{ height: number, svg: string }}
 */
function bricksPanel(pal) {
  /** @type {string[]} */
  const out = [];
  const label = { size: 13, fill: pal.muted, anchor: "middle" };
  const head = { size: 15, weight: 700, fill: pal.text };
  let y = 44;
  out.push(
    kit.text(28, y, pal.name, { size: 22, weight: 800, fill: pal.text }),
  );

  // The kinds, large, on the field's color.
  y += 26;
  const pitch = (CONTENT - 56) / KINDS.length;
  out.push(kit.rect(16, y, CONTENT - 32, 176, { rx: 14, fill: pal.field }));
  KINDS.forEach((kind, i) => {
    const cx = 28 + pitch * (i + 0.5);
    out.push(
      kit.place(kind.draw(pal), cx - 48, y + 20, 96),
      kit.text(cx, y + 140, kind.name, {
        size: 14.5,
        weight: 700,
        fill: pal.text,
        anchor: "middle",
      }),
      kit.text(cx, y + 159, kind.does, { ...label, size: 12 }),
    );
  });

  // Their states.
  y += 176 + 40;
  out.push(kit.text(28, y, "States", head));
  y += 14;
  const across = 13;
  const statePitch = (CONTENT - 56) / across;
  const stateRows = Math.ceil(STATES.length / across);
  out.push(
    kit.rect(16, y, CONTENT - 32, stateRows * 122 + 10, {
      rx: 14,
      fill: pal.field,
    }),
  );
  STATES.forEach(([name, draw], i) => {
    const cx = 28 + statePitch * ((i % across) + 0.5);
    const top = y + 16 + Math.floor(i / across) * 122;
    out.push(
      kit.place(draw(pal), cx - 36, top, 72),
      kit.text(cx, top + 92, name, { ...label, size: 11.5 }),
    );
  });

  // The fuzzball, the hot shot and the floor bounces.
  y += stateRows * 122 + 10 + 40;
  out.push(kit.text(28, y, "The fuzzball, by its flight's rally", head));
  out.push(kit.text(CONTENT / 2 + 180, y, "Floor bounces held", head));
  y += 14;
  out.push(kit.rect(16, y, CONTENT - 32, 132, { rx: 14, fill: pal.field }));
  /** @type {[string, string][]} */
  const looks = [
    ["waiting, and to 9", fuzzballAt(pal, 0)],
    ["a rally of 10", fuzzballAt(pal, 10)],
    ["a rally of 25", fuzzballAt(pal, 25)],
    ["a rally of 45", fuzzballAt(pal, 45)],
    ["the hot shot", kit.hotShot(pal)],
  ];
  looks.forEach(([name, art], i) => {
    const cx = 110 + i * 150;
    out.push(
      kit.place(art, cx - 36, y + 20, 72, 32),
      kit.text(cx, y + 116, name, label),
    );
  });
  [0, 1, 2, 3].forEach((held) => {
    const left = CONTENT / 2 + 196 + held * 138;
    [0, 1, 2].forEach((i) => {
      out.push(
        kit.place(floorBounce(pal, i < held), left + i * 34, y + 40, 30),
      );
    });
    out.push(
      kit.text(left + 49, y + 116, held === 0 ? "none" : `${held}`, label),
    );
  });

  // Every kind small, as a phone on its side and a small phone show them.
  y += 132 + 40;
  out.push(kit.text(28, y, "At 36 and 28 CSS px a unit", head));
  y += 14;
  out.push(kit.rect(16, y, CONTENT - 32, 92, { rx: 14, fill: pal.field }));
  /** @type {((pal: any) => string)[]} */
  const small = [
    ...KINDS.map((kind) => kind.draw),
    (p) => tough(p, "red", 6),
    (p) => ramp(p, "7"),
    (p) => hatch(p, 0, true),
    (p) => lock(p, 3, 1),
    (p) => plated(p, 3, ["left", "right", "bottom"]),
  ];
  small.forEach((draw, i) => {
    out.push(
      kit.place(draw(pal), 36 + i * 44, y + 12, 36),
      kit.place(draw(pal), 40 + i * 44, y + 54, 28),
    );
  });
  return { height: y + 92 + 24, svg: out.join("\n") };
}

/**
 * Draws the brick sheet: a panel for each palette.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
function bricksSheet() {
  const top = 132;
  /** @type {string[]} */
  const out = [];
  let y = top;
  const panels = [kit.DARK, kit.LIGHT].map((pal) => {
    const panel = bricksPanel(pal);
    const placed = at(
      MARGIN,
      y,
      kit.rect(0, 0, CONTENT, panel.height, { rx: 18, fill: pal.page }) +
        panel.svg,
    );
    y += panel.height + 32;
    return placed;
  });
  const height = y + 16;
  out.push(
    kit.rect(0, 0, SHEET_WIDTH, height, { fill: "#101822" }),
    kit.text(MARGIN, 64, "Rickashay: the bricks", {
      size: 40,
      weight: 800,
      fill: "#e6edf7",
    }),
    kit.text(
      MARGIN,
      98,
      "Eleven kinds. Every brick's corners are cut at 45°, as a flight meets them. Concept art for docs/rickashay/design.md.",
      { size: 18, fill: "#93a4bd" },
    ),
    ...panels,
  );
  return { width: SHEET_WIDTH, height, body: out.join("\n") };
}

// ------------------------------------------------------ how a flight turns

/**
 * Draws an arrow: a line with a head at its far end.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {string} color
 * @param {number} width
 * @returns {string}
 */
function arrow(from, to, color, width) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ux = (to[0] - from[0]) / length;
  const uy = (to[1] - from[1]) / length;
  const head = width * 3.2;
  /** @type {Point} */
  const neck = [to[0] - ux * head, to[1] - uy * head];
  return (
    kit.line(from, neck, { stroke: color, sw: width }) +
    kit.polygon(
      [
        to,
        [neck[0] - uy * head * 0.55, neck[1] + ux * head * 0.55],
        [neck[0] + uy * head * 0.55, neck[1] - ux * head * 0.55],
      ],
      { fill: color },
    )
  );
}

/**
 * Draws a dashed run of straight lines.
 *
 * @param {Point[]} points
 * @param {string} color
 * @param {number} width
 * @returns {string}
 */
function dashed(points, color, width) {
  return `<polyline points="${points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${width * 3} ${width * 2.4}" stroke-linejoin="round"/>`;
}

/**
 * Draws the first panel of the flight sheet: a brick, the line the
 * fuzzball's middle turns on, and a turn off a face and off a corner.
 *
 * @param {any} pal
 * @returns {string}
 */
function cornersPanel(pal) {
  const unit = 150;
  const bx = 150;
  const by = 256;
  const r = unit / 4;
  /** @type {string[]} */
  const out = [
    kit.place(tough(pal, "blue", 3), bx, by, unit),
    // Where the fuzzball's middle turns: flats a quarter of a unit off each
    // face, and a straight cut across each corner.
    dashed(
      [
        [bx, by - r],
        [bx + unit, by - r],
        [bx + unit + r, by],
        [bx + unit + r, by + unit],
        [bx + unit, by + unit + r],
        [bx, by + unit + r],
        [bx - r, by + unit],
        [bx - r, by],
        [bx, by - r],
      ],
      pal.muted,
      2.4,
    ),
  ];
  const steep = [
    Math.cos((64 * Math.PI) / 180),
    Math.sin((64 * Math.PI) / 180),
  ];
  // Off a face: a mirror.
  /** @type {Point} */
  const onFace = [bx + unit * 0.28, by - r];
  /** @type {Point} */
  const faceFrom = [onFace[0] - steep[0] * 124, onFace[1] - steep[1] * 124];
  /** @type {Point} */
  const faceTo = [onFace[0] + steep[0] * 124, onFace[1] - steep[1] * 124];
  const k = r / kit.FUZZ.body.r;
  out.push(
    kit.line(faceFrom, onFace, { stroke: pal.accent, sw: 4 }),
    arrow(onFace, faceTo, pal.accent, 4),
    kit.place(
      kit.fuzzball(pal.accent),
      onFace[0] - kit.FUZZ.body.cx * k,
      onFace[1] - kit.FUZZ.body.cy * k,
      32 * k,
      32,
    ),
  );
  // Off a corner: the two speeds change places, so steep leaves shallow.
  /** @type {Point} */
  const onCorner = [bx + unit + r / 2, by - r / 2];
  /** @type {Point} */
  const cornerFrom = [
    onCorner[0] + steep[0] * 124,
    onCorner[1] - steep[1] * 124,
  ];
  /** @type {Point} */
  const cornerTo = [onCorner[0] + steep[1] * 150, onCorner[1] - steep[0] * 150];
  const note = { size: 14.5, weight: 700 };
  const small = { size: 14.5, fill: pal.muted };
  out.push(
    kit.line(cornerFrom, onCorner, { stroke: pal.warning, sw: 4 }),
    arrow(onCorner, cornerTo, pal.warning, 4),
    kit.circle(onCorner[0], onCorner[1], r, { stroke: pal.warning, sw: 2.4 }),
    kit.text(40, 40, "Cut corners", { size: 22, weight: 800, fill: pal.text }),
    kit.text(
      40,
      64,
      "The dashed line is where a fuzzball's middle turns.",
      small,
    ),
    kit.text(40, 150, "Off a face:", { ...note, fill: pal.accent }),
    kit.text(40, 169, "a mirror", { ...note, fill: pal.accent }),
    kit.text(372, 262, "Off a corner:", { ...note, fill: pal.warning }),
    kit.text(372, 281, "its two speeds", { ...note, fill: pal.warning }),
    kit.text(372, 300, "change places", { ...note, fill: pal.warning }),
    kit.text(
      40,
      470,
      "A quarter of a unit off each face, the fuzzball's",
      small,
    ),
    kit.text(40, 490, "radius, and straight across each corner at 45°.", small),
  );
  return out.join("\n");
}

/**
 * Draws the second panel: the eight directions one aim's flight ever takes.
 *
 * @param {any} pal
 * @returns {string}
 */
function rosePanel(pal) {
  const cx = 250;
  const cy = 270;
  const reach = 150;
  const aim = 62;
  /** @type {string[]} */
  const out = [
    kit.text(40, 40, "Eight directions", {
      size: 22,
      weight: 800,
      fill: pal.text,
    }),
    kit.text(40, 64, "All a flight aimed at 62° ever flies in.", {
      size: 14.5,
      fill: pal.muted,
    }),
    kit.circle(cx, cy, reach + 22, { stroke: pal.fieldLine, sw: 2 }),
  ];
  /** @type {(degrees: number) => Point} */
  const tip = (degrees) => [
    cx + reach * Math.cos((degrees * Math.PI) / 180),
    cy - reach * Math.sin((degrees * Math.PI) / 180),
  ];
  for (const degrees of [aim, 180 - aim, 180 + aim, 360 - aim]) {
    out.push(arrow([cx, cy], tip(degrees), pal.accent, 4));
  }
  for (const degrees of [90 - aim, 90 + aim, 270 - aim, 270 + aim]) {
    out.push(arrow([cx, cy], tip(degrees), pal.warning, 4));
  }
  out.push(
    kit.place(kit.fuzzball(pal.accent), cx - 22, cy - 23.6, 44, 32),
    kit.text(tip(aim)[0] + 12, tip(aim)[1] - 6, "the aim, 62°", {
      size: 14.5,
      weight: 700,
      fill: pal.accent,
    }),
    kit.rect(40, 458, 16, 5, { fill: pal.accent }),
    kit.text(64, 465, "The aim, mirrored: off a face, a wall, the ceiling", {
      size: 14.5,
      fill: pal.text,
    }),
    kit.rect(40, 483, 16, 5, { fill: pal.warning }),
    kit.text(64, 490, "The aim, swapped: off a corner, a ramp, a gem", {
      size: 14.5,
      fill: pal.text,
    }),
  );
  return out.join("\n");
}

/**
 * Returns a fuzzball's middle as it zigzags along a corridor: `across` from
 * one side to the other, `along` from the end it enters by, both in units.
 *
 * @param {number} width The room its middle has from side to side.
 * @param {number} length
 * @param {number} degrees Its heading, measured from across the corridor.
 * @returns {Point[]} A point a turn, the first where it enters.
 */
function zigzag(width, length, degrees) {
  const slope = Math.tan((degrees * Math.PI) / 180);
  /** @type {Point[]} */
  const points = [[0, 0]];
  let across = 0;
  let along = 0;
  let heading = 1;
  for (;;) {
    const reach = heading > 0 ? width - across : across;
    if (along + reach * slope >= length) {
      points.push([across + (heading * (length - along)) / slope, length]);
      return points;
    }
    along += reach * slope;
    across = heading > 0 ? width : 0;
    points.push([across, along]);
    heading = -heading;
  }
}

/**
 * Draws the third panel: a chimney and a gap under a row, each with a
 * shallow flight and a steep one through it, to scale.
 *
 * @param {any} pal
 * @param {Symbols} symbols
 * @returns {string}
 */
function slopesPanel(pal, symbols) {
  const cell = 44;
  const room = 0.5;
  const length = 5;
  const shallow = 24;
  const steep = 66;
  /** @type {(key: string, draw: () => string, x: number, y: number) => string} */
  const tile = (key, draw, x, y) =>
    symbols.use(`${pal.id}${key}`, draw, x, y, cell);
  /** @type {string[]} */
  const out = [
    kit.text(40, 40, "Shallow for columns, steep for rows", {
      size: 22,
      weight: 800,
      fill: pal.text,
    }),
    kit.text(40, 64, "The same two aims, to scale, through a gap five long.", {
      size: 14.5,
      fill: pal.muted,
    }),
  ];
  /** @type {[number, string][]} */
  const flights = [
    [shallow, pal.warning],
    [steep, pal.accent],
  ];

  // A chimney: the fuzzball climbs between two columns.
  const cx = 60;
  const cy = 132;
  out.push(
    kit.text(cx, cy - 16, "Up a chimney", {
      size: 15,
      weight: 700,
      fill: pal.text,
    }),
    kit.rect(cx, cy, 3 * cell, length * cell, { fill: pal.field }),
  );
  for (let row = 0; row < length; row++) {
    const tint = kit.TINT_NAMES[(row + 2) % kit.TINT_NAMES.length];
    for (const column of [0, 2]) {
      out.push(
        tile(
          `t${tint}3`,
          () => tough(pal, tint, 3),
          cx + column * cell,
          cy + row * cell,
        ),
      );
    }
  }
  /** @type {number[]} */
  const chimneyTurns = [];
  for (const [degrees, color] of flights) {
    // In a chimney the fuzzball crosses from wall to wall as it climbs.
    const points = zigzag(room, length, degrees);
    chimneyTurns.push(points.length - 2);
    out.push(
      kit.polyline(
        points.map(([across, along]) => [
          cx + (1.25 + across) * cell,
          cy + (length - along) * cell,
        ]),
        { stroke: color, sw: 2.6 },
      ),
    );
  }

  // A gap under a row: the fuzzball runs along between two rows.
  const gx = 290;
  const gy = 132;
  out.push(
    kit.text(gx, gy - 16, "Along a gap between rows", {
      size: 15,
      weight: 700,
      fill: pal.text,
    }),
    kit.rect(gx, gy, length * cell, 3 * cell, { fill: pal.field }),
  );
  for (let column = 0; column < length; column++) {
    for (const row of [0, 2]) {
      const tint = kit.TINT_NAMES[row === 0 ? 5 : 0];
      out.push(
        tile(
          `t${tint}3`,
          () => tough(pal, tint, 3),
          gx + column * cell,
          gy + row * cell,
        ),
      );
    }
  }
  /** @type {number[]} */
  const gapTurns = [];
  for (const [degrees, color] of flights) {
    // Along a gap its heading is the same aim, measured from the rows.
    const points = zigzag(room, length, 90 - degrees);
    gapTurns.push(points.length - 2);
    out.push(
      kit.polyline(
        points.map(([across, along]) => [
          gx + along * cell,
          gy + (1.75 - across) * cell,
        ]),
        { stroke: color, sw: 2.6 },
      ),
    );
  }

  const words = { size: 14.5, fill: pal.text };
  const list = gy + 3 * cell + 44;
  out.push(
    kit.rect(gx, list - 9, 16, 5, { fill: pal.warning }),
    kit.text(
      gx + 24,
      list - 2,
      `Aimed at ${shallow}°: ${chimneyTurns[0]} strikes up the`,
      words,
    ),
    kit.text(
      gx + 24,
      list + 18,
      `chimney, ${gapTurns[0]} along the gap`,
      words,
    ),
    kit.rect(gx, list + 47, 16, 5, { fill: pal.accent }),
    kit.text(
      gx + 24,
      list + 54,
      `Aimed at ${steep}°: ${chimneyTurns[1]} up the chimney,`,
      words,
    ),
    kit.text(gx + 24, list + 74, `${gapTurns[1]} along the gap`, words),
    ...[
      "A shallow flight crosses fast, so it works the sides of columns.",
      "A steep one climbs fast, so it works rows from under and over.",
      "A 45° face turns one into the other.",
    ].map((line, i) =>
      kit.text(40, 450 + i * 20, line, { size: 14.5, fill: pal.muted }),
    ),
  );
  return out.join("\n");
}

/**
 * Draws the flight sheet: cut corners, the eight directions, and steep
 * against shallow.
 *
 * @param {Symbols} symbols
 * @returns {{ width: number, height: number, body: string }}
 */
function flightSheet(symbols) {
  const pal = kit.DARK;
  const widths = [520, 500, 580];
  const height = 520;
  const top = 116;
  /** @type {string[]} */
  const out = [];
  let x = MARGIN;
  [cornersPanel(pal), rosePanel(pal), slopesPanel(pal, symbols)].forEach(
    (panel, i) => {
      out.push(
        at(
          x,
          top,
          kit.rect(0, 0, widths[i], height, { rx: 18, fill: pal.page }) + panel,
        ),
      );
      x += widths[i] + 24;
    },
  );
  const width = x - 24 + MARGIN;
  return {
    width,
    height: top + height + MARGIN,
    body: [
      kit.rect(0, 0, width, top + height + MARGIN, { fill: "#101822" }),
      kit.text(MARGIN, 64, "Rickashay: how a flight turns", {
        size: 40,
        weight: 800,
        fill: "#e6edf7",
      }),
      kit.text(
        MARGIN,
        96,
        "Every turn is a change of sign or a swap of the fuzzball's two speeds, so its arithmetic is exact and a nudge of the aim moves a bounce a little, not somewhere else.",
        { size: 17, fill: "#93a4bd" },
      ),
      ...out,
    ].join("\n"),
  };
}

// --------------------------------------------------------- the field sheet

/**
 * Draws a panel's card.
 *
 * @param {any} pal
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function card(pal, width, height) {
  return kit.rect(0, 0, width, height, {
    rx: 12,
    fill: pal.page,
    stroke: pal.fieldLine,
    sw: 1.5,
  });
}

/**
 * Draws the game bar: the game's name and its figures.
 *
 * @param {any} pal
 * @param {number} width
 * @param {boolean} phone
 * @param {[string, string][]} figures
 * @returns {{ height: number, svg: string }}
 */
function gameBar(pal, width, phone, figures) {
  const height = phone ? 44 : 56;
  const middle = height / 2;
  const chipWidth = phone ? 58 : 104;
  const chipHeight = phone ? 34 : 42;
  const gap = phone ? 5 : 10;
  const top = middle - chipHeight / 2;
  /** @type {string[]} */
  const out = [card(pal, width, height)];
  let nameLeft = 14;
  if (!phone) {
    out.push(kit.place(kit.fuzzball(pal.accent), 14, middle - 15.5, 30, 32));
    nameLeft = 54;
  }
  out.push(
    kit.text(nameLeft, middle + (phone ? 5.5 : 7), "Rickashay", {
      size: phone ? 16 : 20,
      weight: 700,
      fill: pal.text,
    }),
  );
  const right = width - (phone ? 5 : 8);
  figures.forEach(([name, value], i) => {
    const fromRight = figures.length - i;
    const cx =
      right - fromRight * chipWidth - (fromRight - 1) * gap + chipWidth / 2;
    out.push(
      kit.rect(cx - chipWidth / 2, top, chipWidth, chipHeight, {
        rx: 9,
        fill: pal.field,
      }),
      kit.text(cx, top + (phone ? 12.5 : 15.5), name, {
        size: phone ? 8.5 : 11,
        weight: 600,
        fill: pal.muted,
        anchor: "middle",
        spacing: phone ? 0.5 : 0.9,
      }),
      kit.text(cx, top + (phone ? 28 : 34.5), value, {
        size: phone ? 14.5 : 18,
        weight: 700,
        fill: pal.text,
        anchor: "middle",
      }),
    );
  });
  return { height, svg: out.join("\n") };
}

/**
 * Plays a level's first rounds with a middling aim each, the one a quarter
 * of the aims beat, so a scene shows a wall with shots already in it.
 *
 * @param {number} index The level's, from 0.
 * @param {number} depth
 * @param {number} rounds
 * @returns {any} The sketch's game after them.
 */
function afterRounds(index, depth, rounds) {
  const state = makeState(LEVELS[index], depth);
  for (let round = 0; round < rounds; round++) {
    const rallies = everyAim(state);
    const byRally = rallies.map((_, aim) => aim);
    byRally.sort((a, b) => rallies[a] - rallies[b] || a - b);
    shoot(state, byRally[Math.floor(byRally.length * 0.75)]);
  }
  return state;
}

/**
 * Draws a phone with a level being aimed: the guide runs to the flight's
 * third turn.
 *
 * @param {any} pal
 * @param {Symbols} symbols
 * @returns {{ width: number, height: number, svg: string }}
 */
function phoneScene(pal, symbols) {
  const index = 17;
  const level = LEVELS[index];
  const look = { cell: 40, ...SCREENS.phone };
  const state = afterRounds(index, look.depth, 2);
  const tints = tintsFromBelow(level.bricks);
  const { aim } = longestFlight(state);
  /** @type {(Point | null)[]} */
  const guide = [];
  fly(cloneState(state), aim, guide, 4);
  const size = sizeOf(look);
  const waiting = Math.max(0, level.bricks.length - (look.depth - state.base));
  const bar = gameBar(pal, size.width, true, [
    ["LEVEL", `${index + 1}`],
    ["ROUND", `${state.rounds + 1}`],
    ["BEST RALLY", "24"],
  ]);
  const field = [
    fieldBack(pal, look, waiting),
    drawBricks(pal, symbols, look, state, tints),
    fieldLines(pal, look),
    drawGuide(pal, look, guide, 1.2),
    fuzzAt(
      look,
      state.x,
      0.25,
      state.hot ? kit.hotShot(pal) : kit.fuzzball(pal.accent),
    ),
    bandBounces(pal, look, state.hot ? 1 : 0),
    fieldFrame(pal, look),
  ].join("");
  const bezel = 16;
  const width = size.width + 2 * bezel;
  const height = size.height + bar.height + 8 + 2 * bezel;
  return {
    width,
    height,
    svg:
      kit.rect(0, 0, width, height, {
        rx: 34,
        fill: kit.mix(pal.page, BLACK, 0.35),
        stroke: pal.fieldLine,
        sw: 2,
      }) +
      at(bezel, bezel, field) +
      at(bezel, bezel + size.height + 8, bar.svg),
  };
}

/**
 * Draws a wide window with a flight in the air: the path so far, the rally
 * and what it has earned.
 *
 * @param {any} pal
 * @param {Symbols} symbols
 * @returns {{ width: number, height: number, svg: string }}
 */
function wideScene(pal, symbols) {
  const index = 15;
  const level = LEVELS[index];
  const look = { cell: 56, ...SCREENS.wide };
  const start = afterRounds(index, look.depth, 0);
  const tints = tintsFromBelow(level.bricks);
  const { aim, shot: whole } = longestFlight(start);
  // Stop it at the turn where it has just earned its second floor bounce.
  const target = Math.min(27, whole.rally);
  let state = start;
  /** @type {(Point | null)[]} */
  let trace = [];
  let shot = whole;
  for (let turns = 1; turns < 4000; turns++) {
    state = cloneState(start);
    trace = [];
    shot = fly(state, aim, trace, turns);
    if (shot.rally >= target || !shot.cut) break;
  }
  const held = (start.hot ? 1 : 0) + shot.earned - shot.saves;
  const size = sizeOf(look);
  const waiting = Math.max(0, level.bricks.length - (look.depth - state.base));
  const last = /** @type {Point} */ (trace[trace.length - 1]);
  const field = [
    fieldBack(pal, look, waiting),
    drawBricks(pal, symbols, look, state, tints, {
      turns: shot.bounces,
      propped: shot.propped,
    }),
    fieldLines(pal, look),
    drawPath(look, trace, pal.accent, 2.4, 0.5),
    fuzzAt(look, last[0], last[1], fuzzballAt(pal, shot.rally)),
    bandBounces(pal, look, held),
    fieldFrame(pal, look),
  ];
  // The rally rides beside the fuzzball.
  const [bx, by] = spot(look, last[0], last[1]);
  field.push(
    kit.rect(bx + 22, by - 40, 58, 30, { rx: 15, fill: pal.warning }),
    kit.text(bx + 51, by - 19, `${shot.rally}`, {
      size: 19,
      weight: 800,
      fill: pal.page,
      anchor: "middle",
    }),
  );

  const panelWidth = 300;
  const gap = 12;
  const bar = gameBar(pal, 2 * panelWidth + 2 * gap + size.width, false, [
    ["LEVEL", `${index + 1}`],
    ["ROUND", `${start.rounds + 1}`],
    ["SCORE", "3,160"],
  ]);
  const head = { size: 12, weight: 700, fill: pal.muted, spacing: 1 };

  // Coming next: the rows that wait, drawn small.
  const small = 22;
  const rowsShown = Math.min(waiting, 12);
  /** @type {string[]} */
  const next = [
    card(pal, panelWidth, size.height),
    kit.text(20, 32, "COMING NEXT", head),
    kit.text(20, 58, `${index + 1} ${level.name}`, {
      size: 19,
      weight: 800,
      fill: pal.text,
    }),
    kit.rect(20, 76, C * small, rowsShown * small, { fill: pal.field }),
  ];
  for (const b of state.bricks.values()) {
    const over = state.base + b.w - look.depth;
    if (over < 0 || over >= rowsShown) continue;
    const { key, draw } = pictureOf(pal, b, tints[b.w]);
    next.push(
      symbols.use(
        `${pal.id}${key}`,
        draw,
        20 + b.c * small,
        76 + (rowsShown - 1 - over) * small,
        small,
      ),
    );
  }
  next.push(
    kit.text(20, 76 + rowsShown * small + 24, `${waiting} rows waiting`, {
      size: 14,
      weight: 700,
      fill: pal.text,
    }),
    ...[
      "Clear to the dashed line and the",
      "wall jumps 3 rows: your next",
      "shot is a hot shot.",
    ].map((words, i) =>
      kit.text(20, 76 + rowsShown * small + 50 + i * 19, words, {
        size: 13.5,
        fill: pal.muted,
      }),
    ),
  );

  // This flight: the rally, what it has earned, and what comes at what.
  // A floor bounce at a rally of 10, and each further one 5 strikes dearer
  // than the last: 25, 45, 70 and on.
  let fromMark = 0,
    nextMark = 10;
  for (let step = 15; nextMark <= shot.rally; step += 5) {
    fromMark = nextMark;
    nextMark += step;
  }
  const share = (shot.rally - fromMark) / (nextMark - fromMark);
  /** @type {string[]} */
  const flight = [
    card(pal, panelWidth, size.height),
    kit.text(20, 32, "THIS FLIGHT", head),
    kit.text(20, 96, `${shot.rally}`, {
      size: 60,
      weight: 800,
      fill: pal.warning,
    }),
    kit.text(104, 78, "bricks struck:", { size: 14, fill: pal.muted }),
    kit.text(104, 97, "its rally", { size: 14, fill: pal.muted }),
    kit.text(20, 138, "FLOOR BOUNCES", head),
    ...[0, 1, 2].map((i) =>
      kit.place(floorBounce(pal, i < held), 20 + i * 44, 150, 36),
    ),
    kit.rect(20, 204, panelWidth - 40, 10, { rx: 5, fill: pal.field }),
    kit.rect(20, 204, (panelWidth - 40) * share, 10, {
      rx: 5,
      fill: pal.warning,
    }),
    kit.text(20, 234, `The next at a rally of ${nextMark}`, {
      size: 13.5,
      fill: pal.muted,
    }),
    kit.text(20, 280, "TURNS", head),
    kit.text(20, 312, `${shot.bounces}`, {
      size: 26,
      weight: 800,
      fill: pal.text,
    }),
    kit.text(
      20 + `${shot.bounces}`.length * 16 + 10,
      311,
      "off walls, bricks and the floor",
      { size: 13.5, fill: pal.muted },
    ),
    kit.text(20, 360, "IN THIS WALL", head),
  ];
  const kinds = new Set(level.bricks.join("").replaceAll(".", ""));
  const inWall = KINDS.filter((kind) =>
    [...kinds].some((mark) => kindOf(mark) === kind.id),
  );
  inWall.forEach((kind, i) => {
    const y = 374 + i * 50;
    flight.push(
      kit.rect(20, y, panelWidth - 40, 44, { rx: 8, fill: pal.field }),
      kit.place(kind.draw(pal), 28, y + 7, 30),
      kit.text(68, y + 19, kind.name, {
        size: 13.5,
        weight: 700,
        fill: pal.text,
      }),
      kit.text(68, y + 35, kind.does, { size: 12, fill: pal.muted }),
    );
  });

  const width = bar.height === 0 ? 0 : 2 * panelWidth + 2 * gap + size.width;
  return {
    width,
    height: bar.height + gap + size.height,
    svg:
      bar.svg +
      at(0, bar.height + gap, next.join("\n")) +
      at(panelWidth + gap, bar.height + gap, field.join("")) +
      at(
        panelWidth + gap + size.width + gap,
        bar.height + gap,
        flight.join("\n"),
      ),
  };
}

/**
 * Draws the field sheet: a phone, aiming, and a wide window, mid-flight.
 *
 * @param {Symbols} symbols
 * @returns {{ width: number, height: number, body: string }}
 */
function fieldSheet(symbols) {
  const pal = kit.DARK;
  const phone = phoneScene(pal, symbols);
  const wide = wideScene(pal, symbols);
  const top = 182;
  const gap = 72;
  const width = MARGIN + phone.width + gap + wide.width + MARGIN;
  const height = top + Math.max(phone.height, wide.height) + MARGIN;
  const wideLeft = MARGIN + phone.width + gap;
  const caption = { size: 17, weight: 700, fill: "#e6edf7" };
  return {
    width,
    height,
    body: [
      kit.rect(0, 0, width, height, { fill: "#101822" }),
      kit.text(MARGIN, 64, "Rickashay: the field in play", {
        size: 40,
        weight: 800,
        fill: "#e6edf7",
      }),
      kit.text(
        MARGIN,
        96,
        "Two draft levels, as the sketch played them. Nothing here is charged: the aim is the whole shot.",
        { size: 18, fill: "#93a4bd" },
      ),
      kit.text(MARGIN, 140, "Aiming, on a phone", caption),
      kit.text(MARGIN, 162, "The guide runs to the flight's third turn.", {
        size: 14.5,
        fill: "#93a4bd",
      }),
      kit.text(wideLeft, 140, "A flight in the air, in a wide window", caption),
      kit.text(
        wideLeft,
        162,
        "Its path so far, its rally beside it, the floor bounces it holds, and the panels a wide room has space for.",
        { size: 14.5, fill: "#93a4bd" },
      ),
      at(MARGIN, top, phone.svg),
      at(wideLeft, top, wide.svg),
    ].join("\n"),
  };
}

// --------------------------------------------------------------- the files

/**
 * Writes the three sheets beside this script.
 *
 * @returns {void}
 */
function main() {
  /** @type {(path: string, sheet: { width: number, height: number, body: string }, title: string, symbols?: Symbols) => void} */
  const write = (path, sheet, title, symbols) => {
    const file = join(here, path);
    mkdirSync(dirname(file), { recursive: true });
    const content = kit.svgFile(
      sheet.width,
      sheet.height,
      title,
      (symbols ? symbols.defsFor(sheet.body) : "") + sheet.body,
    );
    writeFileSync(file, content);
    console.log(`${path} (${Buffer.byteLength(content)} bytes)`);
  };
  const symbols = new Symbols();
  write(
    "bricks.svg",
    bricksSheet(),
    "Rickashay concept art: the eleven kinds of brick, their states, the fuzzball and the floor bounces, in a dark palette and a light one",
  );
  write(
    "flight.svg",
    flightSheet(symbols),
    "Rickashay concept art: how a flight turns off a face and off a cut corner, the eight directions it flies in, and a steep aim against a shallow one",
    symbols,
  );
  write(
    "field.svg",
    fieldSheet(symbols),
    "Rickashay concept art: the field in play, aiming on a phone and a flight in the air in a wide window",
    symbols,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
