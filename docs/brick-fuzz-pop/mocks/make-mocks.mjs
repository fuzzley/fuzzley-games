// Draws a mock of each of the 36 draft levels (../levels/) as it opens, and a
// sheet of each set of nine: the whole wall, with where a phone's and a wide
// window's ceilings cut it, the level as it opens on a phone held upright and
// in a wide window, and the kinds of brick it holds. Like ../art/, it
// illustrates the plan and is not the game's code.
//
// Run it with `node docs/brick-fuzz-pop/mocks/make-mocks.mjs`. It needs nothing
// but Node, writes every file beside itself, and writes the same bytes each
// time. It draws with ../art/make-art.mjs's own bricks, so the mocks keep in
// step with the art. That script draws its sheets as it loads and exports
// nothing, so this one loads its source without the closing call to `main()`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const here = import.meta.dirname;

/** What this script takes from the art's. */
const BORROWED = [
  "DARK",
  "FUZZ",
  "KINDS",
  "TINT_NAMES",
  "brick",
  "tough",
  "steel",
  "plated",
  "shell",
  "moss",
  "zapper",
  "bomb",
  "bumper",
  "prism",
  "portal",
  "wool",
  "cage",
  "fuzzball",
  "hotShot",
  "tripleShot",
  "mix",
  "rect",
  "circle",
  "polyline",
  "text",
  "place",
  "dashedLine",
  "jumpRows",
  "svgFile",
];

/**
 * Loads ../art/make-art.mjs's drawing without writing its files.
 *
 * @returns {Promise<Record<string, any>>}
 */
async function loadArt() {
  const source = readFileSync(join(here, "../art/make-art.mjs"), "utf8");
  const call = "\nmain();\n";
  if (!source.endsWith(call)) {
    throw new Error("make-art.mjs no longer ends by calling main()");
  }
  const module = `${source.slice(0, -call.length)}\nexport { ${BORROWED.join(", ")} };\n`;
  return import(
    `data:text/javascript;base64,${Buffer.from(module).toString("base64")}`
  );
}

const art = await loadArt();
const pal = art.DARK;

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} name
 * @property {"hot" | "triple"} boon
 * @property {string[]} bricks The wall's rows, top first.
 */

/**
 * @typedef {object} Numbered
 * @property {number} number Its place in the game, from 1.
 * @property {Level} level
 * @property {string} set The set's name.
 * @property {string} setId
 * @property {number} inSet Its place in its set, from 1.
 * @property {string} builtAround What the plan's table says it is built
 *   around.
 */

/** The sets, in the order the game plays them. */
const SETS = ["warm-up", "sparks", "tricks", "thick-walls"];

/**
 * Reads every level, numbered as the game plays them, with what the plan's
 * table of drafts says each is built around.
 *
 * @returns {Numbered[]}
 */
function readLevels() {
  const plan = readFileSync(join(here, "../plan.md"), "utf8");
  /** @type {Map<number, { name: string, builtAround: string }>} */
  const table = new Map();
  for (const row of plan.matchAll(
    /^\| (\d+) +\| ([^|]+?) +\| ([^|]+?) +\| (?:hot|triple) +\|/gm,
  )) {
    table.set(Number(row[1]), { name: row[2], builtAround: row[3] });
  }
  /** @type {Numbered[]} */
  const levels = [];
  for (const setId of SETS) {
    const set = JSON.parse(
      readFileSync(join(here, `../levels/${setId}.json`), "utf8"),
    );
    set.levels.forEach((/** @type {Level} */ level, i) => {
      const number = levels.length + 1;
      const row = table.get(number);
      if (row?.name !== level.name) {
        throw new Error(`level ${number}: the plan calls it ${row?.name}`);
      }
      levels.push({
        number,
        level,
        set: set.name,
        setId,
        inSet: i + 1,
        builtAround: row.builtAround,
      });
    });
  }
  return levels;
}

// ------------------------------------------------------------- the bricks

/**
 * The kind each character of a wall stands for, by its id in the art's
 * catalog; a digit is a tough brick.
 *
 * @type {Record<string, string>}
 */
const KIND_OF = {
  o: "brick",
  "#": "steel",
  v: "plated",
  U: "plated",
  S: "shell",
  M: "moss",
  N: "moss",
  "-": "row-zapper",
  "|": "column-zapper",
  "+": "cross-zapper",
  "*": "bomb",
  x: "x-zapper",
  B: "bumper",
  P: "prism",
  "@": "portal",
  "&": "portal",
  W: "wool",
  C: "cage",
};

