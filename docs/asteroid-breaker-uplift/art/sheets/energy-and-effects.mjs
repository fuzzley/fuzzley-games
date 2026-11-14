// The sheet of the uplift's energy and effects: the shots, static, and each
// effect as a storyboard, the same function of time drawn at six moments.
// Run it with `node sheets/energy-and-effects.mjs`; it writes
// `energy-and-effects.svg` and `preview/energy-and-effects.png`.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TURN, place, rect, turned } from "../lib/core.mjs";
import {
  arcSvg,
  blastFx,
  boulderFx,
  breakFx,
  bubblePlaceholder,
  caughtFx,
  clearedFx,
  dashFx,
  exhaustFx,
  flameSvg,
  glow,
  glowDefs,
  heldHitFx,
  impactFx,
  makeArc,
  muzzleFlashSvg,
  novaFx,
  puffSvg,
  rescuedFx,
  rimPoint,
  shareOf,
  shieldFx,
  shipLostFx,
  shipPlaceholder,
  shotSvg,
  shotTodaySvg,
  spark,
  volleySvg,
  zapFx,
} from "../lib/fx.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { writeRaster, writeText } from "../lib/raster.mjs";
import { makeRock, rockDefs, rockSvg } from "../lib/rocks.mjs";
import { panel, sheetFile } from "../lib/sheet.mjs";
import { clipped, note, resetClips, specks, strip } from "../lib/strips.mjs";
import { orbSvg } from "../lib/things.mjs";

/** @import { Point } from "../lib/core.mjs" */
/** @import { Palette } from "../lib/palettes.mjs" */
/** @import { Section } from "../lib/sheet.mjs" */
/** @import { RockKind, RockShape, RockSize } from "../lib/rocks.mjs" */

const ART = join(import.meta.dirname, "..");
const DARK = PALETTES.casino;
const LIGHT = PALETTES.classic;
const HALF = 752;
const GAP = 16;

// --- Shots --------------------------------------------------------------

/**
 * Returns the shots on a panel: one pull of each weapon, the gun in
 * flight, the flash and the spark, and every weapon at 6 px a unit.
 *
 * @param {number} px
 * @param {number} py
 * @param {Palette} palette
 * @returns {string}
 */
