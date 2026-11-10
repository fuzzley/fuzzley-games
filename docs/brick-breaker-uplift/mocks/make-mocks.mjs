#!/usr/bin/env node
// Draws the level mocks of the Brick Breaker uplift: the levels the plan
// redraws, each beside what the game has now and how the autopilot played
// both, and a sheet for each set the plan adds.
//
//   node docs/brick-breaker-uplift/mocks/make-mocks.mjs
//
// It reads the drafts in ../levels/ and draws them with the art in ../art/,
// so a level changed there is redrawn here. Nothing in it is random, so two
// runs write the same bytes.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { kit } from "../art/kit.mjs";
import {
  GAME_SETS,
  asksOf,
  draftSet,
  gameLevel,
  readReport,
} from "../art/levels.mjs";
import { KIND_WORDS, playPanel } from "../art/panels.mjs";
import { CAPSULES, PLACES, backdrop, fieldScene } from "../art/scene.mjs";
import { still } from "../art/sheet-kit.mjs";
import { CONTENT, MARGIN, SHEET_WIDTH, band, lines } from "../art/sheets.mjs";

/** @import { LevelData, Played, SetData } from "../art/levels.mjs" */
/** @import { Palette } from "../art/kit.mjs" */
/** @import { FieldSpec } from "../art/scene.mjs" */

const { text, rect, num } = kit;
const here = import.meta.dirname;

/**
 * Breaks words into lines no longer than a count of characters.
 *
 * @param {string} words
 * @param {number} most
 * @returns {string[]}
 */
function wrap(words, most) {
  /** @type {string[]} */
  const out = [];
  let row = "";
  for (const word of words.split(" ")) {
    if (row && row.length + 1 + word.length > most) {
      out.push(row);
      row = word;
    } else {
      row = row ? `${row} ${word}` : word;
    }
  }
  if (row) out.push(row);
  return out;
}

/**
 * Returns a set of drafts, which the mocks can't be drawn without.
 *
 * @param {string} id
 * @returns {SetData}
 */
function drafts(id) {
  const set = draftSet(id);
  if (!set) throw new Error(`No drafts at ../levels/${id}.json`);
  return set;
}

// ---------------------------------------------------- the redrawn levels

const BEFORE = readReport("report-before.txt");
const AFTER = readReport("report-after.txt");
const SPEEDS = /** @type {const} */ (["relaxed", "normal", "fast"]);

/**
 * Draws how the autopilot played a level, before and after, as a small
 * table.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {string} name The level's name.
 * @returns {string}
 */
function playedTable(pal, x, y, name) {
  /** @type {string[]} */
  const out = [
    text(x, y, "THE AUTOPILOT, 12 SEEDS", {
      size: 10.5,
      weight: 700,
      fill: pal.muted,
      spacing: 1,
    }),
  ];
  SPEEDS.forEach((speed, i) => {
    out.push(
      text(x + 118 + i * 50, y + 24, speed[0].toUpperCase() + speed.slice(1), {
        size: 11,
        fill: pal.muted,
        anchor: "end",
      }),
    );
  });
  /** @type {[string, string, Record<string, Played>, keyof Played][]} */
  const rows = [
    ["Now", "middle", BEFORE[name], "middle"],
    ["", "last 3", BEFORE[name], "last"],
    ["After", "middle", AFTER[name], "middle"],
    ["", "last 3", AFTER[name], "last"],
  ];
  rows.forEach(([when, what, played, key], r) => {
    const rowY = y + 46 + r * 20 + (r >= 2 ? 10 : 0);
    const after = r >= 2;
    out.push(
      text(x, rowY, when, { size: 12, weight: 700, fill: pal.text }),
      text(x + 40, rowY, what, { size: 11, fill: pal.muted }),
    );
    SPEEDS.forEach((speed, i) => {
      out.push(
        text(x + 118 + i * 50, rowY, played[speed][key], {
          size: 12.5,
          weight: after && key === "middle" ? 700 : 400,
          fill: played[speed][key].endsWith("!") ? pal.danger : pal.text,
          anchor: "end",
        }),
      );
    });
  });
  return out.join("");
}

