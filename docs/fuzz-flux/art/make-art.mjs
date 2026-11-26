/**
 * Draws the design's art sheets from the shapes in `fuzz.mjs`: the six kinds
 * and their looks, the special fuzzballs, what else stands on a board, the
 * brick close up and beside the looks it was chosen over, and the kinds as
 * people with each kind of color blindness see them. It also writes each
 * piece out as an SVG of its own.
 *
 * Run it from anywhere: `node docs/fuzz-flux/art/make-art.mjs`.
 */

/** @import { KindId, Palette, Shape } from './fuzz.mjs' */

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OPTIONS } from "./brick-options.mjs";
import {
  KIND_IDS,
  KIND_NAMES,
  PALETTES,
  brick,
  burr,
  cage,
  frizzball,
  fuzzball,
  moved,
  sleepy,
  square,
  svg,
} from "./fuzz.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  join(here, "..", "..", "..", "frontend", "package.json"),
);
const sharp = require("sharp");

const FONT = "Inter, DejaVu Sans, sans-serif";

/**
 * Returns shapes drawn at a place and a size, a cell being 100 units wide.
 * @param {Shape[]} shapes
 * @param {Palette} palette
 * @param {KindId | null} kind
 * @param {number} x The cell's center.
 * @param {number} y
 * @param {number} [px] The cell's width.
 * @returns {string}
 */
function put(shapes, palette, kind, x, y, px = 100) {
  return `<g transform="translate(${x} ${y}) scale(${px / 100})">${svg(shapes, palette, kind)}</g>`;
}

/**
 * Returns a line of text.
 * @param {string} words
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @param {{ size?: number, bold?: boolean, muted?: boolean, middle?: boolean }} [o]
 * @returns {string}
 */
function text(words, x, y, palette, o = {}) {
  const fill = o.muted ? palette.roles.muted : palette.roles.text;
  return `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" font-weight="${o.bold ? 600 : 400}" fill="${fill}"${o.middle ? ' text-anchor="middle"' : ""}>${words.replace(/&/g, "&amp;")}</text>`;
}

/**
 * Writes a sheet as a WebP.
 * @param {string} name
 * @param {number} w
 * @param {number} h
 * @param {string} body SVG markup.
 * @returns {Promise<void>}
 */
async function sheet(name, w, h, body) {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">${body}</svg>`;
  await sharp(Buffer.from(doc), { density: 144 })
    .webp({ quality: 84, effort: 6 })
    .toFile(join(here, `${name}.webp`));
  console.log(`art/${name}.webp`);
}

/**
 * Returns a panel in one palette's colors.
 * @param {Palette} palette
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {string}
 */
function panel(palette, y, w, h) {
  return `<rect x="0" y="${y}" width="${w}" height="${h}" fill="${palette.roles.page}"/>`;
}

/**
 * Returns a fuzzball of a kind on its square.
 * @param {KindId} kind
 * @param {Parameters<typeof fuzzball>[1]} [o]
 * @returns {Shape[]}
 */
function seated(kind, o) {
  return [...square(0), ...fuzzball(kind, o)];
}

/** Draws the six kinds: their looks, their fur on end, small sizes and shapes alone. */
async function kinds() {
  const W = 130 + 6 * 118;
  /** @type {{ label: string, make: (kind: KindId) => Shape[], px?: number, tall?: number, flat?: string }[]} */
  const rows = [
    { label: "At rest", make: (k) => seated(k) },
    { label: "Blink", make: (k) => seated(k, { look: "blink" }) },
    { label: "Looking", make: (k) => seated(k, { dx: 0.9, dy: -0.4 }) },
    { label: "Wide", make: (k) => seated(k, { look: "wide" }) },
    { label: "Happy", make: (k) => seated(k, { look: "happy" }) },
    { label: "Cross", make: (k) => seated(k, { look: "cross" }) },
    { label: "Fur on end", make: (k) => seated(k, { look: "wide", lift: 1 }) },
    { label: "40 px", make: (k) => seated(k), px: 40, tall: 56 },
    { label: "28 px", make: (k) => seated(k), px: 28, tall: 44 },
    {
      label: "Shape alone",
      make: (k) => fuzzball(k).filter((s) => s.c === "ink"),
      flat: "text",
      tall: 108,
    },
  ];
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    const tall =
      44 + rows.reduce((sum, row) => sum + (row.tall ?? 108), 0) + 10;
    body += panel(palette, y, W, tall);
    KIND_IDS.forEach((kind, n) => {
      body += text(KIND_NAMES[kind], 130 + n * 118 + 54, y + 28, palette, {
        bold: true,
        middle: true,
      });
    });
    body += text(palette.name, 14, y + 28, palette, { bold: true });
    let top = y + 44;
    for (const row of rows) {
      const step = row.tall ?? 108;
      body += text(row.label, 14, top + step / 2 + 5, palette, { muted: true });
      KIND_IDS.forEach((kind, n) => {
        const shapes = row.flat
          ? row.make(kind).map((s) => ({ ...s, c: palette.roles.text }))
          : row.make(kind);
        body += put(
          shapes,
          palette,
          kind,
          130 + n * 118 + 54,
          top + step / 2,
          row.px ?? 100,
        );
      });
      top += step;
    }
    y += tall;
  }
  await sheet("kinds", W, y, body);
}