function shotsPanel(px, py, palette) {
  const parts = [panel(px, py, HALF, 478, palette)];
  const u = 22;
  // One pull of each.
  parts.push(
    note(px + 16, py + 46, "One pull of each, at 22 px a unit", palette),
  );
  const y1 = py + 84;
  const columns = /** @type {const} */ ([
    "today",
    "gun",
    "spread",
    "rapid",
    "lance",
  ]);
  columns.forEach((name, i) => {
    const cx = px + 84 + i * 146;
    if (name === "today")
      parts.push(place(shotTodaySvg(palette, { unit: u }), { x: cx, y: y1 }));
    else if (name === "spread")
      parts.push(
        place(volleySvg("spread", palette, { unit: u, distance: 3.3 }), {
          x: cx - 2.4 * u,
          y: y1,
        }),
      );
    else if (name === "rapid") {
      parts.push(
        place(shotSvg("rapid", palette, { unit: u }), { x: cx - 14, y: y1 }),
      );
      parts.push(
        place(shotSvg("rapid", palette, { unit: u }), {
          x: cx - 14 + 2.24 * u,
          y: y1,
        }),
      );
    } else
      parts.push(
        place(shotSvg(name, palette, { unit: u }), {
          x: cx + (name === "lance" ? 22 : 8),
          y: y1,
        }),
      );
    parts.push(
      note(cx, y1 + 38, name === "today" ? "today's dash" : name, palette, {
        anchor: "middle",
      }),
    );
  });
  // The gun in flight.
  parts.push(
    note(
      px + 16,
      py + 158,
      "The gun in flight, seven shots a second: a flash at the muzzle, a spark where one lands",
      palette,
    ),
  );
  const y2 = py + 196;
  parts.push(
    specks(px + 110, y2 - 34, 500, 68, palette, {
      seed: 4,
      count: 13,
      unit: u,
    }),
  );
  const muzzle = px + 56 + 1.2 * u;
  for (const far of [3.4, 7.9, 12.4, 16.9, 21.4])
    parts.push(
      place(shotSvg("gun", palette, { unit: u }), {
        x: muzzle + far * u,
        y: y2,
      }),
    );
  parts.push(
    place(muzzleFlashSvg(0, palette, { unit: u }), { x: muzzle, y: y2 }),
  );
  parts.push(
    place(shipPlaceholder(palette, { unit: u }), { x: px + 56, y: y2 }),
  );
  const rock = makeRock("stone", "medium", 5);
  const rockAt = /** @type {Point} */ ([px + 676, y2]);
  const rim = rimPoint(
    rock.outline.map((p) => turned(p, 0.4)),
    TURN / 2,
  );
  parts.push(
    place(rockSvg(rock, palette, { unit: u, turn: 0.4 }), {
      x: rockAt[0],
      y: rockAt[1],
    }),
  );
  parts.push(
    place(impactFx(35, palette, { unit: u, toward: TURN / 2, seed: 3 }), {
      x: rockAt[0] + rim[0] * rock.radius * u,
      y: rockAt[1],
    }),
  );
  // The flash's two frames and the spark's three.
  parts.push(
    note(
      px + 16,
      py + 252,
      "At 30 px a unit: the muzzle flash at 0 and 30 ms, and the spark at 0, 50 and 110 ms",
      palette,
    ),
  );
  const y3 = py + 296;
  const big = 30;
  const large = makeRock("stone", "large", 2);
  const largeRim = rimPoint(
    large.outline.map((p) => turned(p, 1.1)),
    TURN / 2,
  );
  [0, 1, 2, 3, 4].forEach((i) => {
    const cx = px + 86 + i * 146;
    if (i < 2) {
      parts.push(
        place(
          muzzleFlashSvg(/** @type {0 | 1} */ (i), palette, { unit: big }),
          { x: cx - 6, y: y3 },
        ),
      );
      parts.push(
        place(shipPlaceholder(palette, { unit: big }), {
          x: cx - 6 - 1.2 * big,
          y: y3,
        }),
      );
    } else {
      const at = cx + 14 - largeRim[0] * large.radius * big;
      parts.push(
        clipped(
          cx - 66,
          y3 - 40,
          132,
          80,
          [
            place(rockSvg(large, palette, { unit: big, turn: 1.1 }), {
              x: at,
              y: y3,
            }),
            place(
              impactFx([0, 50, 110][i - 2] ?? 0, palette, {
                unit: big,
                toward: TURN / 2,
                seed: 3,
              }),
              { x: cx + 14, y: y3 },
            ),
          ].join(""),
        ),
      );
    }
  });
  // Every weapon at 6 px a unit.
  parts.push(
    note(
      px + 16,
      py + 356,
      "At 6 px a unit, among the field's specks",
      palette,
    ),
  );
  const small = 6;
  parts.push(
    specks(px + 110, py + 362, 610, 100, palette, {
      seed: 9,
      count: 30,
      unit: small,
    }),
  );
  /** @type {const} */ (["today", "gun", "rapid", "lance", "spread"]).forEach(
    (name, k) => {
      const y = py + 374 + k * 16.5 + (name === "spread" ? 12 : 0);
      parts.push(
        note(px + 16, y + 4, name === "today" ? "today" : name, palette, {
          size: 10,
        }),
      );
      const ship = px + 82;
      parts.push(
        place(shipPlaceholder(palette, { unit: small }), { x: ship, y }),
      );
      const from = ship + 1.2 * small;
      const apart = name === "rapid" ? 2.24 : 4.48;
      const most = name === "spread" ? 16 : 96;
      for (let far = 2.6; far < most; far += apart) {
        if (name === "today")
          parts.push(
            place(shotTodaySvg(palette, { unit: small }), {
              x: from + far * small,
              y,
            }),
          );
        else if (name === "spread")
          parts.push(
            place(
              volleySvg("spread", palette, { unit: small, distance: far }),
              { x: from, y },
            ),
          );
        else
          parts.push(
            place(shotSvg(name, palette, { unit: small }), {
              x: from + far * small,
              y,
            }),
          );
      }
    },
  );
  return parts.join("");
}

// --- Static -------------------------------------------------------------

/**
 * Returns static on a panel: an arc leaping three times, a zap dash from
 * the ship to three rocks, and the sparks.
 *
 * @param {number} px
 * @param {number} py
 * @param {Palette} palette
 * @returns {string}
 */
