// The field sheet of the Brick Breaker uplift's art: a wide window as the
// plan lays it out, at its real size, a panel either side of the field; the
// same window as it is now; a phone held upright; and a phone on its side.
// All four show the same moment of level 9, Rocket.

import { kit } from "./kit.mjs";
import { gameLevel } from "./levels.mjs";
import { benchPanel, playPanel } from "./panels.mjs";
import { backdrop, fieldScene, gameBar } from "./scene.mjs";
import { MARGIN, SHEET_WIDTH, callout, lines } from "./sheets.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */
/** @typedef {import("./scene.mjs").FieldSpec} FieldSpec */

const { rect, text, circle, num } = kit;

const rocket = gameLevel("rocket");
const castle = gameLevel("castle");

/** The bricks of Rocket the moment has broken, by "row,column". */
const BROKEN = Object.fromEntries(
  [
    "12,4",
    "12,6",
    "11,4",
    "11,6",
    "11,1",
    "10,1",
    "10,2",
    "9,2",
    "10,4",
    "10,5",
    "9,4",
  ].map((place) => [place, null]),
);

/**
 * Returns the moment every mock shows, on a field of a height.
 *
 * @param {number} u
 * @param {number} height
 * @param {boolean} old
 * @returns {FieldSpec}
 */
function moment(u, height, old) {
  const lift = height - 30;
  return {
    u,
    height,
    old,
    rows: rocket.bricks,
    tints: rocket.tints,
    place: "playroom",
    states: { ...BROKEN, "8,3": { kind: "tough", hits: 1 } },
    paddle: { x: 10.4, mode: "laser" },
    net: true,
    tags: [
      { id: "laser", share: 0.66 },
      { id: "net", share: 1 },
    ],
    balls: [
      {
        x: 9.3,
        y: 13.4,
        step: 2,
        trail: [
          [7.5, 15.7],
          [8, 15.1],
          [8.45, 14.5],
          [8.9, 13.9],
        ],
      },
    ],
    shards: [{ x: 9, y: 12.5, tint: "pink" }],
    capsules: [{ x: 17.4, y: 19.5 + lift * 0.4, id: "multi" }],
    bolts: [
      { x: 8.8, y: 21 + lift },
      { x: 12, y: 21 + lift },
    ],
    popups: old ? [] : [{ x: 12.6, y: 15.4, words: "×3" }],
  };
}

/** What the panels say at that moment. */
const BENCH = {
  number: 9,
  name: "Rocket",
  set: "Basics",
  inSet: 9,
  setSize: 10,
  stars: [true, true, false],
  mark: 15,
  lives: 2,
  next: {
    number: 10,
    name: castle.name,
    rows: castle.bricks,
    tints: castle.tints,
  },
  best: "best 9,300",
};

const PLAY = {
  streak: 13,
  effects: [
    { id: "laser", share: 0.66, left: "8 s" },
    { id: "net", share: 1, left: "ready" },
  ],
  rows: rocket.bricks,
  falls: ["wide", "multi", "slow", "life", "catch", "net", "laser"],
};

/**
 * Draws a window's frame: its edge and the three dots of its title bar.
 *
 * @param {Palette} pal
 * @param {number} w
 * @param {number} h The window's height, under the title bar.
 * @returns {string}
 */
function windowFrame(pal, w, h) {
  return (
    rect(0, -26, w, h + 26, {
      rx: 12,
      fill: pal.page,
      stroke: pal.fieldLine,
      sw: 2,
    }) +
    [16, 32, 48].map((x) => circle(x, -13, 4, { fill: pal.fieldLine })).join("")
  );
}

/**
 * Draws a wide window, 1280 by 720: the bar, and under it the field, alone
 * as it is now or, as the plan has it, on its backdrop between two panels.
 *
 * @param {Palette} pal
 * @param {boolean} old
 * @returns {string}
 */
function wideWindow(pal, old) {
  const w = 1280;
  const h = 720;
  const u = 20;
  const bar = gameBar(pal, w - 48, {
    level: "9",
    score: "12,450",
    lives: 3,
    ...(old ? {} : { times: "×3" }),
  });
  const field = fieldScene(pal, moment(u, 30, old));
  const fieldX = (w - field.width) / 2;
  const fieldY =
    12 + bar.height + 12 + (h - 24 - bar.height - 12 - field.height) / 2;
  /** @type {string[]} */
  const out = [windowFrame(pal, w, h)];
  if (!old) {
    out.push(
      `<clipPath id="stage"><rect x="1" y="${12 + bar.height + 6}" width="${w - 2}" height="${h - bar.height - 19}" rx="10"/></clipPath>`,
      `<g clip-path="url(#stage)">${backdrop(pal, "playroom", 0, 0, w, h, 84, pal.page, 0.055)}</g>`,
    );
  }
  out.push(`<g transform="translate(24 12)">${bar.svg}</g>`);
  if (!old) {
    const panelW = 320;
    out.push(
      `<g transform="translate(${num(fieldX - 12 - panelW - field.rim)} ${num(fieldY)})">${benchPanel(pal, panelW, field.height, BENCH)}</g>`,
      `<g transform="translate(${num(fieldX + field.width + 12 + field.rim)} ${num(fieldY)})">${playPanel(pal, panelW, field.height, PLAY)}</g>`,
    );
  }
  out.push(
    `<g transform="translate(${num(fieldX)} ${num(fieldY)})">${field.svg}</g>`,
  );
  return out.join("\n");
}