/** Draws the special fuzzballs, every kind in each fur. */
async function specials() {
  const W = 130 + 6 * 118 + 130;
  /** @type {{ label: string, sub: string, special: 'dasher-h' | 'dasher-v' | 'puffer' | 'wisp' }[]} */
  const rows = [
    { label: "Dasher", sub: "across", special: "dasher-h" },
    { label: "Dasher", sub: "up and down", special: "dasher-v" },
    { label: "Puffer", sub: "", special: "puffer" },
    { label: "Wisp", sub: "", special: "wisp" },
  ];
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    const tall = 44 + rows.length * 112 + 70;
    body += panel(palette, y, W, tall);
    body += text(palette.name, 14, y + 28, palette, { bold: true });
    KIND_IDS.forEach(
      (kind, n) =>
        (body += text(KIND_NAMES[kind], 130 + n * 118 + 54, y + 28, palette, {
          bold: true,
          middle: true,
        })),
    );
    body += text("Frizzball", 130 + 6 * 118 + 60, y + 28, palette, {
      bold: true,
      middle: true,
    });
    rows.forEach((row, r) => {
      const cy = y + 44 + r * 112 + 56;
      body += text(row.label, 14, cy, palette, { muted: true });
      if (row.sub)
        body += text(row.sub, 14, cy + 17, palette, { muted: true, size: 12 });
      KIND_IDS.forEach(
        (kind, n) =>
          (body += put(
            seated(kind, { special: row.special }),
            palette,
            kind,
            130 + n * 118 + 54,
            cy,
          )),
      );
    });
    body += put(
      [...square(0), ...frizzball(palette).map((s) => moved(s, 0, 0, 0.84))],
      palette,
      null,
      130 + 6 * 118 + 60,
      y + 44 + 56,
    );
    body += put(
      [
        ...square(0),
        ...frizzball(palette, "happy", 1.4).map((s) => moved(s, 0, 0, 0.84)),
      ],
      palette,
      null,
      130 + 6 * 118 + 60,
      y + 44 + 112 + 56,
    );
    // Each at the size of a square on a small phone.
    body += text("40 px", 14, y + 44 + rows.length * 112 + 38, palette, {
      muted: true,
    });
    rows.forEach((row, r) => {
      KIND_IDS.slice(0, 3).forEach((kind, n) => {
        body += put(
          seated(KIND_IDS[(n + r) % 6], { special: row.special }),
          palette,
          KIND_IDS[(n + r) % 6],
          130 + (r * 3 + n) * 50 + 24,
          y + 44 + rows.length * 112 + 34,
          40,
        );
        void kind;
      });
    });
    body += put(
      [...square(0), ...frizzball(palette).map((s) => moved(s, 0, 0, 0.84))],
      palette,
      null,
      130 + 12 * 50 + 24,
      y + 44 + rows.length * 112 + 34,
      40,
    );
    y += tall;
  }
  await sheet("specials", W, y, body);
}

/**
 * Returns everything else that stands on a board, each with its name.
 * @param {Palette} palette
 * @returns {{ label: string, shapes: Shape[], kind: KindId | null }[]}
 */