/**
 * Draws the sheet of redrawn levels.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
function changesSheet() {
  const pal = kit.DARK;
  const set = drafts("revisions");
  const u = 9;
  const fw = 26 * u;
  const fh = 20 * u;
  const cardW = (CONTENT - 24) / 2;
  const cardH = 330;
  const height = 110 + 2 * (cardH + 24) + 250;
  /** @type {string[]} */
  const out = [
    band(
      pal,
      0,
      height,
      "Levels the plan redraws",
      "Brick Breaker uplift · level changes · dark palette",
    ),
    text(
      MARGIN,
      96,
      "Each as the game has it now, in the art it has now, and as the plan redraws it, in the plan's art. The times are the game's own autopilot's.",
      { size: 13, fill: pal.muted },
    ),
  ];
  set.levels.forEach((level, i) => {
    const was = gameLevel(level.id);
    const x = MARGIN + (i % 2) * (cardW + 24);
    const y = 118 + Math.floor(i / 2) * (cardH + 24);
    const before = asksOf(was);
    const after = asksOf(level);
    const place =
      PLACES[GAME_SETS.findIndex((entry) => entry.name === was.set)].id;
    out.push(
      rect(x, y, cardW, cardH, {
        rx: 14,
        fill: pal.field,
        stroke: pal.fieldLine,
        sw: 1.5,
      }),
      text(x + 16, y + 30, `${was.number}  ${level.name}`, {
        size: 17,
        weight: 700,
        fill: pal.text,
      }),
      text(
        x + 16,
        y + 52,
        `Now · ${before.needed} bricks, ${before.hits} hits`,
        {
          size: 12,
          fill: pal.muted,
        },
      ),
      text(
        x + 32 + fw,
        y + 52,
        `After · ${after.needed} bricks, ${after.hits} hits`,
        { size: 12, fill: pal.text },
      ),
      still(pal, x + 16, y + 62, fw, fh, { u, rows: was.bricks, old: true }, 0),
      still(
        pal,
        x + 32 + fw,
        y + 62,
        fw,
        fh,
        {
          u,
          rows: level.bricks,
          place,
          ...(was.tints ? { tints: was.tints } : {}),
        },
        0,
      ),
      playedTable(pal, x + 52 + 2 * fw, y + 78, level.name),
      lines(x + 16, y + 62 + fh + 26, wrap(level.why ?? "", 110), {
        size: 12.5,
        fill: pal.muted,
        leading: 18,
      }),
    );
  });

  // The two that were tried and left.
  const y = 118 + 2 * (cardH + 24);
  const small = 7;
  out.push(
    rect(MARGIN, y, CONTENT, 210, {
      rx: 14,
      fill: pal.field,
      stroke: pal.fieldLine,
      sw: 1.5,
    }),
    text(MARGIN + 16, y + 30, "Looked at, and left as they are", {
      size: 17,
      weight: 700,
      fill: pal.text,
    }),
  );
  /** @type {[string, string[]][]} */
  const left = [
    [
      "hedge-maze",
      [
        "Its last bricks take 0:46 at Normal, the longest endgame of Tricks.",
        "Three redraws were played: a row off the hedges, moss on one side",
        "of each stall, and both. None shortened the endgame at every speed,",
        "and the first lengthened it to 1:00 at Relaxed. The seeker is the",
        "better answer to it than a redraw.",
      ],
    ],
    [
      "low-bridge",
      [
        "Its middle time is 0:39 and its longest 3:03, the widest spread of",
        "the thirty. A gap in the bridge and open ends were both played:",
        "the longest fell to 1:54 and 2:27 at Relaxed, and was still three",
        "to five times the middle. Quick or slow by its first ball is the",
        "level's nature and not its drawing; the plan leaves it, and lets",
        "the stars reward the quick way.",
      ],
    ],
  ];
  left.forEach(([id, says], i) => {
    const level = gameLevel(id);
    const x = MARGIN + 16 + i * (CONTENT / 2);
    const place =
      PLACES[GAME_SETS.findIndex((entry) => entry.name === level.set)].id;
    out.push(
      still(
        pal,
        x,
        y + 46,
        26 * small,
        20 * small,
        { u: small, rows: level.bricks, place },
        0,
      ),
      text(x + 26 * small + 20, y + 62, `${level.number}  ${level.name}`, {
        size: 14,
        weight: 700,
        fill: pal.text,
      }),
      lines(x + 26 * small + 20, y + 84, says, {
        size: 12.5,
        fill: pal.muted,
        leading: 18,
      }),
    );
  });
  return { width: SHEET_WIDTH, height, body: out.join("\n") };
}

