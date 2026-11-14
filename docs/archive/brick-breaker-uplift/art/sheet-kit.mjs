// The second sheet of the Brick Breaker uplift's art: the paddle and its
// modes, the capsules, the balls and the dust bunny, and four flourishes as
// stills, each beside what the game draws now.

import { ball, dustBunny, kit, placeBall, placeBrick, plain } from "./kit.mjs";
import {
  CAPSULES,
  capsule,
  fieldScene,
  flatCapsule,
  flatPaddle,
  paddle,
} from "./scene.mjs";
import {
  CONTENT,
  MARGIN,
  SHEET_WIDTH,
  band,
  label,
  note,
  section,
} from "./sheets.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */

const { text, line, circle, mix, num } = kit;

/**
 * The paddles the sheet shows: a label, a note, a width in units and how
 * each is drawn.
 *
 * @type {[string, string, number, (pal: Palette) => string][]}
 */
const PADDLES = [
  ["Now", "a plain pill", 4, (pal) => flatPaddle(pal, 4)],
  ["The paddle", "a pad, a lip, two caps", 4, (pal) => paddle(pal, 4)],
  ["Catch", "velcro: fuzz sticks to it", 4, (pal) => paddle(pal, 4, "catch")],
  ["Laser", "a cannon at each end", 4, (pal) => paddle(pal, 4, "laser")],
  ["Wide", "6 units", 6, (pal) => paddle(pal, 6)],
  ["Narrow", "2.6 units", 2.6, (pal) => paddle(pal, 2.6)],
];

/**
 * The balls the sheet shows.
 *
 * @type {[string, string, (pal: Palette) => string][]}
 */
const BALLS = [
  ["The ball", "the site's fuzzball", (pal) => ball(pal)],
  ["Streak ×2", "its fur lifts", (pal) => ball(pal, "normal", 1)],
  ["Streak ×3", "stands out", (pal) => ball(pal, "normal", 2)],
  ["Streak ×4", "on end, sparking", (pal) => ball(pal, "normal", 3)],
  ["Fire ball", "under a crown of flame", (pal) => ball(pal, "fire")],
  ["Blast ball", "red, sparking", (pal) => ball(pal, "blast")],
  [
    "A friend",
    "freed from a cage",
    (pal) => ball(pal, "normal", 0, pal.tints.pink),
  ],
  [
    "A friend",
    "each its own ink",
    (pal) => ball(pal, "normal", 0, pal.tints.green),
  ],
  ["A friend", "", (pal) => ball(pal, "normal", 0, pal.tints.amber)],
  ["Dust bunny", "no ball: it drifts", dustBunny],
];

const BAND_HEIGHT = 1276;

/**
 * Draws a still of a flourish: a strip of field, clipped to a box.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {import("./scene.mjs").FieldSpec} spec
 * @param {number} lift How far up the field is moved, in units, so its foot shows.
 * @param {string} [over] What is drawn over the field, in the still's own pixels.
 * @returns {string}
 */
export function still(pal, x, y, w, h, spec, lift, over = "") {
  const scene = fieldScene(pal, { ...spec, bare: true });
  const id = `still-${num(x)}-${num(y)}`;
  return (
    `<clipPath id="${id}"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="10"/></clipPath>` +
    `<g clip-path="url(#${id})">` +
    kit.rect(x, y, w, h, { fill: pal.field }) +
    `<g transform="translate(${num(x + (w - scene.width) / 2)} ${num(y - lift * spec.u)})">${scene.svg}</g>` +
    over +
    "</g>" +
    kit.rect(x, y, w, h, { rx: 10, stroke: pal.fieldLine, sw: 1.5 })
  );
}

/**
 * Draws the sheet in one palette.
 *
 * @param {Palette} pal
 * @param {number} top
 * @returns {string}
 */