function staticPanel(px, py, palette) {
  const parts = [panel(px, py, HALF, 322, palette)];
  const u = 22;
  parts.push(
    note(
      px + 16,
      py + 46,
      "A zap arc, leaping anew every 45 ms and gone in 180",
      palette,
    ),
  );
  [0, 50, 140].forEach((t, i) => {
    const y = py + 96 + i * 78;
    parts.push(
      place(zapFx([0, 0], [11.6, 0], t, palette, { unit: u, seed: 3 }), {
        x: px + 36,
        y,
      }),
    );
    parts.push(note(px + 36 + 11.6 * u + 20, y + 4, `${t} ms`, palette));
  });
  // A zap dash: the ship, three rocks, and an arc to each.
  const scene = (
    /** @type {number} */ unit,
    /** @type {number} */ sx,
    /** @type {number} */ sy,
  ) => {
    /** @type {{ rock: RockShape, at: Point, turn: number }[]} */
    const rocks = [
      { rock: makeRock("stone", "medium", 3), at: [6.6, -3.1], turn: 0.5 },
      { rock: makeRock("iron", "small", 2), at: [8.2, 2.1], turn: 0.2 },
      { rock: makeRock("ice", "medium", 4), at: [2.4, 4.9], turn: 1.3 },
    ];
    const inner = [];
    for (const { rock, at, turn } of rocks)
      inner.push(
        place(rockSvg(rock, palette, { unit, turn }), {
          x: at[0] * unit,
          y: at[1] * unit,
        }),
      );
    inner.push(glow(0, 0, 2.3 * unit, palette.accent, palette, 0.8));
    rocks.forEach(({ rock, at, turn }, i) => {
      const back = Math.atan2(-at[1], -at[0]);
      const rim = rimPoint(
        rock.outline.map((p) => turned(p, turn)),
        back,
      );
      /** @type {Point} */
      const to = [
        at[0] + rim[0] * rock.radius * 0.96,
        at[1] + rim[1] * rock.radius * 0.96,
      ];
      inner.push(
        arcSvg(
          makeArc([0.4, 0], to, 7 + i * 3, { branches: i === 0 ? 2 : 1 }),
          palette,
          { unit },
        ),
      );
      inner.push(
        spark(to[0] * unit, to[1] * unit, 0.5 * unit, palette.accent, palette, {
          turn: i * 0.5,
        }),
      );
    });
    inner.push(shipPlaceholder(palette, { unit, turn: 0.25 }));
    return place(inner.join(""), { x: sx, y: sy });
  };
  parts.push(
    note(
      px + 396,
      py + 46,
      "A zap dash: arcs leap from the ship to three rocks",
      palette,
    ),
  );
  parts.push(scene(u, px + 430, py + 162));
  parts.push(scene(6, px + 672, py + 96));
  parts.push(
    note(px + 700, py + 146, "6 px a unit", palette, {
      anchor: "middle",
      size: 10,
    }),
  );
  parts.push(note(px + 640, py + 222, "Sparks", palette));
  [0.55, 0.38, 0.24].forEach((r, i) =>
    parts.push(
      spark(px + 652 + i * 36, py + 252, r * u, palette.accent, palette),
    ),
  );
  [0.55, 0.38, 0.24].forEach((r, i) =>
    parts.push(
      spark(px + 656 + i * 20, py + 288, r * 6, palette.accent, palette),
    ),
  );
  return parts.join("");
}

// --- Storyboards --------------------------------------------------------

const BREAK_TIMES = [0, 40, 110, 200, 320, 440];

/**
 * Returns a kind of rock breaking, at two sizes, as two strips side by side.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @param {RockKind} kind
 * @param {number} seed
 * @returns {string}
 */
function breakRow(x, y, palette, kind, seed) {
  const other = /** @type {RockSize} */ (
    kind === "crystal" ? "medium" : "small"
  );
  const large = makeRock(kind, "large", seed);
  const lesser = makeRock(kind, other, seed + 1);
  const name = `${kind[0]?.toUpperCase()}${kind.slice(1)}`;
  const lesserUnit = kind === "crystal" ? 13 : 20;
  const drop = (/** @type {number} */ unit) =>
    kind === "crystal"
      ? {
          drop: (/** @type {number} */ shown) =>
            place(orbSvg("spread", palette, { unit }), { scale: shown }),
        }
      : {};
  return [
    strip(x, y, palette, {
      times: BREAK_TIMES,
      cell: 166,
      height: 196,
      label: `${name}, large, at 15 px a unit (${palette.name})`,
      draw: (t) =>
        breakFx(large, t, palette, { unit: 15, turn: 0.3, seed, ...drop(15) }),
    }).svg,
    strip(x + 996 + 20, y, palette, {
      times: BREAK_TIMES,
      cell: 84,
      height: 196,
      label: `${name}, ${other}, at ${lesserUnit} px a unit`,
      draw: (t) =>
        breakFx(lesser, t, palette, {
          unit: lesserUnit,
          turn: 0.8,
          seed: seed + 1,
          ...drop(lesserUnit),
        }),
    }).svg,
  ].join("");
}