// --------------------------------------------------------- the new sets

/**
 * Describes a set's sheet: its palette, the level shown large, and the
 * moment of play that level is shown at.
 *
 * @typedef {object} SetSheet
 * @property {string} id The set's.
 * @property {Palette} pal
 * @property {number} first The number of its first level.
 * @property {string[]} adds The kinds of brick the set brings.
 * @property {string} hero The id of the level shown large.
 * @property {Omit<FieldSpec, "u" | "rows" | "tints" | "place">} moment
 * @property {{ streak: number, effects: { id: string, share: number, left: string }[], falls: string[] }} play
 * @property {string[]} says What the set is, beside the level shown large.
 */

/**
 * Returns every cell of a row as broken.
 *
 * @param {number} row
 * @returns {Record<string, null>}
 */
function rowGone(row) {
  return Object.fromEntries(
    Array.from({ length: 13 }, (_, column) => [`${row},${column}`, null]),
  );
}

const FALLS = Object.keys(CAPSULES);

/** @type {SetSheet[]} */
const SET_SHEETS = [
  {
    id: "friends",
    pal: kit.LIGHT,
    first: 31,
    adds: ["cage", "plated", "key", "gate"],
    hero: "reunion",
    moment: {
      paddle: { x: 11.4 },
      states: {
        ...rowGone(9),
        "11,1": null,
        "11,6": null,
        "11,11": null,
        "7,1": null,
        "7,3": null,
        "7,5": { kind: "cage", hits: 1 },
        "5,3": null,
        "5,4": null,
        "5,5": { kind: "tough", hits: 1 },
      },
      shards: [{ x: 7, y: 9.5, tint: "green" }],
      balls: [
        {
          x: 12.2,
          y: 10.9,
          step: 2,
          trail: [
            [10.7, 13.3],
            [11.1, 12.7],
            [11.5, 12.1],
            [11.9, 11.5],
          ],
        },
        {
          x: 8.9,
          y: 5.5,
          tint: "pink",
          trail: [
            [7.7, 7.3],
            [8.1, 6.7],
            [8.5, 6.1],
          ],
        },
        {
          x: 5.2,
          y: 11.4,
          tint: "green",
          trail: [
            [6.4, 9.9],
            [6, 10.4],
            [5.6, 10.9],
          ],
        },
      ],
      capsules: [{ x: 18.6, y: 17.2, id: "seek" }],
      popups: [{ x: 14.4, y: 12.4, words: "×3" }],
      tags: [{ id: "wide", share: 0.55 }],
    },
    play: {
      streak: 12,
      effects: [{ id: "wide", share: 0.55, left: "7 s" }],
      falls: FALLS,
    },
    says: [
      "Levels 31 to 40, in the garden. Four kinds are new, one at a time:",
      "the cage (31), the plated brick (32), and the key and its gate (33).",
      "Each is met alone, then in a level built on it, then beside the others.",
      "The ball's pace runs from 1.12 to 1.18, under the Finale's 1.2: the",
      "set asks for thought, and leaves speed to the set after it.",
    ],
  },
  {
    id: "machines",
    pal: kit.DARK,
    first: 41,
    adds: ["bumper", "slider", "portal"],
    hero: "grand-machine",
    moment: {
      paddle: { x: 15.2, mode: "laser" },
      states: {
        "9,6": null,
        "1,7": null,
        "1,8": null,
        "1,9": null,
      },
      shards: [{ x: 19, y: 3.5, tint: "orange" }],
      balls: [
        {
          x: 17.6,
          y: 2.3,
          step: 1,
          trail: [
            [14, 1.1],
            [14.9, 0.7],
            [15.8, 1.1],
            [16.7, 1.7],
          ],
        },
      ],
      bolts: [
        { x: 13.6, y: 21.2 },
        { x: 16.8, y: 21.2 },
      ],
      capsules: [{ x: 6.4, y: 16.4, id: "fast" }],
      tags: [{ id: "laser", share: 0.4 }],
    },
    play: {
      streak: 6,
      effects: [{ id: "laser", share: 0.4, left: "5 s" }],
      falls: FALLS,
    },
    says: [
      "Levels 41 to 50, in the arcade. Three kinds are new: the bumper (41),",
      "the slider (42) and the portal (43). They are the kinds that move a",
      "ball or themselves, so this is the set where the field stops being",
      "still. The pace runs from 1.16 to 1.22, the fastest of the fifty.",
    ],
  },
];

