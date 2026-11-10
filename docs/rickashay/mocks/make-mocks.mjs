// Draws a mock of each of the 36 draft levels (../levels/) as it opens, and a
// sheet of each set of nine: the whole wall, with where a phone's and a wide
// window's ceilings cut it, the level as it opens on a phone held upright and
// in a wide window, each with the longest flight that opening allows, and the
// kinds of brick the wall holds. Like ../art/, it illustrates the design and
// is not the game's code.
//
// Run it with `node docs/rickashay/mocks/make-mocks.mjs`. It needs nothing
// but Node, writes every file beside itself, and writes the same bytes each
// time. It draws with ../art/make-art.mjs's bricks, so the mocks keep in step
// with the art, and its flights are the sketch's (../sketch/): the aim that
// strikes the most bricks from where the fuzzball first waits, found by
// flying all 657.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  KINDS,
  SCREENS,
  Symbols,
  at,
  drawBricks,
  drawPath,
  fieldBack,
  fieldFrame,
  fieldLines,
  fuzzAt,
  kindOf,
  kit,
  longestFlight,
  pictureOf,
  sizeOf,
  tintsFromBelow,
} from "../art/make-art.mjs";
import { LEVELS, SETS } from "../sketch/levels.mjs";
import { K, LEGEND, makeState } from "../sketch/sim.mjs";

const here = import.meta.dirname;
const pal = kit.DARK;
const symbols = new Symbols();

/** @typedef {[number, number]} Point */

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} name
 * @property {string} around What its wall is built around.
 * @property {string} set Its set's name.
 * @property {string[]} bricks The wall's rows, top first.
 */

const COLUMNS = 9;
const CARD = { width: 872, height: 940, pad: 32 };
const WALL_CELL = 16;
const FIELD_CELL = 28;
const TOP = 196;

/** Where each screen's field is drawn on the card, and its mark on the wall. */
const PLACED = [
  { ...SCREENS.phone, label: "phone", x: 300 },
  { ...SCREENS.wide, label: "wide", x: 588 },
];

/** How many of a flight's first turns its path is drawn boldly for. */
const BOLD_TURNS = 10;

/**
 * Draws the whole wall, top row first, and where the ceiling of each screen
 * cuts it as the level opens: what is under a ceiling is in play, and what
 * is over it waits.
 *
 * @param {Level} level
 * @param {string[]} tints Each row's, lowest first.
 * @returns {string}
 */
function wallPanel(level, tints) {
  const wall = level.bricks;
  const width = COLUMNS * WALL_CELL;
  const height = wall.length * WALL_CELL;
  /** @type {string[]} */
  const out = [
    kit.text(0, -14, `The whole wall, ${wall.length} rows`, {
      size: 14,
      weight: 700,
      fill: pal.text,
    }),
    kit.rect(0, 0, width, height, { fill: pal.field }),
  ];
  for (const b of makeState(level, 22).bricks.values()) {
    const { key, draw } = pictureOf(pal, b, tints[b.w]);
    out.push(
      symbols.use(
        key,
        draw,
        b.c * WALL_CELL,
        (wall.length - 1 - b.w) * WALL_CELL,
        WALL_CELL,
      ),
    );
  }
  out.push(kit.rect(0, 0, width, height, { stroke: pal.fieldLine, sw: 1.5 }));
  for (const { depth, label } of PLACED) {
    const shown = 2 * kit.jumpRows(depth);
    const y = height - shown * WALL_CELL;
    out.push(
      kit.dashedLine(width + 16, y, 6, 4, { stroke: pal.accent, sw: 2 }),
      kit.text(width + 22, y + 4, label, { size: 12, fill: pal.accent }),
      kit.text(width + 22, y + 18, `${wall.length - shown} wait`, {
        size: 11,
        fill: pal.muted,
      }),
    );
  }
  out.push(
    kit.text(0, height + 20, "Lowest row: the first in", {
      size: 12,
      fill: pal.muted,
    }),
  );
  return out.join("");
}

/**
 * Draws a level as it opens on a screen's field, with the longest flight
 * the opening allows: the whole of its path faintly, and its first turns
 * boldly.
 *
 * @param {Level} level
 * @param {string[]} tints
 * @param {{ name: string, depth: number, band: number, lintel: number }} screen
 * @returns {string}
 */
