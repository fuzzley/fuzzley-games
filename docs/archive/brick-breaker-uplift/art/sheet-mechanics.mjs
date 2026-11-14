// The mechanics sheet of the Brick Breaker uplift's art: each brick the plan
// adds, the dust bunny and the seeker as a moment of play, and the rules it
// changes for every level: the streak's look and sound, the three stars, and
// a bad capsule that pays.

import { ball, key, kit, placeBall, placeBrick } from "./kit.mjs";
import { effectRing } from "./panels.mjs";
import { CAPSULES, heading, panelBox, star } from "./scene.mjs";
import { still } from "./sheet-kit.mjs";
import {
  CONTENT,
  MARGIN,
  SHEET_WIDTH,
  arrow,
  band,
  dotted,
  lines,
} from "./sheets.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */
/** @typedef {import("./scene.mjs").FieldSpec} FieldSpec */
/** @typedef {[number, number]} Point */

const { text, rect, circle, line, mix, num } = kit;

const GAP = 24;
const CARD_HEIGHT = 330;
const VIEW_HEIGHT = 200;
const BAND_HEIGHT = 110 + 3 * (CARD_HEIGHT + 34) + 30;

/**
 * Describes a moment of play a card shows.
 *
 * @typedef {object} Moment
 * @property {string} title
 * @property {string[]} says The rule, in three lines at most.
 * @property {number} u A unit, in pixels.
 * @property {number} lift How far down the field the view starts, in units.
 * @property {Omit<FieldSpec, "u">} spec
 * @property {(pal: Palette, at: (x: number, y: number) => Point, u: number) => string} [over]
 */

/**
 * Returns every gate of a row as it stands once the last key has gone.
 *
 * @param {number} row
 * @returns {Record<string, { kind: string }>}
 */
function gatesOpen(row) {
  return Object.fromEntries(
    Array.from({ length: 13 }, (_, column) => [
      `${row},${column}`,
      { kind: "gate-open" },
    ]),
  );
}

/**
 * Returns points along a curve from one point to another, bent toward a third.
 *
 * @param {Point} from
 * @param {Point} bend
 * @param {Point} to
 * @returns {Point[]}
 */
function curve(from, bend, to) {
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return /** @type {Point} */ ([
      a * from[0] + b * bend[0] + c * to[0],
      a * from[1] + b * bend[1] + c * to[1],
    ]);
  });
}

/** The seeker's way to a brick, and where along it the ball is drawn. */
const SEEKING = curve([9.5, 9.4], [15.8, 5.4], [10.7, 3.5]);
const SEEKER = SEEKING[20];

