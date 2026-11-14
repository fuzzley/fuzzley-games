// The brick catalog sheet of the Brick Breaker uplift's art: the seven kinds
// the game has, as it draws them now and as the plan draws them; their
// states; the kinds the plan adds; the eight tints; and the small sizes.

import {
  TINTS,
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
  regrow,
  regrowing,
  slider,
  steel,
  tough,
} from "./kit.mjs";
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

const { text } = kit;

/**
 * The kinds the game has: each one's name, how it is drawn now and how the
 * plan draws it, and what changed.
 *
 * @type {[string, (pal: Palette) => string, (pal: Palette) => string, string][]}
 */
const HAS = [
  [
    "Brick",
    (pal) => flat(pal, "plain", "red"),
    (pal) => plain(pal, "red"),
    "a lip and a strip",
  ],
  [
    "Tough brick",
    (pal) => flat(pal, "tough", "blue", 3),
    (pal) => tough(pal, "blue", 3),
    "pips cut out, larger",
  ],
  ["Steel brick", (pal) => flat(pal, "steel"), steel, "a frame, rivets, sheen"],
  [
    "Blast brick",
    (pal) => flat(pal, "blast"),
    blast,
    "a bomb, and where it reaches",
  ],
  ["Gift brick", (pal) => flat(pal, "gift"), gift, "a parcel with a bow"],
  [
    "Ghost brick",
    (pal) => flat(pal, "ghost", "teal"),
    (pal) => ghostHidden(pal, "teal"),
    "round dashes, faint eyes",
  ],
  [
    "Regrowing brick",
    (pal) => flat(pal, "regrow", "green"),
    regrow,
    "earth under a cap of moss",
  ],
];

/**
 * The states the sheet shows, each under its label.
 *
 * @type {[string, (pal: Palette) => string][]}
 */
const STATES = [
  ["tough, 2 hits", (pal) => tough(pal, "blue", 2)],
  ["tough, 3 hits", (pal) => tough(pal, "blue", 3)],
  ["tough, 4 hits", (pal) => tough(pal, "blue", 4)],
  ["4 hits, 1 taken", (pal) => tough(pal, "blue", 3, 1)],
  ["4 hits, 3 taken", (pal) => tough(pal, "blue", 1, 3)],
  ["ghost, unseen", (pal) => ghostHidden(pal, "teal")],
  ["ghost, shown", (pal) => ghostShown(pal, "teal")],
  ["regrowing, whole", regrow],
  ["growing back", (pal) => regrowing(pal, 0.6)],
  ["plated, 1 hit", (pal) => plated(pal, "orange", 1)],
  ["plated, 2 hits", (pal) => plated(pal, "orange", 2)],
  ["cage, whole", (pal) => cage(pal)],
  ["cage, 1 hit taken", (pal) => cage(pal, "pink", true)],
  ["slider, going right", (pal) => slider(pal, "pink", 1)],
  ["slider, going left", (pal) => slider(pal, "pink", -1)],
  ["portal, the other pair", (pal) => portal(pal, 2)],
];

/**
 * The kinds the plan adds: each one's name, its drawing and what it does.
 *
 * @type {[string, (pal: Palette) => string, string][]}
 */
const ADDS = [
  [
    "Plated brick",
    (pal) => plated(pal, "orange", 2),
    "turns a ball from below",
  ],
  ["Cage", (pal) => cage(pal), "frees a friend: one more ball"],
  ["Key brick", key, "the last one opens the gates"],
  ["Gate", gate, "steel, until the keys are gone"],
  ["Portal", (pal) => portal(pal, 1), "in one, out of its twin"],
  ["Bumper", bumper, "round: turns a ball any way"],
  ["Slider", (pal) => slider(pal, "pink", 1), "slides a cell at a time"],
];

/** Every kind, for the small sizes. */
const SMALL = [
  ...HAS.map(([name, , draw]) => /** @type {const} */ ([name, draw])),
  ...ADDS.map(([name, draw]) => /** @type {const} */ ([name, draw])),
];

const BAND_HEIGHT = 1264;