function pieces(palette) {
  return [
    { label: "Square", shapes: square(0), kind: null },
    { label: "Dust", shapes: square(1), kind: null },
    { label: "Thick dust", shapes: square(2), kind: null },
    { label: "Brick", shapes: [...square(0), ...brick(1)], kind: null },
    { label: "2 layers", shapes: [...square(0), ...brick(2)], kind: null },
    { label: "3 layers", shapes: [...square(0), ...brick(3)], kind: null },
    { label: "4 layers", shapes: [...square(0), ...brick(4)], kind: null },
    {
      label: "Cage",
      shapes: [...seated("green", { look: "sleepy" }), ...cage()],
      kind: "green",
    },
    {
      label: "Burr",
      shapes: [
        ...square(0),
        ...burr(),
        ...fuzzball("violet", { look: "sleepy" }).map((s) =>
          moved(s, 0, 0, 0.82),
        ),
      ],
      kind: "violet",
    },
    { label: "Sleepyhead", shapes: [...square(0), ...sleepy()], kind: null },
    {
      label: "Frizzball",
      shapes: [
        ...square(0),
        ...frizzball(palette).map((s) => moved(s, 0, 0, 0.84)),
      ],
      kind: null,
    },
  ];
}

/** Draws what else stands on a board. */
async function elements() {
  const count = pieces(PALETTES.dark).length;
  const W = 20 + count * 112;
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    body += panel(palette, y, W, 232);
    body += text(palette.name, 14, y + 26, palette, { bold: true });
    pieces(palette).forEach((piece, n) => {
      const x = 20 + n * 112 + 50;
      body += put(piece.shapes, palette, piece.kind, x, y + 92);
      body += text(piece.label, x, y + 164, palette, {
        muted: true,
        middle: true,
        size: 13,
      });
      body += put(piece.shapes, palette, piece.kind, x, y + 200, 40);
    });
    y += 232;
  }
  await sheet("elements", W, y, body);
}

/**
 * Returns a strip of a board at a phone's size, bricks among fuzzballs.
 * @param {(hits: number) => Shape[]} make
 * @param {Palette} palette
 * @param {number} x Its left edge.
 * @param {number} y Its top.
 * @returns {string}
 */
function strip(make, palette, x, y) {
  /** @type {(KindId | number)[][]} */
  const lines = [
    ["blue", 3, "red", 1, "green"],
    [4, "amber", 2, "violet", "pink"],
  ];
  let out = "";
  lines.forEach((line, row) => {
    line.forEach((cell, col) => {
      const shapes =
        typeof cell === "number" ? [...square(0), ...make(cell)] : seated(cell);
      out += put(
        shapes,
        palette,
        typeof cell === "number" ? null : cell,
        x + col * 44 + 22,
        y + row * 44 + 22,
        42,
      );
    });
  });
  return out;
}

/** Draws the brick close up: every count of layers, big and among fuzzballs. */
async function bricks() {
  const W = 20 + 4 * 176 + 250;
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    body += panel(palette, y, W, 252);
    body += text(palette.name, 14, y + 26, palette, { bold: true });
    [4, 3, 2, 1].forEach((layers, n) => {
      const x = 20 + n * 176 + 84;
      body += put(
        [...square(0), ...brick(layers)],
        palette,
        null,
        x,
        y + 124,
        160,
      );
      body += text(
        layers === 1 ? "1 layer" : `${layers} layers`,
        x,
        y + 232,
        palette,
        { muted: true, middle: true, size: 13 },
      );
    });
    body += strip(brick, palette, 20 + 4 * 176 + 10, y + 80);
    body += text("On a phone", 20 + 4 * 176 + 120, y + 232, palette, {
      muted: true,
      middle: true,
      size: 13,
    });
    y += 252;
  }
  await sheet("bricks", W, y, body);
}

/** Draws the looks weighed for a brick, the one chosen first. */
async function brickOptions() {
  const left = 318;
  const W = left + 4 * 108 + 24 + 4 * 46 + 24 + 5 * 44 + 20;
  const rowH = 112;
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    const tall = 56 + OPTIONS.length * rowH + 8;
    body += panel(palette, y, W, tall);
    body += text(palette.name, 14, y + 26, palette, { bold: true });
    [4, 3, 2, 1].forEach((hits, n) => {
      body += text(
        `${hits} ${hits === 1 ? "hit" : "hits"} left`,
        left + n * 108 + 50,
        y + 46,
        palette,
        { muted: true, middle: true, size: 13 },
      );
    });
    OPTIONS.forEach((option, row) => {
      const cy = y + 56 + row * rowH + 52;
      body += text(option.name, 14, cy - 4, palette, { bold: true });
      body += text(`A hit: ${option.hit}`, 14, cy + 16, palette, {
        muted: true,
        size: 11,
      });
      [4, 3, 2, 1].forEach((hits, n) => {
        const shapes = [...square(0), ...option.make(hits)];
        body += put(shapes, palette, null, left + n * 108 + 50, cy);
        body += put(
          shapes,
          palette,
          null,
          left + 4 * 108 + 24 + n * 46 + 21,
          cy,
          42,
        );
      });
      body += strip(
        option.make,
        palette,
        left + 4 * 108 + 24 + 4 * 46 + 24,
        cy - 44,
      );
    });
    y += tall;
  }
  await sheet("brick-options", W, y, body);
}