function openingField(level, tints, screen) {
  const look = { cell: FIELD_CELL, ...screen };
  const state = makeState(level, look.depth);
  const jump = kit.jumpRows(look.depth);
  const { height } = sizeOf(look);
  const { degrees, trace, shot } = longestFlight(state);
  // The first turns: every point of the path up to the one after the last
  // of them.
  /** @type {(Point | null)[]} */
  const first = [];
  let turns = 0;
  for (const point of trace) {
    first.push(point);
    if (point !== null && ++turns > BOLD_TURNS + 1) break;
  }
  const small = { size: 12, fill: pal.muted };
  return [
    kit.text(0, -14, `${screen.name}, 9 × ${look.depth}`, {
      size: 14,
      weight: 700,
      fill: pal.text,
    }),
    fieldBack(pal, look, level.bricks.length - 2 * jump),
    drawBricks(pal, symbols, look, state, tints),
    fieldLines(pal, look),
    drawPath(look, trace, pal.text, 1, 0.22),
    drawPath(look, first, pal.text, 1.8, 0.95),
    fuzzAt(look, state.x, 0.25, kit.fuzzball(pal.accent)),
    fieldFrame(pal, look),
    kit.text(
      0,
      height + 22,
      `Opens on row ${look.depth - 2 * jump}; a jump is ${jump} rows`,
      small,
    ),
    kit.text(
      0,
      height + 40,
      `Its longest flight: aimed at ${degrees}°,`,
      small,
    ),
    kit.text(
      0,
      height + 58,
      `a rally of ${shot.rally} in ${shot.bounces} turns`,
      small,
    ),
  ].join("");
}

/**
 * @typedef {object} KindCount
 * @property {string} kind Its id in the art's catalog.
 * @property {number} count
 * @property {boolean} fresh Whether this is the first level it is in.
 */

/**
 * Draws a row of chips under the fields: each kind of brick in the wall,
 * with how many it holds, and a mark on those it is the first level to use.
 *
 * @param {KindCount[]} kinds
 * @returns {string}
 */
function kindsPanel(kinds) {
  /** @type {string[]} */
  const out = [
    kit.text(0, 0, "In this wall", { size: 14, weight: 700, fill: pal.text }),
  ];
  const across = 5;
  const chip = { width: 156, height: 44, gap: 6 };
  kinds.forEach(({ kind, count, fresh }, i) => {
    const x = (i % across) * (chip.width + chip.gap);
    const y = 14 + Math.floor(i / across) * (chip.height + chip.gap);
    const entry = KINDS.find((k) => k.id === kind);
    if (!entry) throw new Error(`no kind ${kind}`);
    out.push(
      kit.rect(x, y, chip.width, chip.height, {
        rx: 8,
        fill: pal.field,
        stroke: fresh ? pal.accent : pal.fieldLine,
        sw: fresh ? 2 : 1,
      }),
      symbols.use(`kind-${kind}`, () => entry.draw(pal), x + 8, y + 7, 30),
      kit.text(x + 46, y + 19, entry.name, {
        size: 12.5,
        weight: 700,
        fill: pal.text,
      }),
      kit.text(x + 46, y + 35, fresh ? `${count}, new here` : `${count}`, {
        size: 11.5,
        fill: fresh ? pal.accent : pal.muted,
      }),
    );
  });
  return out.join("");
}

/**
 * Draws a level's card.
 *
 * @param {Level} level
 * @param {number} number Its place in the game, from 1.
 * @param {Set<string>} seen The kinds the levels before it use.
 * @returns {string}
 */