/** @type {Section} */
const breaks = {
  heading: "1. A rock breaks",
  note: "Over in 450 ms. The rock flashes for its first 25 ms, then its own facets fly apart as shards: most are gone within 200 ms, and a few tumble on, shrinking and fading into the field's color with no outline, so none is taken for a small rock. A ring of dust puffs out, a few sparks fly, and the smaller rocks come out of the middle, full size by 220 ms. Stone: 6 shards that last, 4 sparks, 2 pieces. Ice: 12 thin slivers, 5 glints, no sparks, 3 pieces. Crystal: its gems fly as glowing slivers and its pickup comes out of the middle. Iron: 8 heavy plates that barely turn, 9 bright sparks. Reduced motion: none of it; the pieces are simply there.",
  height: 4 * 228 - 10,
  draw: (x, y) =>
    /** @type {[RockKind, number][]} */ ([
      ["stone", 3],
      ["ice", 4],
      ["crystal", 2],
      ["iron", 5],
    ])
      .map(([kind, seed], i) => breakRow(x, y + i * 228, DARK, kind, seed))
      .join(""),
};

/** @type {Section} */
const held = {
  heading: "2. A held hit",
  note: "Over in 200 ms, on an iron rock and on the boulder. A spark where the shot landed, thrown back the way it came (5 ticks, 7 on iron); the three facets nearest it lit for 70 ms; and a crack that grows in over 80 ms and stays, so the rock shows the hits it has taken. The lit facets are a small part of the rock, and a second flash within a third of a second is left out, as today. Reduced motion: the crack alone.",
  height: 172,
  draw: (x, y) => {
    const iron = makeRock("iron", "large", 5);
    const boulder = makeRock("boulder", "boulder", 2);
    const times = [0, 30, 60, 110, 160, 220];
    return [
      strip(x, y, DARK, {
        times,
        cell: 126,
        height: 150,
        label: "Iron, large, at 16 px a unit",
        draw: (t) =>
          heldHitFx(iron, t, DARK, {
            unit: 16,
            turn: 0.2,
            toward: TURN * 0.56,
            seed: 2,
          }),
      }).svg,
      strip(x + 764, y, DARK, {
        times,
        cell: 126,
        height: 150,
        label: "The boulder, at 9.5 px a unit",
        draw: (t) =>
          heldHitFx(boulder, t, DARK, {
            unit: 9.5,
            turn: 0.4,
            toward: TURN * 0.42,
            seed: 4,
          }),
      }).svg,
    ].join("");
  },
};

/**
 * Returns a volatile rock's blast as a strip, with a neighbour it sets off.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @param {{ unit?: number, cell?: number, height?: number, still?: boolean, label?: string }} [how]
 * @returns {{ svg: string, width: number, height: number }}
 */
function blastStrip(
  x,
  y,
  palette,
  { unit = 11.5, cell = 190, height = 184, still = true, label } = {},
) {
  const rock = makeRock("volatile", "large", 3);
  const neighbour = {
    rock: makeRock("volatile", "medium", 6),
    at: /** @type {Point} */ ([5.5, -1.7]),
    turn: 0.7,
  };
  return strip(x, y, palette, {
    times: [0, 60, 100, 170, 250, 340, 440],
    cell,
    height,
    anchor: [0.4, 0.54],
    label:
      label ??
      `Volatile, large, its blast 6 units out, at ${unit} px a unit (${palette.name})`,
    draw: (t) =>
      blastFx(rock, t, palette, { unit, turn: 0.3, seed: 3, neighbour }),
    ...(still
      ? {
          still: () =>
            [
              place(
                rockSvg(neighbour.rock, palette, {
                  unit,
                  turn: neighbour.turn,
                }),
                { x: neighbour.at[0] * unit, y: neighbour.at[1] * unit },
              ),
              blastFx(rock, 0, palette, { unit, still: true }),
            ].join(""),
        }
      : {}),
  });
}