/**
 * Draws the catalog in one palette.
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
      `Brick Breaker uplift · brick catalog · ${pal.id} palette`,
    ),
  ];
  const left = MARGIN;

  // A: the kinds the game has, now and after.
  let y = top + 110;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      300,
      "A",
      "The seven kinds the game has: as it draws them now, and as the plan draws them, at 150 px",
    ),
  );
  const step = (CONTENT - 96) / HAS.length;
  out.push(
    text(left + 24, y + 78, "NOW", {
      size: 11,
      weight: 700,
      fill: pal.muted,
      spacing: 1.1,
    }),
    text(left + 24, y + 178, "AFTER", {
      size: 11,
      weight: 700,
      fill: pal.muted,
      spacing: 1.1,
    }),
  );
  HAS.forEach(([name, now, after, changed], i) => {
    const x = left + 96 + i * step + (step - 150) / 2;
    out.push(
      placeBrick(now(pal), x, y + 40, 150),
      placeBrick(after(pal), x, y + 140, 150),
      label(pal, x + 75, y + 246, name, 14),
      note(pal, x + 75, y + 266, changed),
    );
  });

  // B: states.
  y += 356;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      262,
      "B",
      "States: hits left, cracks, a ghost shown, a brick growing back, a bar bent, the way a slider goes",
    ),
  );
  const perRow = 8;
  const stateStep = CONTENT / perRow;
  STATES.forEach(([name, draw], i) => {
    const x = left + (i % perRow) * stateStep + (stateStep - 120) / 2;
    const rowY = y + 38 + Math.floor(i / perRow) * 118;
    out.push(
      placeBrick(draw(pal), x, rowY, 120),
      note(pal, x + 60, rowY + 84, name, 12),
    );
  });

  // C: the kinds the plan adds.
  y += 318;
  out.push(
    section(
      pal,
      left,
      y,
      CONTENT,
      196,
      "C",
      "The kinds the plan adds, and the dust bunny, which is no brick",
    ),
  );
  const addStep = CONTENT / (ADDS.length + 1);
  ADDS.forEach(([name, draw, does], i) => {
    const x = left + i * addStep + (addStep - 150) / 2;
    out.push(
      placeBrick(draw(pal), x, y + 40, 150),
      label(pal, x + 75, y + 146, name, 14),
      note(pal, x + 75, y + 166, does),
    );
  });
  const bunnyX = left + ADDS.length * addStep + addStep / 2;
  out.push(
    placeBall(dustBunny(pal), bunnyX, y + 82, 30),
    label(pal, bunnyX, y + 146, "Dust bunny", 14),
    note(pal, bunnyX, y + 166, "drifts down, bursts at a touch"),
  );

  // D: the tints, and E: the small sizes.
  y += 252;
  const tintsWidth = 640;
  out.push(
    section(
      pal,
      left,
      y,
      tintsWidth,
      172,
      "D",
      "The eight tints, which are the game's own",
    ),
  );
  const tintStep = (tintsWidth - 32) / 8;
  TINTS.forEach((tint, i) => {
    const x = left + 16 + i * tintStep + (tintStep - 64) / 2;
    out.push(
      placeBrick(plain(pal, tint), x, y + 46, 64),
      placeBrick(tough(pal, tint, 2), x, y + 86, 64),
      note(pal, x + 32, y + 142, tint, 12),
      note(pal, x + 32, y + 158, pal.tints[tint], 10),
    );
  });
  const smallLeft = left + tintsWidth + 24;
  const smallWidth = CONTENT - tintsWidth - 24;
  out.push(
    section(
      pal,
      smallLeft,
      y,
      smallWidth,
      172,
      "E",
      "Small: 38 px, a wide window of 1280 × 720, and 24 px, a phone on its side",
    ),
  );
  const smallStep = (smallWidth - 24) / 7;
  SMALL.forEach(([name, draw], i) => {
    const x = smallLeft + 12 + (i % 7) * smallStep;
    const rowY = y + 38 + Math.floor(i / 7) * 68;
    out.push(
      placeBrick(draw(pal), x + 4, rowY, 38),
      placeBrick(draw(pal), x + 50, rowY + 4, 24),
      text(x + 4, rowY + 36, name.replace(" brick", ""), {
        size: 11,
        fill: pal.muted,
      }),
    );
  });
  return out.join("\n");
}

/**
 * Draws the brick catalog, in a dark palette and a light one.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
export function bricksSheet() {
  return {
    width: SHEET_WIDTH,
    height: 2 * BAND_HEIGHT,
    body: [kit.DARK, kit.LIGHT]
      .map((pal, i) => bandOf(pal, i * BAND_HEIGHT))
      .join("\n"),
  };
}