/**
 * Returns the kind a character of a wall stands for.
 *
 * @param {string} cell
 * @returns {string}
 */
function kindOf(cell) {
  return /\d/.test(cell) ? "tough" : KIND_OF[cell];
}

/** The kinds a level doesn't need cleared, and so has no hits for. */
const NEVER_BREAKS = new Set(["steel", "bumper", "portal"]);

/**
 * Returns how many hits the brick in a cell takes, 0 for one that never
 * breaks.
 *
 * @param {string} cell
 * @returns {number}
 */
function hitsOf(cell) {
  if (/\d/.test(cell)) return Number(cell);
  if (NEVER_BREAKS.has(kindOf(cell))) return 0;
  return "CvUSM".includes(cell) ? 2 : cell === "N" ? 3 : 1;
}

/**
 * Draws the brick a cell of a wall holds, or nothing for air.
 *
 * @param {string} cell
 * @param {string} tint Its row's tint, which bricks and tough bricks take.
 * @returns {string | undefined}
 */
function brickArt(cell, tint) {
  if (/\d/.test(cell)) return art.tough(pal, tint, Number(cell));
  switch (cell) {
    case ".":
      return undefined;
    case "o":
      return art.brick(pal, tint);
    case "#":
      return art.steel(pal);
    case "v":
      return art.plated(pal, 2, ["bottom"]);
    case "U":
      return art.plated(pal, 2, ["left", "right", "bottom"]);
    case "S":
      return art.shell(pal, 2);
    case "M":
      return art.moss(pal, 2);
    case "N":
      return art.moss(pal, 3);
    case "-":
      return art.zapper(pal, "row");
    case "|":
      return art.zapper(pal, "column");
    case "+":
      return art.zapper(pal, "cross");
    case "x":
      return art.zapper(pal, "x");
    case "*":
      return art.bomb(pal);
    case "B":
      return art.bumper(pal);
    case "P":
      return art.prism(pal);
    case "@":
      return art.portal(pal, 1);
    case "&":
      return art.portal(pal, 2);
    case "W":
      return art.wool(pal);
    case "C":
      return art.cage(pal);
  }
  throw new Error(`no brick is drawn for "${cell}"`);
}

/**
 * Returns each row's tint, top first: the rows with bricks take the eight in
 * turn, from the wall's lowest up, as the plan's "Look" has them, and air
 * takes none.
 *
 * @param {string[]} wall Its rows, top first.
 * @returns {string[]}
 */
function tintsFromBelow(wall) {
  let next = 0;
  return [...wall]
    .reverse()
    .map((row) =>
      /^\.+$/.test(row) ? "" : art.TINT_NAMES[next++ % art.TINT_NAMES.length],
    )
    .reverse();
}

/**
 * Each brick drawn so far, by its kind and tint, as the id of the symbol it
 * is drawn in and the drawing. A file draws each brick it shows once, in its
 * `<defs>`, and places it as often as it likes, which keeps a mock a tenth
 * of the size.
 *
 * @type {Map<string, { id: string, drawn: string }>}
 */
const SYMBOLS = new Map();

/**
 * Places a brick drawn in the art's 100-unit square, as a symbol drawn once.
 *
 * @param {string} key What tells it apart from every other brick.
 * @param {() => string} draw
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @returns {string}
 */