function card(level, number, seen) {
  const wall = level.bricks;
  const tints = tintsFromBelow(wall);
  const marks = [...wall.join("").replaceAll(".", "")];
  const needed = marks.filter((mark) => K[LEGEND[mark][0]].needed);
  const hits = needed.reduce((sum, mark) => sum + LEGEND[mark][1], 0);
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const mark of marks) {
    counts.set(kindOf(mark), (counts.get(kindOf(mark)) ?? 0) + 1);
  }
  /** @type {KindCount[]} */
  const kinds = KINDS.filter((kind) => counts.has(kind.id)).map((kind) => ({
    kind: kind.id,
    count: counts.get(kind.id) ?? 0,
    fresh: !seen.has(kind.id),
  }));

  /** @type {string[]} */
  const out = [
    kit.rect(0, 0, CARD.width, CARD.height, {
      rx: 18,
      fill: pal.page,
      stroke: pal.fieldLine,
      sw: 2,
    }),
    kit.text(CARD.pad, 52, `${number}`, {
      size: 38,
      weight: 800,
      fill: pal.accent,
    }),
    kit.text(CARD.pad + String(number).length * 23 + 14, 52, level.name, {
      size: 30,
      weight: 800,
      fill: pal.text,
    }),
    kit.text(
      CARD.width - CARD.pad,
      50,
      `${level.set} · ${((number - 1) % 9) + 1} of 9`,
      { size: 14, fill: pal.muted, anchor: "end" },
    ),
    kit.text(CARD.pad, 84, level.around, { size: 16, fill: pal.muted }),
  ];

  // The figures, as chips, and what a jump pays.
  let x = CARD.pad;
  for (const words of [
    `${wall.length} rows`,
    `${needed.length} bricks`,
    `${hits} hits`,
  ]) {
    const width = 18 + words.length * 7.6;
    out.push(
      kit.rect(x, 104, width, 32, { rx: 16, fill: pal.field }),
      kit.text(x + width / 2, 125, words, {
        size: 13.5,
        weight: 700,
        fill: pal.text,
        anchor: "middle",
      }),
    );
    x += width + 8;
  }
  out.push(
    kit.rect(x, 104, 196, 32, { rx: 16, fill: pal.warning }),
    kit.place(kit.hotShot(pal), x + 8, 104, 30, 32),
    kit.text(x + 44, 125, "A jump: a hot shot", {
      size: 13.5,
      weight: 700,
      fill: pal.page,
    }),
  );

  out.push(at(CARD.pad, TOP, wallPanel(level, tints)));
  for (const screen of PLACED) {
    out.push(at(screen.x, TOP, openingField(level, tints, screen)));
  }
  out.push(at(CARD.pad, 824, kindsPanel(kinds)));
  for (const { kind } of kinds) seen.add(kind);
  return out.join("");
}

/**
 * Writes a level's mock and a sheet of each set's nine, beside this script.
 *
 * @returns {void}
 */
function main() {
  /** @type {(path: string, content: string) => void} */
  const write = (path, content) => {
    const file = join(here, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`${path} (${Buffer.byteLength(content)} bytes)`);
  };
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const cards = [];
  /** @type {Level[]} */
  const levels = LEVELS;
  levels.forEach((level, i) => {
    const body = card(level, i + 1, seen);
    const name = `Level ${i + 1}, ${level.name}`;
    write(
      `levels/${String(i + 1).padStart(2, "0")}-${level.id}.svg`,
      kit.svgFile(
        CARD.width,
        CARD.height,
        `Rickashay mock: ${name}, as it opens, with its longest opening flight`,
        symbols.defsFor(body) + body,
      ),
    );
    cards.push(body);
  });

  const gap = 24;
  const head = 96;
  SETS.forEach((setId, s) => {
    const first = levels[s * 9];
    const width = 3 * CARD.width + 4 * gap;
    const height = head + 3 * CARD.height + 4 * gap;
    const body = [
      kit.rect(0, 0, width, height, { fill: pal.panel }),
      kit.text(
        gap,
        62,
        `Rickashay: ${first.set}, levels ${s * 9 + 1} to ${s * 9 + 9}`,
        { size: 40, weight: 800, fill: pal.text },
      ),
      kit.text(
        width - gap,
        60,
        "Midnight blue · each level as it opens, with the longest flight the opening allows",
        { size: 20, fill: pal.muted, anchor: "end" },
      ),
      ...cards
        .slice(s * 9, s * 9 + 9)
        .map((c, i) =>
          at(
            gap + (i % 3) * (CARD.width + gap),
            head + gap + Math.floor(i / 3) * (CARD.height + gap),
            c,
          ),
        ),
    ].join("");
    write(
      `${setId}.svg`,
      kit.svgFile(
        width,
        height,
        `Rickashay mocks: the ${first.set} set, each level as it opens`,
        symbols.defsFor(body) + body,
      ),
    );
  });
}

main();