function bandOf(pal, top) {
  /** @type {string[]} */
  const out = [
    band(
      pal,
      top,
      BAND_HEIGHT,
      pal.name,
      `Brick Breaker uplift · the paddle, the capsules and the balls · ${pal.id} palette`,
    ),
  ];
  const left = MARGIN;

  // A: the paddle.
  let y = top + 110;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      190,
      "A",
      "The paddle: as the game draws it now, and the plan's, in each mode and at each width, at 50 px a unit",
    ),
  );
  const k = 0.5;
  const gap =
    (CONTENT - PADDLES.reduce((sum, [, , w]) => sum + w * 100 * k, 0)) /
    (PADDLES.length + 1);
  let x = left + gap;
  for (const [name, says, width, draw] of PADDLES) {
    const w = width * 100 * k;
    out.push(
      `<g transform="translate(${num(x)} ${num(y + 72)}) scale(${k})">${draw(pal)}</g>`,
      label(pal, x + w / 2, y + 146, name, 14),
      note(pal, x + w / 2, y + 166, says),
    );
    x += w + gap;
  }

  // B: the capsules.
  y += 246;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      262,
      "B",
      "The capsules: the game's eleven and the one the plan adds, as they are now and as the plan draws them; a gold lip marks one that pays double",
    ),
  );
  const ids = Object.keys(CAPSULES);
  const step = (CONTENT - 80) / ids.length;
  out.push(
    text(left + 20, y + 68, "NOW", {
      size: 11,
      weight: 700,
      fill: pal.muted,
      spacing: 1.1,
    }),
    text(left + 20, y + 132, "AFTER", {
      size: 11,
      weight: 700,
      fill: pal.muted,
      spacing: 1.1,
    }),
    text(left + 20, y + 184, "IN PLAY", {
      size: 11,
      weight: 700,
      fill: pal.muted,
      spacing: 1.1,
    }),
  );
  ids.forEach((id, i) => {
    const info = CAPSULES[id];
    const cx = left + 80 + i * step + step / 2;
    const big = 0.56;
    out.push(
      info.added
        ? note(pal, cx, y + 68, "new")
        : `<g transform="translate(${num(cx - 80 * big)} ${num(y + 42)}) scale(${big})">${flatCapsule(pal, id)}</g>`,
      `<g transform="translate(${num(cx - 80 * big)} ${num(y + 106)}) scale(${big})">${capsule(pal, id)}</g>`,
      `<g transform="translate(${num(cx - 15.2)} ${num(y + 172)}) scale(0.19)">${capsule(pal, id)}</g>`,
      label(pal, cx, y + 224, info.name, 12.5),
      note(pal, cx, y + 242, info.about, 10.5),
    );
  });

  // C: the balls.
  y += 318;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      196,
      "C",
      "The balls: the fuzzball, its fur by the streak, the two kinds a capsule makes it, the friends a cage frees, and the dust bunny",
    ),
  );
  const ballStep = CONTENT / BALLS.length;
  BALLS.forEach(([name, says, draw], i) => {
    const cx = left + i * ballStep + ballStep / 2;
    out.push(
      placeBall(draw(pal), cx - 12, y + 84, 27),
      placeBall(draw(pal), cx + 44, y + 104, 5.4),
      label(pal, cx, y + 150, name, 14),
      note(pal, cx, y + 170, says),
    );
  });

  // D: flourishes, as stills.
  y += 252;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      300,
      "D",
      "Flourishes, as stills, each only where motion is welcome",
    ),
  );
  const w = (CONTENT - 5 * 24) / 4;
  const h = 196;
  const u = 26;
  const sy = y + 38;
  /** @type {(i: number) => number} */
  const sx = (i) => left + 24 + i * (w + 24);

  // 1: a level's bricks drop in, a row after a row.
  /** @type {string[]} */
  const falling = [];
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 7; column++) {
      const late = column + row * 2.5 - 2;
      const lift = late <= 0 ? 0 : late * late * 2.4;
      const bx = sx(0) + (w - 14 * u) / 2 + column * 2 * u;
      const by = sy + 150 - row * u - lift;
      if (lift > 0 && by > sy - u) {
        falling.push(
          line([bx + u, by - 5], [bx + u, by - 5 - Math.min(30, lift * 0.6)], {
            stroke: mix(pal.field, pal.text, 0.25),
            sw: 2,
          }),
        );
      }
      falling.push(
        placeBrick(plain(pal, ["red", "orange", "amber"][row]), bx, by, 2 * u),
      );
    }
  }
  out.push(
    still(
      pal,
      sx(0),
      sy,
      w,
      h,
      { u, rows: [], height: 8 },
      0,
      falling.join(""),
    ),
    label(pal, sx(0) + w / 2, sy + h + 24, "A level arrives", 14),
    note(
      pal,
      sx(0) + w / 2,
      sy + h + 43,
      "its bricks drop in, a column after a column, in 400 ms",
    ),
  );

  // 2: the paddle gives under the ball.
  const hit = [sx(1) + w / 2, sy + (27.2 - 24.9) * 40 + 8];
  const give = [200, 222, 318, 340].map((degrees) =>
    line(
      kit.polar(hit[0], hit[1], 30, degrees),
      kit.polar(hit[0], hit[1], 44, degrees),
      {
        stroke: mix(pal.field, pal.text, 0.5),
        sw: 3,
      },
    ),
  );
  out.push(
    still(
      pal,
      sx(1),
      sy,
      w,
      h,
      {
        u: 40,
        rows: [],
        height: 30,
        paddle: { x: 13 },
        balls: [{ x: 13, y: 27.2, squash: 1, step: 1 }],
      },
      24.9,
      give.join(""),
    ),
    label(pal, sx(1) + w / 2, sy + h + 24, "The paddle gives", 14),
    note(
      pal,
      sx(1) + w / 2,
      sy + h + 43,
      "the ball squashes, the pad dips a tenth of a unit, 90 ms",
    ),
  );

  // 3: a streak's step is called out.
  out.push(
    still(
      pal,
      sx(2),
      sy,
      w,
      h,
      {
        u,
        rows: ["ooooooooooooo", "ooo.ooooooooo", "ooo..o.oooooo"],
        height: 12,
        states: {},
        balls: [
          {
            x: 12.6,
            y: 5.6,
            step: 2,
            trail: [
              [14.4, 7.4],
              [13.8, 6.8],
              [13.2, 6.2],
            ],
          },
        ],
        shards: [{ x: 13, y: 4.5, tint: "amber" }],
        popups: [{ x: 16.2, y: 6.8, words: "×3", size: 38 }],
      },
      1.4,
      circle(sx(2) + w / 2 - 13 * u + 12.6 * u, sy + (5.6 - 1.4) * u, 26, {
        stroke: pal.warning,
        sw: 2.5,
      }),
    ),
    label(pal, sx(2) + w / 2, sy + h + 24, "A streak is called out", 14),
    note(
      pal,
      sx(2) + w / 2,
      sy + h + 43,
      "at 5, 10 and 20 bricks: a ring, the fur lifts, a chord",
    ),
  );

  // 4: the last brick.
  out.push(
    still(
      pal,
      sx(3),
      sy,
      w,
      h,
      {
        u,
        rows: ["......o......"],
        height: 12,
        glow: [[0, 6]],
        balls: [
          {
            x: 12.2,
            y: 4.3,
            step: 1,
            trail: [
              [10.2, 7.3],
              [10.6, 6.7],
              [11, 6.1],
              [11.4, 5.5],
              [11.8, 4.9],
            ],
          },
        ],
      },
      0.6,
    ),
    label(pal, sx(3) + w / 2, sy + h + 24, "The last brick", 14),
    note(
      pal,
      sx(3) + w / 2,
      sy + h + 43,
      "it glows, and the hit that breaks it holds for 120 ms",
    ),
  );
  return out.join("\n");
}

/**
 * Draws the paddle, the capsules and the balls, in a dark palette and a
 * light one.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
export function kitSheet() {
  return {
    width: SHEET_WIDTH,
    height: 2 * BAND_HEIGHT,
    body: [kit.DARK, kit.LIGHT]
      .map((pal, i) => bandOf(pal, i * BAND_HEIGHT))
      .join("\n"),
  };
}