/**
 * Draws a draft level small, with its number, its name, what it teaches and
 * what it asks for.
 *
 * @param {Palette} pal
 * @param {SetData} set
 * @param {LevelData} level
 * @param {number} number
 * @param {number} x
 * @param {number} y
 * @param {number} u
 * @returns {string}
 */
function smallLevel(pal, set, level, number, x, y, u) {
  const asks = asksOf(level);
  const fw = 26 * u;
  const fh = 19 * u;
  return (
    still(
      pal,
      x,
      y,
      fw,
      fh,
      {
        u,
        rows: level.bricks,
        ...(level.tints ? { tints: level.tints } : {}),
        ...(set.place ? { place: set.place } : {}),
      },
      0,
    ) +
    text(x, y + fh + 24, `${number}  ${level.name}`, {
      size: 14.5,
      weight: 700,
      fill: pal.text,
    }) +
    lines(x, y + fh + 43, wrap(level.teaches ?? "", Math.floor(fw / 6.1)), {
      size: 11.5,
      fill: pal.muted,
      leading: 15.5,
    }) +
    text(
      x,
      y + fh + 43 + 3 * 15.5 + 4,
      `${asks.needed} bricks · ${asks.hits} hits · star at a streak of ${level.mark}`,
      { size: 11, fill: pal.muted },
    )
  );
}

/**
 * Draws a set's sheet: its last level large, at a moment of play, beside the
 * panel that names its kinds, and its other nine small.
 *
 * @param {SetSheet} sheet
 * @returns {{ width: number, height: number, body: string }}
 */