/** The moments of the first row: the bricks of the Friends set, and the portal. */
const /** @type {Moment[]} */ FIRST = [
    {
      title: "Plated brick",
      says: [
        "A ball from below is turned back and the brick takes",
        "no hit. From above or a side it breaks as any brick.",
        "The way in is up an edge, to the pocket over the wall.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: [".....ooooo...", "....uuuuuu..."],
        states: { "1,4": null },
        shards: [{ x: 9, y: 3.5, tint: "orange" }],
        balls: [
          { x: 9.1, y: 2.5 },
          { x: 15.4, y: 7.6 },
        ],
      },
      over: (pal, at) =>
        dotted([at(12, 9.4), at(14, 4.4), at(15.2, 7.2)], pal.muted) +
        dotted([at(6.8, 9.4), at(7.1, 1.1), at(8.8, 2.3)], pal.text) +
        [-0.5, 0, 0.5]
          .map((dx) =>
            line(at(14 + dx, 4.75), at(14 + dx * 1.7, 5.2), {
              stroke: pal.muted,
              sw: 2,
            }),
          )
          .join(""),
    },
    {
      title: "Cage",
      says: [
        "Two hits: the first bends a bar, the second frees a",
        "friend, a ball more in an ink of its own. A friend lost",
        "costs no life; eight balls at most are in play.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: ["...ooooooo...", ".............", "....c...c...."],
        states: { "2,4": { kind: "cage", hits: 1 }, "2,8": null },
        shards: [{ x: 17, y: 4.5, tint: "green" }],
        balls: [
          {
            x: 14.6,
            y: 7.4,
            tint: "green",
            trail: [
              [16.4, 5.3],
              [15.8, 6],
              [15.2, 6.7],
            ],
          },
          {
            x: 19.2,
            y: 6.9,
            trail: [
              [17.9, 5.4],
              [18.3, 5.9],
              [18.8, 6.4],
            ],
          },
        ],
      },
    },
    {
      title: "Key brick and gates",
      says: [
        "A gate is steel while a key is left. The hit that breaks",
        "the last key opens every gate at once, wherever they",
        "are: here, the whole wall behind the drawbridge.",
      ],
      u: 20,
      lift: 0.5,
      spec: {
        rows: [
          "...ooooooo...",
          "...ooooooo...",
          ".............",
          "=============",
          ".............",
          "....k...k....",
        ],
        states: { ...gatesOpen(3), "5,4": null, "5,8": null },
        shards: [{ x: 17, y: 7.5, tint: "amber" }],
        balls: [
          {
            x: 15.7,
            y: 6.3,
            trail: [
              [16.9, 8.4],
              [16.5, 7.7],
              [16.1, 7],
            ],
          },
        ],
      },
      // The key that has just gone, as it was.
      over: (pal, at, u) =>
        `<g opacity="0.5">${placeBrick(key(pal), ...at(16, 7), 2 * u)}</g>`,
    },
    {
      title: "Portal",
      says: [
        "A ball that touches one leaves its twin, going as it",
        "went. It then passes over portals until it has touched",
        "a brick or the paddle, so it is never sent straight back.",
      ],
      u: 20,
      lift: 0,
      spec: {
        rows: [
          "......@......",
          ".............",
          "...ooooooo...",
          "...ooooooo...",
          ".............",
          ".............",
          "......@......",
        ],
        states: { "2,8": null },
        shards: [{ x: 17, y: 4.5, tint: "amber" }],
        balls: [{ x: 16.3, y: 3.4 }],
      },
      over: (pal, at) =>
        dotted([at(10.4, 10), at(12.7, 9)], pal.text) +
        dotted([at(13, 2), at(14.2, 0.4), at(16.2, 3.2)], pal.text) +
        dotted([at(13, 7.8), at(13, 3.2)], pal.accent, 1.5, 8),
    },
  ];

/** The moments of the second row: the rest of the Machines set, and two more. */
const /** @type {Moment[]} */ SECOND = [
    {
      title: "Bumper",
      says: [
        "Round and never broken. A ball leaves it at the angle",
        "a round thing gives, which no brick does, and no faster",
        "than it came: it turns a ball, it does not kick it.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: [
          "...ooooooo...",
          "...ooooooo...",
          ".............",
          ".............",
          "......O......",
        ],
        states: { "1,6": null },
        shards: [{ x: 13, y: 3.5, tint: "orange" }],
        balls: [{ x: 13.45, y: 4.5 }],
      },
      over: (pal, at) =>
        dotted([at(17.5, 9.4), at(13.75, 6.07), at(13.48, 4.8)], pal.text),
    },
    {
      title: "Slider",
      says: [
        "The sliders of a row step a cell together, once a beat,",
        "and turn at a wall or a brick. A step waits while a ball",
        "is in its way, so no brick ever moves into a ball.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: ["...ooooooo...", ".............", "...>>>.>>...."],
        states: { "0,6": null },
        shards: [{ x: 13, y: 2.5, tint: "red" }],
        balls: [{ x: 12.95, y: 3.5 }],
      },
      over: (pal, at) =>
        dotted([at(11.2, 9.4), at(12.9, 3.8)], pal.text) +
        arrow(at(8.4, 5.8), at(10.8, 5.8), pal.muted, 2) +
        arrow(at(15.4, 5.8), at(17.8, 5.8), pal.muted, 2),
    },
    {
      title: "Dust bunny",
      says: [
        "No brick: it drifts down from the top of an Attic level.",
        "A ball bursts it and flies on unturned, and the burst",
        "counts for the streak. One the paddle meets narrows it.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: ["...ooooooo..."],
        bunnies: [
          { x: 8.2, y: 5.2 },
          { x: 17.9, y: 6.6 },
          { x: 11.2, y: 8.3 },
        ],
        balls: [
          {
            x: 15.2,
            y: 4.9,
            trail: [
              [13.1, 7.7],
              [13.6, 7],
              [14.1, 6.3],
              [14.6, 5.6],
            ],
          },
        ],
        popups: [{ x: 16.4, y: 6.3, words: "+25", size: 15 }],
      },
      over: (pal, at, u) =>
        circle(...at(14.4, 5.9), u * 0.8, {
          stroke: mix(pal.field, pal.text, 0.45),
          sw: 2,
        }) +
        arrow(at(8.2, 6.2), at(8.2, 7.4), pal.muted, 1.8) +
        arrow(at(17.9, 7.6), at(17.9, 8.8), pal.muted, 1.8),
    },
    {
      title: "Seeker",
      says: [
        "A ball that leans toward the nearest brick the level",
        "needs. A capsule gives it for 12 seconds; so does the",
        "paddle, when three bricks or fewer have outlasted it.",
      ],
      u: 22,
      lift: 0.4,
      spec: {
        rows: [
          "....o........",
          ".............",
          ".............",
          ".........o...",
        ],
        glow: [
          [0, 4],
          [3, 9],
        ],
        balls: [{ x: SEEKER[0], y: SEEKER[1] }],
      },
      over: (pal, at) =>
        dotted(
          [at(9.5, 9.4), at(16.4, 4.6)],
          mix(pal.field, pal.muted, 0.7),
          1.6,
        ) +
        dotted(
          SEEKING.slice(0, 21).map(([x, y]) => at(x, y)),
          pal.accent,
        ),
    },
  ];