/** @type {Section} */
const blast = {
  heading: "3. A volatile blast",
  note: "One blast is over in 520 ms. Its seams flare white for 70 ms, as a warning; a flash disc for 100 ms; a shockwave ring sweeps to its reach by 430 ms, hot at its inner edge; 12 embers fly and fade; its 7 shards go with them; and 5 puffs of scorch smoke show for 400 ms and are never opaque. Then the chain: where the ring reaches a neighbour, its seams flare in turn for the 90 ms before it takes its hit, and it blasts. Reduced motion: one still ring at the blast's reach for 150 ms, with no flash.",
  height: 206,
  draw: (x, y) => blastStrip(x, y, DARK).svg,
};

/**
 * Returns the boulder's last hit as a strip.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @returns {string}
 */
function boulderStrip(x, y, palette) {
  const rock = makeRock("boulder", "boulder", 2);
  return strip(x, y, palette, {
    times: [0, 90, 180, 290, 400, 480, 580, 690],
    cell: 190,
    height: 214,
    label: "The boulder, at 12 px a unit",
    draw: (t) => boulderFx(rock, t, palette, { unit: 12, turn: 0.4, seed: 3 }),
  }).svg;
}

/** @type {Section} */
const boulder = {
  heading: "4. The boulder's last hit",
  note: "Three beats over 700 ms. Crack flare, to 200 ms: three cracks run from its middle to its rim, lit from within, and 8 sparks leave the rim. Split, to 400 ms: it comes apart in thirds along them, light in the gaps. Throw, to 700 ms: its facets fly as shards (11 that last), a ring goes out, and the three large rocks come out, one from each third. Reduced motion: none of it; the three rocks are simply there.",
  height: 236,
  draw: (x, y) => boulderStrip(x, y, DARK),
};

/** @type {Section} */
const thrust = {
  heading: "5. Thrust and exhaust",
  note: "The flame is energy: a bright middle in a body and a halo of the warning color, in three frames that flicker 7.5 times a second. The exhaust is 40 puffs a second, 16 alive at once, each streaming back, growing, cooling from the flame's color to the field's muted text and gone in 400 ms. Reduced motion: the flame holds its first frame, and there is no exhaust.",
  height: 150,
  draw: (x, y, width) => {
    const parts = [panel(x, y, width, 150, DARK)];
    const big = 30;
    /** @type {(0 | 1 | 2)[]} */ ([0, 1, 2]).forEach((frame) => {
      const cx = x + 150 + frame * 190;
      parts.push(
        place(flameSvg(frame, DARK, { unit: big }), {
          x: cx - 0.56 * big,
          y: y + 80,
        }),
      );
      parts.push(
        place(shipPlaceholder(DARK, { unit: big }), { x: cx, y: y + 80 }),
      );
      parts.push(
        note(cx - 10, y + 134, `flame, frame ${frame + 1}`, DARK, {
          anchor: "middle",
        }),
      );
    });
    const u = 22;
    const sx = x + 850;
    parts.push(
      place(exhaustFx(1000, DARK, { unit: u, seed: 2 }), {
        x: sx - 1.1 * u,
        y: y + 80,
      }),
    );
    parts.push(
      place(flameSvg(1, DARK, { unit: u }), { x: sx - 0.56 * u, y: y + 80 }),
    );
    parts.push(place(shipPlaceholder(DARK, { unit: u }), { x: sx, y: y + 80 }));
    parts.push(
      note(sx - 30, y + 134, "under thrust, at 22 px a unit", DARK, {
        anchor: "middle",
      }),
    );
    [0, 80, 160, 240, 320, 390].forEach((age, i) => {
      const cx = x + 1010 + i * 84;
      parts.push(
        place(puffSvg(age, DARK, { unit: u, sway: 0.4 }), {
          x: cx + 50,
          y: y + 80,
        }),
      );
      parts.push(
        note(cx + 20, y + 134, `${age} ms`, DARK, { anchor: "middle" }),
      );
    });
    parts.push(
      note(x + 1010 + 20, y + 46, "one puff's life", DARK, {
        anchor: "middle",
      }),
    );
    const sm = 6;
    parts.push(
      place(exhaustFx(1000, DARK, { unit: sm, seed: 2 }), {
        x: x + 640 - 1.1 * sm,
        y: y + 60,
      }),
    );
    parts.push(
      place(flameSvg(1, DARK, { unit: sm }), {
        x: x + 640 - 0.56 * sm,
        y: y + 60,
      }),
    );
    parts.push(
      place(shipPlaceholder(DARK, { unit: sm }), { x: x + 640, y: y + 60 }),
    );
    parts.push(
      note(x + 632, y + 134, "6 px a unit", DARK, { anchor: "middle" }),
    );
    return parts.join("");
  },
};