function useBrick(key, draw, x, y, size) {
  let symbol = SYMBOLS.get(key);
  if (symbol === undefined) {
    symbol = { id: `b${SYMBOLS.size}`, drawn: draw() };
    SYMBOLS.set(key, symbol);
  }
  return `<use href="#${symbol.id}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}

/**
 * Returns the `<defs>` a file's body needs: a symbol for each brick it
 * places.
 *
 * @param {string} body
 * @returns {string}
 */
function defsFor(body) {
  const used = new Set(body.match(/(?<=href="#)b\d+/g));
  const symbols = [...SYMBOLS.values()]
    .filter(({ id }) => used.has(id))
    .map(
      ({ id, drawn }) =>
        `<symbol id="${id}" viewBox="0 0 100 100" overflow="visible">${drawn}</symbol>`,
    );
  return `<defs>${symbols.join("")}</defs>`;
}

/**
 * Draws rows of a wall, top first, each cell `cell` pixels square, from
 * (x, y).
 *
 * @param {string[]} rows
 * @param {string[]} tints
 * @param {number} x
 * @param {number} y
 * @param {number} cell
 * @returns {string}
 */
function wallRows(rows, tints, x, y, cell) {
  return rows
    .flatMap((cells, row) =>
      [...cells].map((kind, column) => {
        if (kind === ".") return "";
        return useBrick(
          `${kind}${tints[row]}`,
          () => brickArt(kind, tints[row]) ?? "",
          x + column * cell,
          y + row * cell,
          cell,
        );
      }),
    )
    .join("");
}

// -------------------------------------------------------------- the card

const COLUMNS = 9;
const CARD = { width: 872, height: 920, pad: 32 };
const WALL_CELL = 16;
const FIELD_CELL = 28;
const TOP = 196;

/**
 * The two screens a level is shown opening on, as "The field" in the plan
 * works out for a phone of 390 by 844 and a window of 1280 by 800: the depth,
 * and the floor's band and the lintel in units.
 *
 * @typedef {object} Screen
 * @property {string} name
 * @property {string} label What the whole wall's mark for it says.
 * @property {number} depth
 * @property {number} band
 * @property {number} lintel
 * @property {number} x Where its field is drawn on the card.
 *
 * @type {Screen[]}
 */
const SCREENS = [
  {
    name: "A phone held upright",
    label: "phone",
    depth: 17,
    band: 1.1,
    lintel: 0.9,
    x: 300,
  },
  {
    name: "A wide window",
    label: "wide",
    depth: 11,
    band: 0.625,
    lintel: 0.5,
    x: 588,
  },
];

/**
 * Wraps a group of drawings, moved to (x, y).
 *
 * @param {number} x
 * @param {number} y
 * @param {string} body
 * @returns {string}
 */
function at(x, y, body) {
  return `<g transform="translate(${x} ${y})">${body}</g>`;
}

/**
 * Draws the whole wall, top row first, and where the ceiling of each screen
 * cuts it as the level opens: what is under a ceiling is in play, and what
 * is over it waits.
 *
 * @param {string[]} wall
 * @param {string[]} tints
 * @returns {string}
 */
function wallPanel(wall, tints) {
  const width = COLUMNS * WALL_CELL;
  const height = wall.length * WALL_CELL;
  /** @type {string[]} */
  const out = [
    art.text(0, -14, `The whole wall, ${wall.length} rows`, {
      size: 14,
      weight: 700,
      fill: pal.text,
    }),
    art.rect(0, 0, width, height, { fill: pal.field }),
    wallRows(wall, tints, 0, 0, WALL_CELL),
    art.rect(0, 0, width, height, { stroke: pal.fieldLine, sw: 1.5 }),
  ];
  for (const { depth, label } of SCREENS) {
    const shown = 2 * art.jumpRows(depth);
    const y = height - shown * WALL_CELL;
    out.push(
      art.dashedLine(width + 16, y, 6, 4, { stroke: pal.accent, sw: 2 }),
      art.text(width + 22, y + 4, label, {
        size: 12,
        fill: pal.accent,
      }),
      art.text(width + 22, y + 18, `${wall.length - shown} wait`, {
        size: 11,
        fill: pal.muted,
      }),
    );
  }
  out.push(
    art.text(0, height + 20, "Lowest row: the first in", {
      size: 12,
      fill: pal.muted,
    }),
  );
  return out.join("");
}

/**
 * Draws a level as it opens on a screen's field: its wall's lowest rows from
 * the ceiling down to the row a jump leaves it on, the rest waiting over the
 * ceiling, the jump line, the danger line and the fuzzball on the floor,
 * ready.
 *
 * @param {string[]} wall
 * @param {string[]} tints
 * @param {Screen} screen
 * @returns {string}
 */
function openingField(
  wall,
  tints,
  { name, depth, band: bandUnits, lintel: lintelUnits },
) {
  const cell = FIELD_CELL;
  const k = cell / 40;
  const jump = art.jumpRows(depth);
  const shown = 2 * jump;
  const width = COLUMNS * cell;
  const lintel = Math.round(lintelUnits * cell);
  const deep = depth * cell;
  const band = Math.round(bandUnits * cell);
  const wash = { fill: art.mix(pal.field, pal.text, 0.13) };
  /** @type {string[]} */
  const out = [
    art.text(0, -14, `${name}, 9 × ${depth}`, {
      size: 14,
      weight: 700,
      fill: pal.text,
    }),
    art.rect(0, 0, width, lintel, wash),
    art.rect(0, lintel, width, deep, { fill: pal.field }),
    art.rect(0, lintel + deep, width, band, wash),
  ];
  for (let column = 1; column < COLUMNS; column++) {
    for (let row = 1; row < depth; row++) {
      out.push(
        art.circle(column * cell, lintel + row * cell, 1.1 * k, {
          fill: pal.fieldLine,
        }),
      );
    }
  }
  out.push(
    wallRows(wall.slice(-shown), tints.slice(-shown), 0, lintel, cell),
    art.dashedLine(width, lintel + jump * cell, 14 * k, 8 * k, {
      stroke: pal.accent,
      sw: 2.4 * k,
    }),
    art.dashedLine(width, lintel + deep - cell, 8 * k, 6 * k, {
      stroke: pal.danger,
      sw: 2 * k,
    }),
  );

  // The lintel says how much of the wall waits over the ceiling.
  const middle = lintel / 2;
  const words = `${wall.length - shown} rows waiting`;
  const left = width / 2 - 52;
  out.push(
    ...[-2.5, 2.5].map((dy) =>
      art.polyline(
        [
          [left, middle + dy + 2],
          [left + 4, middle + dy - 2],
          [left + 8, middle + dy + 2],
        ],
        { stroke: pal.muted, sw: 1.6 },
      ),
    ),
    art.text(left + 15, middle + 4, words, { size: 11.5, fill: pal.text }),
  );

  // The fuzzball on the floor, in the middle, before the first shot.
  const ball = [width / 2, lintel + deep - 0.35 * cell];
  out.push(
    art.place(
      art.fuzzball(pal.accent),
      ball[0] - art.FUZZ.body.cx * k,
      ball[1] - art.FUZZ.body.cy * k,
      32 * k,
      32,
    ),
    art.rect(0, 0, width, lintel + deep + band, {
      stroke: pal.fieldLine,
      sw: 2,
    }),
    art.text(
      0,
      lintel + deep + band + 22,
      `Opens on row ${depth - shown}; a jump is ${jump} rows`,
      { size: 12, fill: pal.muted },
    ),
  );
  return out.join("");
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
    art.text(0, 0, "In this wall", { size: 14, weight: 700, fill: pal.text }),
  ];
  const across = 5;
  const chip = { width: 156, height: 44, gap: 6 };
  kinds.forEach(({ kind, count, fresh }, i) => {
    const x = (i % across) * (chip.width + chip.gap);
    const y = 14 + Math.floor(i / across) * (chip.height + chip.gap);
    const entry = art.KINDS.find(
      (/** @type {{ id: string }} */ k) => k.id === kind,
    );
    out.push(
      art.rect(x, y, chip.width, chip.height, {
        rx: 8,
        fill: pal.field,
        stroke: fresh ? pal.accent : pal.fieldLine,
        sw: fresh ? 2 : 1,
      }),
      useBrick(kind, () => entry.draw(pal), x + 8, y + 7, 30),
      art.text(x + 46, y + 19, entry.name, {
        size: 12.5,
        weight: 700,
        fill: pal.text,
      }),
      art.text(x + 46, y + 35, fresh ? `${count}, new here` : `${count}`, {
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
 * @param {Numbered} numbered
 * @param {Set<string>} seen The kinds the levels before it use.
 * @returns {string}
 */
function card({ number, level, set, inSet, builtAround }, seen) {
  const wall = level.bricks;
  const tints = tintsFromBelow(wall);
  const cells = wall.join("").replaceAll(".", "");
  const needed = [...cells].filter((c) => hitsOf(c) > 0);
  const hits = needed.reduce((sum, c) => sum + hitsOf(c), 0);
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const c of cells) {
    counts.set(kindOf(c), (counts.get(kindOf(c)) ?? 0) + 1);
  }
  /** @type {KindCount[]} */
  const kinds = art.KINDS.map((/** @type {{ id: string }} */ k) => k.id)
    .filter((/** @type {string} */ kind) => counts.has(kind))
    .map((/** @type {string} */ kind) => ({
      kind,
      count: counts.get(kind) ?? 0,
      fresh: !seen.has(kind),
    }));

  const hot = level.boon === "hot";
  const boon = hot ? "Hot shot" : "Triple shot";
  const boonArt = hot ? art.hotShot(pal) : art.tripleShot(pal);
  /** @type {string[]} */
  const out = [
    art.rect(0, 0, CARD.width, CARD.height, {
      rx: 18,
      fill: pal.page,
      stroke: pal.fieldLine,
      sw: 2,
    }),
    art.text(CARD.pad, 52, `${number}`, {
      size: 38,
      weight: 800,
      fill: pal.accent,
    }),
    art.text(CARD.pad + String(number).length * 23 + 14, 52, level.name, {
      size: 30,
      weight: 800,
      fill: pal.text,
    }),
    art.text(CARD.width - CARD.pad, 50, `${set} · ${inSet} of 9`, {
      size: 14,
      fill: pal.muted,
      anchor: "end",
    }),
    art.text(CARD.pad, 84, builtAround, { size: 16, fill: pal.muted }),
  ];

  // The figures, as chips, and the boon its jumps give.
  const chips = [
    `${wall.length} rows`,
    `${needed.length} bricks`,
    `${hits} hits`,
  ];
  let x = CARD.pad;
  for (const words of chips) {
    const width = 18 + words.length * 7.6;
    out.push(
      art.rect(x, 104, width, 32, { rx: 16, fill: pal.field }),
      art.text(x + width / 2, 125, words, {
        size: 13.5,
        weight: 700,
        fill: pal.text,
        anchor: "middle",
      }),
    );
    x += width + 8;
  }
  out.push(
    art.rect(x, 104, hot ? 170 : 204, 32, { rx: 16, fill: pal.warning }),
    art.place(boonArt, x + (hot ? 8 : 14), 104, 30, 32),
    art.text(x + (hot ? 44 : 56), 125, `Boon: ${boon}`, {
      size: 13.5,
      weight: 700,
      fill: pal.page,
    }),
  );

  out.push(at(CARD.pad, TOP, wallPanel(wall, tints)));
  for (const screen of SCREENS) {
    out.push(at(screen.x, TOP, openingField(wall, tints, screen)));
  }
  out.push(at(CARD.pad, 800, kindsPanel(kinds)));
  for (const { kind } of kinds) seen.add(kind);
  return out.join("");
}

// ------------------------------------------------------------- the files

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
  const levels = readLevels();
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Map<string, string[]>} */
  const bySet = new Map();
  for (const numbered of levels) {
    const body = card(numbered, seen);
    const name = `Level ${numbered.number}, ${numbered.level.name}`;
    write(
      `levels/${String(numbered.number).padStart(2, "0")}-${numbered.level.id}.svg`,
      art.svgFile(
        CARD.width,
        CARD.height,
        `Brick Fuzz Pop mock: ${name}, as it opens`,
        defsFor(body) + body,
      ),
    );
    bySet.set(numbered.setId, [...(bySet.get(numbered.setId) ?? []), body]);
  }

  const gap = 24;
  const head = 96;
  for (const setId of SETS) {
    const cards = bySet.get(setId) ?? [];
    const first = levels.find((l) => l.setId === setId);
    const width = 3 * CARD.width + 4 * gap;
    const height = head + 3 * CARD.height + 4 * gap;
    const body = [
      art.rect(0, 0, width, height, { fill: pal.panel }),
      art.text(
        gap,
        62,
        `Brick Fuzz Pop: ${first?.set}, levels ${first?.number} to ${(first?.number ?? 0) + 8}`,
        { size: 40, weight: 800, fill: pal.text },
      ),
      art.text(
        width - gap,
        60,
        "Midnight blue · each level as it opens, on a phone and in a wide window",
        { size: 20, fill: pal.muted, anchor: "end" },
      ),
      ...cards.map((c, i) =>
        at(
          gap + (i % 3) * (CARD.width + gap),
          head + gap + Math.floor(i / 3) * (CARD.height + gap),
          c,
        ),
      ),
    ].join("");
    write(
      `${setId}.svg`,
      art.svgFile(
        width,
        height,
        `Brick Fuzz Pop mocks: the ${first?.set} set, each level as it opens`,
        defsFor(body) + body,
      ),
    );
  }
}

main();