/**
 * Draws a card: its box, its title and the lines under it.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {string} title
 * @param {string[]} says
 * @returns {string}
 */
function card(pal, x, y, w, title, says) {
  return (
    rect(x, y, w, CARD_HEIGHT, {
      rx: 14,
      fill: pal.field,
      stroke: pal.fieldLine,
      sw: 1.5,
    }) +
    text(x + 16, y + VIEW_HEIGHT + 46, title, {
      size: 16,
      weight: 700,
      fill: pal.text,
    }) +
    lines(x + 16, y + VIEW_HEIGHT + 70, says, {
      size: 12.5,
      fill: pal.muted,
      leading: 18,
    })
  );
}

/**
 * Draws a card that shows a moment of play.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {Moment} moment
 * @returns {string}
 */
function momentCard(pal, x, y, w, moment) {
  const { u, lift } = moment;
  const vx = x + 16;
  const vy = y + 16;
  const vw = w - 32;
  /** @type {(fx: number, fy: number) => Point} */
  const at = (fx, fy) => [
    vx + (vw - 26 * u) / 2 + fx * u,
    vy + (fy - lift) * u,
  ];
  return (
    card(pal, x, y, w, moment.title, moment.says) +
    still(
      pal,
      vx,
      vy,
      vw,
      VIEW_HEIGHT,
      { ...moment.spec, u },
      lift,
      moment.over?.(pal, at, u) ?? "",
    )
  );
}

/**
 * Draws a row's letter and what it holds.
 *
 * @param {Palette} pal
 * @param {number} y
 * @param {string} letter
 * @param {string} words
 * @returns {string}
 */
function rowHeading(pal, y, letter, words) {
  return (
    text(MARGIN, y, letter, { size: 13, weight: 700, fill: pal.text }) +
    text(MARGIN + 20, y, words, { size: 13, fill: pal.muted })
  );
}

/**
 * Draws the streak's card: the ball at each step, and the notes its bricks
 * sound.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @returns {string}
 */