/** @type {Section} */
const dash = {
  heading: "6. A dash",
  note: "The dash throws the ship 7.5 units in 220 ms, and its marks are gone by 440 ms: 6 streak lines behind the ship while it is fast; a ring left where it began, which opens and fades over 340 ms; and 3 after-images of the ship along its path, each fading over 240 ms. The dart is a placeholder for the pod. Reduced motion: one still ring where it began, for 150 ms.",
  height: 142,
  draw: (x, y) =>
    strip(x, y, DARK, {
      times: [0, 60, 130, 220, 320, 420],
      cell: 217,
      height: 120,
      anchor: [38 / 217, 0.52],
      label: "A dash to the right, at 14 px a unit",
      draw: (t) => dashFx(t, DARK, { unit: 14, seed: 2 }),
      still: () =>
        [
          dashFx(0, DARK, { unit: 14, still: true }),
          place(shipPlaceholder(DARK, { unit: 14 }), { x: 7.48 * 14 }),
        ].join(""),
    }).svg,
};

/**
 * Returns a few rocks about the ship, for a Nova to reach.
 *
 * @param {Palette} palette
 * @param {number} unit
 * @returns {string}
 */
function novaRocks(palette, unit) {
  /** @type {[RockKind, RockSize, number, Point][]} */
  const rocks = [
    ["stone", "medium", 4, [6.5, -4.2]],
    ["stone", "large", 7, [-7.6, 3.4]],
    ["ice", "small", 3, [2.8, 8.2]],
    ["iron", "medium", 2, [-3.6, -8.4]],
  ];
  return rocks
    .map(([kind, size, seed, at]) =>
      place(
        rockSvg(makeRock(kind, size, seed), palette, { unit, turn: seed }),
        { x: at[0] * unit, y: at[1] * unit },
      ),
    )
    .join("");
}

/** @type {Section} */
const nova = {
  heading: "7. A Nova",
  note: "A bright ring sweeps 12 units out from the ship in 300 ms and is gone by 380 ms: a hot line in a band of the accent, 8 sparkles riding it, a brief halo at the ship, and the ground it has swept faintly lit. Each rock it passes takes its hit and plays its own held hit or break. Reduced motion: one still ring at 12 units, for 150 ms.",
  height: 248,
  draw: (x, y) =>
    strip(x, y, DARK, {
      times: [0, 50, 110, 180, 260, 340],
      cell: 217,
      height: 226,
      label: "A Nova, at 8.6 px a unit",
      draw: (t) =>
        [
          novaRocks(DARK, 8.6),
          novaFx(t, DARK, { unit: 8.6 }),
          shipPlaceholder(DARK, { unit: 8.6, turn: -TURN / 4 }),
        ].join(""),
      still: () =>
        [
          novaRocks(DARK, 8.6),
          novaFx(0, DARK, { unit: 8.6, still: true }),
          shipPlaceholder(DARK, { unit: 8.6, turn: -TURN / 4 }),
        ].join(""),
    }).svg,
};

/** @type {Section} */
const shieldAndCatch = {
  heading: "8. A Shield spent, and a pickup caught",
  note: "A Shield spent, 360 ms: the glass shell flashes for 50 ms, then bursts into 7 arcs that fly out, turn, shorten and fade, with 4 glints and a faint ring. Reduced motion: a still dashed ring where the shell was, for 150 ms. A pickup caught, 300 ms: the orb is drawn in and shrinks, a ring closes on the ship, and a sparkle marks where it landed. Reduced motion: nothing; the tag at the field's corner says what was caught.",
  height: 152,
  draw: (x, y) =>
    [
      strip(x, y, DARK, {
        times: [0, 40, 90, 160, 240, 330],
        cell: 108,
        height: 130,
        label: "A Shield spent, at 15 px a unit",
        draw: (t) =>
          [
            shieldFx(t, DARK, { unit: 15, seed: 2 }),
            shipPlaceholder(DARK, { unit: 15, turn: -TURN / 4 }),
          ].join(""),
        still: () =>
          [
            shieldFx(0, DARK, { unit: 15, still: true }),
            shipPlaceholder(DARK, { unit: 15, turn: -TURN / 4 }),
          ].join(""),
      }).svg,
      strip(x + 764, y, DARK, {
        times: [0, 50, 110, 170, 220, 280],
        cell: 126,
        height: 130,
        anchor: [0.42, 0.58],
        label: "A pickup caught, at 18 px a unit",
        draw: (t) =>
          [
            shipPlaceholder(DARK, { unit: 18, turn: -TURN / 4 }),
            caughtFx(t, DARK, {
              unit: 18,
              from: [1.7, -1.2],
              orb: (scale) =>
                place(orbSvg("rapid", DARK, { unit: 18 }), { scale }),
            }),
          ].join(""),
      }).svg,
    ].join(""),
};