/**
 * Draws a phone held upright, 390 by 844: the bar over a field 45 units
 * tall, with a finger's room under it.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function phoneUpright(pal) {
  const w = 390;
  const h = 844;
  const u = 14;
  const bar = gameBar(pal, w - 16, {
    level: "9",
    score: "12,450",
    lives: 3,
    times: "×3",
    compact: true,
  });
  const field = fieldScene(pal, moment(u, 45, false));
  const fieldX = (w - field.width) / 2;
  const fieldY = 8 + bar.height + 14;
  return [
    rect(-12, -12, w + 24, h + 24, {
      rx: 44,
      fill: pal.page,
      stroke: pal.fieldLine,
      sw: 3,
    }),
    `<clipPath id="upright"><rect x="0" y="0" width="${w}" height="${h}" rx="32"/></clipPath>`,
    `<g clip-path="url(#upright)">${backdrop(pal, "playroom", 0, 0, w, h, 84, pal.page, 0.055)}</g>`,
    `<g transform="translate(8 8)">${bar.svg}</g>`,
    `<g transform="translate(${num(fieldX)} ${num(fieldY)})">${field.svg}</g>`,
    text(w / 2, fieldY + field.height + 40, "a finger's room, 64 px", {
      size: 12,
      fill: pal.muted,
      anchor: "middle",
    }),
  ].join("\n");
}

/**
 * Draws a phone on its side, 844 by 390: the bar over a field 30 units
 * tall, with a short panel either side.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function phoneOnSide(pal) {
  const w = 844;
  const h = 390;
  const u = 10;
  const bar = gameBar(pal, w - 88, {
    level: "9",
    score: "12,450",
    lives: 3,
    compact: true,
  });
  const field = fieldScene(pal, moment(u, 30, false));
  const fieldX = (w - field.width) / 2;
  const fieldY = 8 + bar.height + 12;
  const panelW = 228;
  return [
    rect(-12, -12, w + 24, h + 24, {
      rx: 44,
      fill: pal.page,
      stroke: pal.fieldLine,
      sw: 3,
    }),
    `<clipPath id="side"><rect x="0" y="0" width="${w}" height="${h}" rx="32"/></clipPath>`,
    `<g clip-path="url(#side)">${backdrop(pal, "playroom", 0, 0, w, h, 84, pal.page, 0.055)}</g>`,
    `<g transform="translate(44 8)">${bar.svg}</g>`,
    `<g transform="translate(${num(fieldX - 12 - panelW - field.rim)} ${num(fieldY)})">${benchPanel(pal, panelW, field.height, BENCH)}</g>`,
    `<g transform="translate(${num(fieldX + field.width + 12 + field.rim)} ${num(fieldY)})">${playPanel(pal, panelW, field.height, PLAY)}</g>`,
    `<g transform="translate(${num(fieldX)} ${num(fieldY)})">${field.svg}</g>`,
  ].join("\n");
}

/**
 * Draws the field sheet.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
export function fieldSheet() {
  const pal = kit.DARK;
  const height = 1940;
  /** @type {string[]} */
  const out = [
    rect(0, 0, SHEET_WIDTH, height, { fill: "#0b1420" }),
    text(MARGIN, 62, "Brick Breaker uplift: the field in play", {
      size: 34,
      weight: 700,
      fill: pal.text,
    }),
    text(
      MARGIN,
      92,
      "Midnight blue · one moment of level 9, Rocket, in four windows. The field keeps its shape, 26 units by 30, and a wide window fills the room beside it.",
      {
        size: 15,
        fill: pal.muted,
      },
    ),
  ];

  // The wide window as the plan has it, at its real size.
  const wideX = (SHEET_WIDTH - 1280) / 2;
  const wideY = 190;
  out.push(
    text(
      wideX,
      wideY - 44,
      "After: a wide window, 1280 × 720, at its real size",
      {
        size: 18,
        weight: 700,
        fill: pal.text,
      },
    ),
    `<g transform="translate(${wideX} ${wideY})">${wideWindow(pal, false)}</g>`,
  );
  // Each callout's line ends at the edge of the panel it names.
  const leftEdge = wideX + 46;
  const rightEdge = wideX + 1234;
  /** @type {[number, number, number, number, string[], "start" | "end"][]} */
  const marks = [
    [
      wideX - 14,
      wideY + 140,
      leftEdge,
      wideY + 140,
      ["the level, its set", "and how far in"],
      "end",
    ],
    [
      wideX - 14,
      wideY + 265,
      leftEdge,
      wideY + 265,
      ["three stars,", "each its own"],
      "end",
    ],
    [
      wideX - 14,
      wideY + 400,
      leftEdge,
      wideY + 400,
      ["the bench: the", "lives that wait"],
      "end",
    ],
    [
      wideX - 14,
      wideY + 560,
      leftEdge,
      wideY + 560,
      ["the level", "after this one"],
      "end",
    ],
    [
      wideX - 14,
      wideY + 690,
      wideX + 24,
      wideY + 704,
      ["the place's", "pattern, on", "the page too"],
      "end",
    ],
    [
      wideX + 1294,
      wideY + 175,
      rightEdge,
      wideY + 175,
      ["the streak, read", "at a glance"],
      "start",
    ],
    [
      wideX + 1294,
      wideY + 320,
      rightEdge,
      wideY + 320,
      ["the effects in", "play, each ring", "emptying"],
      "start",
    ],
    [
      wideX + 1294,
      wideY + 455,
      rightEdge,
      wideY + 455,
      ["the kinds in", "this level"],
      "start",
    ],
    [
      wideX + 1294,
      wideY + 548,
      rightEdge,
      wideY + 548,
      ["the capsules", "that fall here"],
      "start",
    ],
  ];
  for (const [fx, fy, tx, ty, words, anchor] of marks) {
    out.push(callout(pal, [fx, fy], [tx, ty], words, anchor));
  }

  // The same window as it is now, a phone upright and a phone on its side.
  const rowY = 1040;
  const k = 0.5;
  out.push(
    text(MARGIN, rowY - 44, "Now: the same window", {
      size: 18,
      weight: 700,
      fill: pal.text,
    }),
    text(
      MARGIN,
      rowY - 24,
      "The field is 41% of the window's width, and nothing stands beside it.",
      {
        size: 13,
        fill: pal.muted,
      },
    ),
    `<g transform="translate(${MARGIN} ${rowY + 13}) scale(${k})">${wideWindow(pal, true)}</g>`,
  );
  const sideY = rowY + 480;
  const sk = 0.76;
  out.push(
    text(MARGIN, sideY - 44, "After: a phone on its side, 844 × 390", {
      size: 18,
      weight: 700,
      fill: pal.text,
    }),
    text(
      MARGIN,
      sideY - 24,
      "A unit is 10 px. The panels are short ones: the stars, the bench, the streak and the rings.",
      {
        size: 13,
        fill: pal.muted,
      },
    ),
    `<g transform="translate(${MARGIN + 10} ${sideY + 10}) scale(${sk})">${phoneOnSide(pal)}</g>`,
  );
  const phoneX = 800;
  const pk = 0.94;
  out.push(
    text(phoneX, rowY - 44, "After: a phone held upright, 390 × 844", {
      size: 18,
      weight: 700,
      fill: pal.text,
    }),
    text(phoneX, rowY - 24, "No panel: the field is 45 units tall, as now.", {
      size: 13,
      fill: pal.muted,
    }),
    `<g transform="translate(${phoneX + 12} ${rowY + 12}) scale(${pk})">${phoneUpright(pal)}</g>`,
  );
  const notesX = 1230;
  out.push(
    text(notesX, rowY + 30, "What a narrow room keeps", {
      size: 16,
      weight: 700,
      fill: pal.text,
    }),
    lines(
      notesX,
      rowY + 58,
      [
        "Where no panel shows, what",
        "they say is said elsewhere:",
        "",
        "· the bar has the score and",
        "  the lives (the level and",
        "  the streak from 1200 px);",
        "· the rings under the paddle",
        "  time the effects, as now;",
        "· the ball's fur and a count",
        "  beside it show the streak;",
        "· the Ready card names the",
        "  level's stars and its new",
        "  kind of brick;",
        "· How to play has every kind.",
        "",
        "The panels take no pointer,",
        "so the mouse steers over",
        "them, and a finger can drag",
        "from them.",
      ],
      { size: 13.5, fill: pal.muted, leading: 20 },
    ),
  );
  return { width: SHEET_WIDTH, height, body: out.join("\n") };
}