function streakCard(pal, x, y, w) {
  const vx = x + 16;
  const vy = y + 16;
  const vw = w - 32;
  /** @type {string[]} */
  const out = [
    card(pal, x, y, w, "The streak, seen and heard", [
      "Bricks broken between two touches of the paddle, as now. The ball's fur",
      "lifts at each step and each brick sounds a note above the last, to a cap;",
      "the paddle brings both back down. The side panel shows the count.",
    ]),
    rect(vx, vy, vw, VIEW_HEIGHT, { rx: 10, fill: pal.page }),
  ];
  const steps = [
    ["×1", "the first bricks"],
    ["×2", "from 5 bricks"],
    ["×3", "from 10"],
    ["×4", "from 20"],
  ];
  const each = vw / steps.length;
  steps.forEach(([times, from], i) => {
    const cx = vx + each * (i + 0.5);
    for (let t = 1; t <= 2 + i * 2; t++) {
      out.push(
        circle(cx - 20 - t * 7, vy + 56 + t * 3.2, 9 - t * 0.9, {
          fill: mix(pal.page, pal.text, 0.22 - t * 0.02),
        }),
      );
    }
    out.push(
      placeBall(
        ball(pal, "normal", /** @type {0 | 1 | 2 | 3} */ (i)),
        cx,
        vy + 52,
        21,
      ),
      text(cx, vy + 106, times, {
        size: 19,
        weight: 800,
        fill: i > 0 ? pal.warning : pal.muted,
        anchor: "middle",
      }),
      text(cx, vy + 123, from, {
        size: 11.5,
        fill: pal.muted,
        anchor: "middle",
      }),
    );
  });
  // The notes: one a brick, each a step higher, capped at the fifteenth.
  const left = vx + 22;
  const span = vw - 44;
  for (let i = 0; i < 24; i++) {
    const cx = left + (span * i) / 23;
    const cy = vy + 184 - Math.min(i, 14) * 2.3;
    const lit = i >= 4;
    out.push(
      circle(cx, cy, 3.6, { fill: lit ? pal.warning : pal.muted }),
      line([cx + 3.2, cy], [cx + 3.2, cy - 11], {
        stroke: lit ? pal.warning : pal.muted,
        sw: 1.4,
      }),
    );
  }
  return out.join("");
}

/**
 * Draws the stars' card: the card a cleared level shows.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @returns {string}
 */
function starsCard(pal, x, y, w) {
  const vx = x + 16;
  const vy = y + 16;
  const vw = w - 32;
  /** @type {string[]} */
  const out = [
    card(pal, x, y, w, "Three stars a level", [
      "Clear it; clear it without losing a life; reach the streak the level sets.",
      "Each is kept for good once won, at any speed. No star gates a level: the",
      "next one opens when this one is cleared, as now.",
    ]),
    rect(vx, vy, vw, VIEW_HEIGHT, { rx: 10, fill: pal.page }),
    `<g transform="translate(${num(vx + 22)} ${num(vy + 14)})">${panelBox(pal, 0, 0, vw - 44, VIEW_HEIGHT - 28)}</g>`,
    `<g transform="translate(${num(vx + 22)} ${num(vy + 14)})">${heading(pal, 20, 30, "Level 9 cleared")}</g>`,
    text(vx + 42, vy + 74, "Rocket", { size: 24, weight: 800, fill: pal.text }),
  ];
  const stars = [
    ["Cleared", true],
    ["No life lost", true],
    ["A streak of 15", false],
  ];
  stars.forEach(([words, lit], i) => {
    const cx = vx + 64 + i * 96;
    out.push(
      star(pal, cx, vy + 112, 19, /** @type {boolean} */ (lit)),
      text(cx, vy + 148, /** @type {string} */ (words), {
        size: 11.5,
        fill: lit ? pal.text : pal.muted,
        anchor: "middle",
      }),
    );
  });
  out.push(
    text(vx + 256, vy + 162, "best 11", {
      size: 10.5,
      fill: pal.muted,
      anchor: "middle",
    }),
  );
  const right = vx + vw - 42;
  out.push(
    text(right, vy + 60, "12,450", {
      size: 22,
      weight: 800,
      fill: pal.text,
      anchor: "end",
    }),
    text(right, vy + 78, "best 13,900", {
      size: 11.5,
      fill: pal.muted,
      anchor: "end",
    }),
    rect(right - 104, vy + 98, 104, 30, { rx: 15, fill: pal.accent }),
    text(right - 52, vy + 118, "Next level", {
      size: 13,
      weight: 700,
      fill: pal.field,
      anchor: "middle",
    }),
    rect(right - 104, vy + 136, 104, 30, {
      rx: 15,
      stroke: pal.fieldLine,
      sw: 1.5,
    }),
    text(right - 52, vy + 156, "Play again", {
      size: 13,
      fill: pal.text,
      anchor: "middle",
    }),
  );
  return out.join("");
}