/**
 * Returns a ship lost as a strip.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @param {{ unit?: number, cell?: number, height?: number, still?: boolean, label?: string, times?: number[] }} [how]
 * @returns {{ svg: string, width: number, height: number }}
 */
function lostStrip(
  x,
  y,
  palette,
  {
    unit = 16,
    cell = 190,
    height = 190,
    still = true,
    label,
    times = [0, 40, 100, 190, 300, 420, 540],
  } = {},
) {
  return strip(x, y, palette, {
    times,
    cell,
    height,
    label: label ?? `A ship lost, at ${unit} px a unit (${palette.name})`,
    draw: (t) => shipLostFx(t, palette, { unit, turn: -TURN / 4, seed: 3 }),
    ...(still
      ? { still: () => shipLostFx(0, palette, { unit, still: true }) }
      : {}),
  });
}

/** @type {Section} */
const lost = {
  heading: "9. A ship lost",
  note: "The burst is over in 560 ms. A flash at the ship for 110 ms; its hull thrown as 4 plates that tumble, shrink and fade; a ring out to 5 units by 380 ms; 10 embers; and its pilot popping out in a small bubble at 70 ms, full size by 260 ms, floating off up and to the left until 1,400 ms, as today. The dart and the dot are placeholders for the pod and the fuzzball. The field's shake stays as it is. Reduced motion: no flash and no plates; the pilot's bubble shows where the ship was, still, then goes.",
  height: 212,
  draw: (x, y) => lostStrip(x, y, DARK).svg,
};

/**
 * Returns a small field with a calm ring crossing it from its last rock.
 *
 * @param {Palette} palette
 * @param {number} t
 * @param {number} unit
 * @returns {string}
 */
function clearedField(palette, t, unit) {
  const w = 72 * unit;
  const h = 40 * unit;
  /** @type {Point} */
  const at = [50 * unit - w / 2, 14 * unit - h / 2];
  return [
    rect(-w / 2, -h / 2, w, h, "none", {
      stroke: palette.fieldLine,
      "stroke-width": 1.5,
    }),
    clipped(
      -w / 2,
      -h / 2,
      w,
      h,
      place(clearedFx(t, palette, { unit, reach: 56 }), { x: at[0], y: at[1] }),
    ),
    t < 60
      ? place(
          breakFx(makeRock("stone", "small", 2), t * 4, palette, {
            unit: unit * 2,
          }),
          { x: at[0], y: at[1] },
        )
      : "",
    place(shipPlaceholder(palette, { unit: unit * 2, turn: 0.4 }), {
      x: 22 * unit - w / 2,
      y: 26 * unit - h / 2,
    }),
  ].join("");
}

/** @type {Section} */
const rescueAndClear = {
  heading: "10. A stray rescued, and a wave cleared",
  note: "A stray rescued, 600 ms: a soft ring opens from where its bubble was, and 5 sparkles rise and twinkle out, one after another; no hearts. Reduced motion: nothing; the points show where it was. A wave cleared, 700 ms: one calm ring from the last rock, at an even pace, crossing the whole field before the Cleared card opens at 800 ms. Reduced motion: nothing, and the card opens at once.",
  height: 172,
  draw: (x, y) =>
    [
      strip(x, y, DARK, {
        times: [0, 80, 180, 300, 420, 560],
        cell: 126,
        height: 150,
        anchor: [0.5, 0.66],
        label: "A stray rescued, at 18 px a unit",
        draw: (t) =>
          [
            place(bubblePlaceholder(DARK, { unit: 18 }), {
              opacity: 1 - shareOf(t, 0, 110),
            }),
            rescuedFx(t, DARK, { unit: 18, seed: 2 }),
          ].join(""),
      }).svg,
      strip(x + 764, y, DARK, {
        times: [0, 150, 320, 500, 680],
        cell: 151,
        height: 150,
        anchor: [0.5, 0.56],
        label: "A wave cleared, the field 72 by 40 units",
        draw: (t) => clearedField(DARK, t, 1.9),
      }).svg,
    ].join(""),
};