function setSheet(sheet) {
  const { pal } = sheet;
  const set = drafts(sheet.id);
  const hero = set.levels.find((level) => level.id === sheet.hero);
  if (!hero) throw new Error(`No level ${sheet.hero} in ${sheet.id}`);
  const rest = set.levels.filter((level) => level !== hero);
  const numberOf = (/** @type {LevelData} */ level) =>
    sheet.first + set.levels.indexOf(level);
  const place = PLACES.find((entry) => entry.id === set.place);
  const u = 15;
  const small = 9;
  const top = 118;
  const scene = fieldScene(pal, {
    u,
    rows: hero.bricks,
    ...(hero.tints ? { tints: hero.tints } : {}),
    ...(set.place ? { place: set.place } : {}),
    ...sheet.moment,
  });
  const panelW = 280;
  const heroW = scene.width + 2 * scene.rim + 12 + panelW;
  const secondY = top + scene.height + scene.rim + 96;
  const height = secondY + 19 * small + 130;
  /** @type {string[]} */
  const out = [
    band(
      pal,
      0,
      height,
      `${set.name}: levels ${sheet.first} to ${sheet.first + set.levels.length - 1}`,
      `Brick Breaker uplift · the ${set.name} set, as drafts · ${pal.id} palette`,
    ),
    text(
      MARGIN,
      96,
      `${place?.name ?? ""} · new: ${sheet.adds
        .map((kind) => KIND_WORDS[kind][0].toLowerCase())
        .join(", ")} · no draft is a level until the autopilot has cleared it`,
      { size: 13, fill: pal.muted },
    ),
    // The set's place, behind its last level, as a wide window shows it.
    rect(MARGIN, top, heroW + 24, scene.height + scene.rim + 24, {
      rx: 14,
      fill: pal.page,
    }),
    set.place
      ? `<clipPath id="page-${sheet.id}"><rect x="${MARGIN}" y="${top}" width="${num(heroW + 24)}" height="${num(scene.height + scene.rim + 24)}" rx="14"/></clipPath><g clip-path="url(#page-${sheet.id})">${backdrop(pal, set.place, MARGIN, top, heroW + 24, scene.height + scene.rim + 24, 64, pal.page, 0.055)}</g>`
      : "",
    `<g transform="translate(${num(MARGIN + 12 + scene.rim)} ${num(top + 12 + scene.rim)})">${scene.svg}</g>`,
    `<g transform="translate(${num(MARGIN + 12 + scene.width + 2 * scene.rim + 12)} ${num(top + 12 + scene.rim)})">${playPanel(
      pal,
      panelW,
      scene.height,
      {
        streak: sheet.play.streak,
        effects: sheet.play.effects,
        rows: hero.bricks,
        falls: sheet.play.falls,
      },
    )}</g>`,
    text(
      MARGIN,
      top + scene.height + scene.rim + 50,
      `${numberOf(hero)}  ${hero.name}`,
      { size: 16, weight: 700, fill: pal.text },
    ),
    text(MARGIN, top + scene.height + scene.rim + 70, hero.teaches ?? "", {
      size: 12.5,
      fill: pal.muted,
    }),
  ];

  // Three of the rest beside the large one, over what the set is; six under.
  const sideX = MARGIN + heroW + 24 + 36;
  const gap = (SHEET_WIDTH - MARGIN - sideX - 3 * 26 * small) / 2;
  rest.slice(0, 3).forEach((level, i) => {
    out.push(
      smallLevel(
        pal,
        set,
        level,
        numberOf(level),
        sideX + i * (26 * small + gap),
        top,
        small,
      ),
    );
  });
  out.push(
    lines(sideX, top + 19 * small + 150, sheet.says, {
      size: 13.5,
      fill: pal.text,
      leading: 21,
    }),
  );
  const wide = (CONTENT - 6 * 26 * small) / 5;
  rest.slice(3).forEach((level, i) => {
    out.push(
      smallLevel(
        pal,
        set,
        level,
        numberOf(level),
        MARGIN + i * (26 * small + wide),
        secondY,
        small,
      ),
    );
  });
  return { width: SHEET_WIDTH, height, body: out.join("\n") };
}

/**
 * Writes every mock.
 */
function main() {
  /** @type {[string, string, { width: number, height: number, body: string }][]} */
  const sheets = [
    [
      "level-changes.svg",
      "Brick Breaker uplift: the levels the plan redraws",
      changesSheet(),
    ],
    ...SET_SHEETS.map(
      (sheet) =>
        /** @type {[string, string, { width: number, height: number, body: string }]} */ ([
          `${sheet.id}.svg`,
          `Brick Breaker uplift: the ${sheet.id} set, as drafts`,
          setSheet(sheet),
        ]),
    ),
  ];
  for (const [name, title, sheet] of sheets) {
    const svg = kit.svgFile(sheet.width, sheet.height, title, sheet.body);
    writeFileSync(join(here, name), svg);
    console.log(`${name} (${svg.length} bytes)`);
  }
}

main();