/**
 * Draws the card of a bad capsule that pays: one falling, and how the side
 * panel shows it in effect.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @returns {string}
 */
function dareCard(pal, x, y, w) {
  const vx = x + 16;
  const vy = y + 16;
  const vw = w - 32;
  const half = Math.round(vw * 0.44);
  const px = vx + half + 14;
  const pw = vw - half - 14;
  /** @type {string[]} */
  const out = [
    card(pal, x, y, w, "A bad capsule pays", [
      "Narrow paddle and Fast ball double what bricks pay while they last, which",
      "the gold lip says as one falls: catching it is a dare, and dodging it is",
      "free. Two at once still double. Relaxed drops neither, as now.",
    ]),
    still(
      pal,
      vx,
      vy,
      half,
      VIEW_HEIGHT,
      {
        u: 22,
        rows: [],
        paddle: { x: 12.6 },
        capsules: [{ x: 14.4, y: 24.9, id: "narrow" }],
        balls: [
          {
            x: 9.9,
            y: 23.4,
            step: 1,
            trail: [
              [11.4, 25.6],
              [10.9, 24.9],
              [10.4, 24.2],
            ],
          },
        ],
      },
      21.4,
    ),
    `<g transform="translate(${num(px)} ${num(vy)})">${panelBox(pal, 0, 0, pw, VIEW_HEIGHT)}</g>`,
    `<g transform="translate(${num(px)} ${num(vy)})">${heading(pal, 18, 30, "In play")}</g>`,
  ];
  const rows = [
    { id: "narrow", share: 0.72, left: "9 s" },
    { id: "wide", share: 0.3, left: "4 s" },
  ];
  rows.forEach((row, i) => {
    const cy = vy + 72 + i * 58;
    const bad = CAPSULES[row.id].tone === "bad";
    out.push(
      effectRing(pal, row, px + 18 + 17, cy, 17),
      text(px + 64, cy - 2, CAPSULES[row.id].name, {
        size: 14.5,
        weight: 600,
        fill: pal.text,
      }),
      text(px + 64, cy + 16, bad ? "bricks pay ×2" : "half as wide again", {
        size: 12,
        weight: bad ? 700 : 400,
        fill: bad ? pal.warning : pal.muted,
      }),
      text(px + pw - 18, cy + 5, row.left, {
        size: 13,
        fill: pal.muted,
        anchor: "end",
      }),
    );
  });
  return out.join("");
}

/**
 * Draws the mechanics sheet, in the dark palette.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
export function mechanicsSheet() {
  const pal = kit.DARK;
  /** @type {string[]} */
  const out = [
    band(
      pal,
      0,
      BAND_HEIGHT,
      "What the plan adds to play",
      "Brick Breaker uplift · mechanics · dark palette",
    ),
  ];
  const quarter = (CONTENT - 3 * GAP) / 4;
  const third = (CONTENT - 2 * GAP) / 3;
  let y = 110;
  out.push(
    rowHeading(
      pal,
      y,
      "A",
      "The Friends set's kinds, and the first of the Machines set's: each at the moment that tells its rule",
    ),
  );
  FIRST.forEach((moment, i) => {
    out.push(
      momentCard(pal, MARGIN + i * (quarter + GAP), y + 14, quarter, moment),
    );
  });
  y += CARD_HEIGHT + 34;
  out.push(
    rowHeading(
      pal,
      y,
      "B",
      "The rest of the Machines set's kinds, the Attic's dust bunny, and the seeker, which is the plan's answer to a long endgame",
    ),
  );
  SECOND.forEach((moment, i) => {
    out.push(
      momentCard(pal, MARGIN + i * (quarter + GAP), y + 14, quarter, moment),
    );
  });
  y += CARD_HEIGHT + 34;
  out.push(
    rowHeading(
      pal,
      y,
      "C",
      "What changes in every level, the thirty the game has included",
    ),
  );
  out.push(
    streakCard(pal, MARGIN, y + 14, third),
    starsCard(pal, MARGIN + third + GAP, y + 14, third),
    dareCard(pal, MARGIN + 2 * (third + GAP), y + 14, third),
  );
  return { width: SHEET_WIDTH, height: BAND_HEIGHT, body: out.join("\n") };
}