/** @type {Section} */
const onWhite = {
  heading: "On a white field",
  note: "The three that matter most, on Classic felt, where space is white. Nothing here is added to the field's light: a flash is the rock's own ink made paler, a halo is a tint, and a ring's hot edge is a denser ink, so each still shows.",
  height: 228 + 206 + 212,
  draw: (x, y) =>
    [
      breakRow(x, y, LIGHT, "stone", 3),
      blastStrip(x, y + 228, LIGHT).svg,
      lostStrip(x, y + 228 + 206, LIGHT).svg,
    ].join(""),
};

/**
 * Returns the three effects that matter most at 6 px a unit, on a palette.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @returns {string}
 */
function smallRow(x, y, palette) {
  const stone = makeRock("stone", "large", 3);
  return [
    strip(x, y, palette, {
      times: BREAK_TIMES,
      cell: 84,
      height: 84,
      label: palette.name,
      draw: (t) => breakFx(stone, t, palette, { unit: 6, turn: 0.3, seed: 3 }),
    }).svg,
    blastStrip(x + 512, y, palette, {
      unit: 6,
      cell: 94,
      height: 84,
      still: false,
      label: "",
    }).svg,
    lostStrip(x + 512 + 666, y, palette, {
      unit: 6,
      cell: 57,
      height: 84,
      still: false,
      label: "",
      times: [0, 40, 100, 190, 300, 420],
    }).svg,
  ].join("");
}

/** @type {Section} */
const small = {
  heading: "At 6 px a unit",
  note: "A stone breaking, a volatile blast and a ship lost as a small phone shows them, where a unit is 6 px. The shards and the embers are a pixel or two each, and the ring and the pieces carry the effect.",
  height: 2 * 114 - 8,
  draw: (x, y) => [smallRow(x, y, DARK), smallRow(x, y + 114, LIGHT)].join(""),
};

/** The sheet's sections, in order. */
const SECTIONS = /** @type {Section[]} */ ([
  {
    heading: "Shots",
    note: "One shot for each weapon, beside today's plain dash. Each is a bright middle in the field's text color, as the shot is today, in a body and a soft halo of the accent, the ship's own color, with a short tapering tail, so it is longer than it is wide and has a direction, which no speck has. The gun's bolt; Spread's three lighter bolts; Rapid's small darts, twice as close; Lance's long needle.",
    height: 478,
    draw: (x, y) =>
      [shotsPanel(x, y, DARK), shotsPanel(x + HALF + GAP, y, LIGHT)].join(""),
  },
  {
    heading: "Static",
    note: "The fuzzball's own energy: a jagged arc with a branch or two, a near-white middle in a halo of the accent. On a white field the middle is the accent's densest ink and the halo a tint of it. Sparks are four-point ticks.",
    height: 322,
    draw: (x, y) =>
      [staticPanel(x, y, DARK), staticPanel(x + HALF + GAP, y, LIGHT)].join(""),
  },
  breaks,
  held,
  blast,
  boulder,
  thrust,
  dash,
  nova,
  shieldAndCatch,
  lost,
  rescueAndClear,
  onWhite,
  small,
]);

/**
 * Builds the sheet, writing its SVG and its PNG preview.
 *
 * @returns {Promise<void>}
 */
export async function build() {
  const sheet = {
    title: "Asteroid Breaker uplift: energy and effects",
    lead: "Concept art, drawn by lib/fx.mjs. Energy is a bright middle and a soft halo in the thing's own color, under plain alpha. Every effect is a function of the time since it began, drawn here at six moments with its time under each frame; each is a medium dose, clear, quick and gone. Times are in milliseconds, sizes in field units.",
    sections: SECTIONS,
  };
  resetClips();
  const draft = sheetFile(sheet);
  resetClips();
  const svg = sheetFile({
    ...sheet,
    defs: [rockDefs(DARK), rockDefs(LIGHT), glowDefs(draft)].join(""),
  });
  await writeText(join(ART, "energy-and-effects.svg"), svg);
  await writeRaster(svg, join(ART, "preview/energy-and-effects.png"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await build();