/** How each kind of color blindness changes a color, as a matrix on linear light. */
const SIGHT = {
  "Full color": [1, 0, 0, 0, 1, 0, 0, 0, 1],
  "No red cones": [
    0.152, 1.053, -0.205, 0.115, 0.786, 0.099, -0.004, -0.048, 1.052,
  ],
  "No green cones": [
    0.367, 0.861, -0.228, 0.28, 0.673, 0.047, -0.012, 0.043, 0.969,
  ],
  "No blue cones": [
    1.256, -0.077, -0.179, -0.078, 0.931, 0.148, 0.005, 0.691, 0.304,
  ],
  "No color": [
    0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722,
  ],
};

/**
 * Returns a color as one kind of sight sees it.
 * @param {string} hex
 * @param {number[]} m
 * @returns {string}
 */
function seen(hex, m) {
  const lin = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const out = [0, 1, 2].map((r) => {
    const v = Math.max(
      0,
      Math.min(
        1,
        m[r * 3] * lin[0] + m[r * 3 + 1] * lin[1] + m[r * 3 + 2] * lin[2],
      ),
    );
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(s * 255)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${out.join("")}`;
}

/** Draws the kinds as each kind of sight sees them, which is why each has a shape of its own. */
async function sight() {
  const W = 150 + 6 * 104;
  let body = "";
  let y = 0;
  for (const palette of [PALETTES.dark, PALETTES.light]) {
    const tall = 40 + Object.keys(SIGHT).length * 100 + 8;
    body += panel(palette, y, W, tall);
    body += text(palette.name, 14, y + 26, palette, { bold: true });
    Object.entries(SIGHT).forEach(([label, m], r) => {
      /** @type {Palette} */
      const shifted = {
        ...palette,
        roles: Object.fromEntries(
          Object.entries(palette.roles).map(([role, c]) => [role, seen(c, m)]),
        ),
        inks: /** @type {Palette['inks']} */ (
          Object.fromEntries(
            Object.entries(palette.inks).map(([k, c]) => [k, seen(c, m)]),
          )
        ),
      };
      const cy = y + 40 + r * 100 + 50;
      body += text(label, 14, cy + 5, palette, { muted: true });
      KIND_IDS.forEach(
        (kind, n) =>
          (body += put(
            seated(kind),
            shifted,
            kind,
            150 + n * 104 + 50,
            cy,
            92,
          )),
      );
    });
    y += tall;
  }
  await sheet("sight", W, y, body);
}

/** Writes each piece as an SVG of its own, in the dark palette's colors. */
function singles() {
  const palette = PALETTES.dark;
  mkdirSync(join(here, "svg"), { recursive: true });
  /** @type {[string, Shape[], KindId | null][]} */
  const list = [
    ...KIND_IDS.map(
      (kind) =>
        /** @type {[string, Shape[], KindId | null]} */ ([
          kind,
          fuzzball(kind),
          kind,
        ]),
    ),
    ["dasher-across", fuzzball("blue", { special: "dasher-h" }), "blue"],
    ["dasher-up-and-down", fuzzball("blue", { special: "dasher-v" }), "blue"],
    ["puffer", fuzzball("amber", { special: "puffer" }), "amber"],
    ["wisp", fuzzball("green", { special: "wisp" }), "green"],
    ["frizzball", frizzball(palette).map((s) => moved(s, 0, 0, 0.84)), null],
    ["sleepyhead", sleepy(), null],
    ["square", square(0), null],
    ["dust", square(1), null],
    ["thick-dust", square(2), null],
    ...[1, 2, 3, 4].map(
      (hits) =>
        /** @type {[string, Shape[], KindId | null]} */ ([
          `brick-${hits}`,
          brick(hits),
          null,
        ]),
    ),
    ["cage", cage(), null],
    ["burr", burr(), null],
  ];
  for (const [name, shapes, kind] of list) {
    writeFileSync(
      join(here, "svg", `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">${svg(shapes, palette, kind)}</svg>\n`,
    );
  }
  console.log(`art/svg: ${list.length} pieces`);
}

await kinds();
await specials();
await elements();
await bricks();
await brickOptions();
await sight();
singles();
