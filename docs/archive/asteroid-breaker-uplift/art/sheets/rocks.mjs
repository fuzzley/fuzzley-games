// Draws the rocks' sheet, ../rocks.svg, and its preview:
//
//   node docs/archive/asteroid-breaker-uplift/art/sheets/rocks.mjs

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  TURN,
  circle,
  mix,
  path,
  place,
  polygon,
  polyline,
  seeded,
  between,
} from "../lib/core.mjs";
import { PALETTES, ROCK_INKS, tonesOf } from "../lib/palettes.mjs";
import {
  ROCK_KINDS,
  ROCK_RADIUS,
  SIZES_OF,
  makeRock,
  rockDefs,
  rockSvg,
} from "../lib/rocks.mjs";
import { caption, panel, sheetFile } from "../lib/sheet.mjs";
import { writeRaster, writeText } from "../lib/raster.mjs";

/** @import { Point } from "../lib/core.mjs" */
/** @import { Palette } from "../lib/palettes.mjs" */
/** @import { RockKind, RockSize } from "../lib/rocks.mjs" */

const here = import.meta.dirname;
const DARK = PALETTES.casino;
const LIGHT = PALETTES.classic;

/** The names How to play gives the kinds. */
const NAMES = {
  stone: "Stone",
  crystal: "Crystal",
  ice: "Ice",
  boulder: "Boulder",
  iron: "Iron",
  volatile: "Volatile",
  lodestone: "Lodestone",
};

/** What each kind is told by, beside its ink. */
const TOLD_BY = {
  stone: "round, cut dents",
  crystal: "gems standing out of stone",
  ice: "long shards, glints",
  boulder: "the largest, a seam",
  iron: "blocky, flat top, rivets",
  volatile: "seams that glow",
  lodestone: "long, banded poles, its field",
};

/**
 * Returns a closed, smooth path through points: a blob, as the game draws a
 * rock today.
 *
 * @param {Point[]} points
 * @returns {string}
 */
function blob(points) {
  const mid = (/** @type {Point} */ a, /** @type {Point} */ b) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const n = points.length;
  const first = mid(
    /** @type {Point} */ (points[n - 1]),
    /** @type {Point} */ (points[0]),
  );
  let d = `M${first[0]?.toFixed(2)} ${first[1]?.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p = /** @type {Point} */ (points[i]);
    const m = mid(p, /** @type {Point} */ (points[(i + 1) % n]));
    d += `Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${m[0]?.toFixed(2)} ${m[1]?.toFixed(2)}`;
  }
  return `${d}Z`;
}

/**
 * Returns a rock much as the game draws it today: one flat ink, its marks in
 * the field's color. It is redrawn here from the game's art, not taken from
 * it.
 *
 * @param {RockKind} kind
 * @param {RockSize} size
 * @param {Palette} palette
 * @param {number} unit
 * @param {number} [turn]
 * @returns {string}
 */
function todayRock(kind, size, palette, unit, turn = 0) {
  const inks = ROCK_INKS[palette.mode];
  const random = seeded(kind.length * 31 + size.length * 7);
  const r = ROCK_RADIUS[size] * unit;
  const sides = kind === "ice" ? 9 : kind === "iron" ? 8 : 11;
  /** @type {Point[]} */
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * TURN;
    const reach =
      r *
      (kind === "ice" ? (i % 2 ? 0.66 : 1.05) : between(random, 0.82, 1.08));
    points.push([
      Math.cos(angle) * reach,
      Math.sin(angle) * reach * (kind === "lodestone" ? 0.7 : 1),
    ]);
  }
  const ink = kind === "crystal" ? inks.stone : inks[kind];
  const body =
    kind === "ice" || kind === "iron"
      ? polygon(points, ink, {
          "stroke-linejoin": "round",
          stroke: ink,
          "stroke-width": r * 0.08,
        })
      : path(blob(points), { fill: ink });
  const marks = [];
  const hole = palette.field;
  if (kind === "stone" || kind === "boulder") {
    for (const [x, y, s] of [
      [-0.3, -0.2, 0.16],
      [0.25, 0.1, 0.2],
      [-0.05, 0.4, 0.11],
    ]) {
      marks.push(circle((x ?? 0) * r, (y ?? 0) * r, (s ?? 0) * r, hole));
    }
  } else if (kind === "crystal") {
    marks.push(
      polygon(
        [
          [0, -0.45 * r],
          [0.3 * r, 0],
          [0, 0.45 * r],
          [-0.3 * r, 0],
        ],
        inks.crystal,
      ),
    );
  } else if (kind === "ice") {
    marks.push(
      polyline(
        [
          [-0.4 * r, -0.1 * r],
          [0.1 * r, 0.05 * r],
          [0.35 * r, 0.4 * r],
        ],
        hole,
        r * 0.07,
      ),
    );
  } else if (kind === "iron") {
    for (const [x, y] of [
      [-0.45, -0.4],
      [0.45, -0.4],
      [0.45, 0.4],
      [-0.45, 0.4],
    ]) {
      marks.push(circle((x ?? 0) * r, (y ?? 0) * r, 0.08 * r, hole));
    }
  } else if (kind === "volatile") {
    marks.push(circle(0, 0, 0.36 * r, inks.core));
    marks.push(
      polyline(
        [
          [-0.7 * r, -0.3 * r],
          [-0.3 * r, -0.1 * r],
        ],
        ink === hole ? hole : mix(ink, "#000000", 0.35),
        r * 0.06,
      ),
    );
    marks.push(
      polyline(
        [
          [0.3 * r, 0.2 * r],
          [0.7 * r, 0.45 * r],
        ],
        mix(ink, "#000000", 0.35),
        r * 0.06,
      ),
    );
  } else if (kind === "lodestone") {
    marks.push(
      polyline(
        [
          [-0.5 * r, -0.4 * r],
          [-0.5 * r, 0.4 * r],
        ],
        hole,
        r * 0.09,
      ),
    );
    marks.push(
      polyline(
        [
          [0.5 * r, -0.4 * r],
          [0.5 * r, 0.4 * r],
        ],
        hole,
        r * 0.09,
      ),
    );
  }
  return place(body + marks.join(""), { turn: (turn * 360) / TURN });
}

/**
 * Returns a rock with soft shading: a smooth blob in three tones, its shade
 * a crescent on the side away from the light. It is the look the plan
 * weighed against cut facets.
 *
 * @param {RockKind} kind
 * @param {Palette} palette
 * @param {number} unit
 * @param {number} turn
 * @param {string} id A name of its own, for its clip.
 * @returns {string}
 */
function softRock(kind, palette, unit, turn, id) {
  const rock = makeRock(kind, "large", 3);
  const r = rock.radius * unit;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const points = rock.outline.map(
    ([x, y]) =>
      /** @type {Point} */ ([(x * c - y * s) * r, (x * s + y * c) * r]),
  );
  const tones = tonesOf(
    kind === "crystal"
      ? ROCK_INKS[palette.mode].stone
      : ROCK_INKS[palette.mode][kind],
    palette,
  );
  const d = blob(points);
  return [
    `<clipPath id="${id}"><path d="${d}"/></clipPath>`,
    path(d, { fill: tones.shade }),
    `<g clip-path="url(#${id})">`,
    place(path(d, { fill: tones.ink }), { x: -0.2 * r, y: -0.24 * r }),
    place(path(d, { fill: tones.lit }), { x: -0.62 * r, y: -0.72 * r }),
    "</g>",
  ].join("");
}

/** @type {import("../lib/sheet.mjs").Section[]} */
const sections = [];

// 1. Now and after.
sections.push({
  heading: "1. The seven kinds, now and after",
  note: "Each kind as the game draws it today (redrawn here: one flat ink, its marks in the field's color) and as the uplift cuts it, at 22 px a unit, the size a laptop shows. A kind is told by its silhouette and its mark before its ink.",
  height: 2 * 330 + 12,
  draw: (x, y, width) => {
    const out = [];
    [DARK, LIGHT].forEach((palette, row) => {
      const top = y + row * 342;
      out.push(panel(x, top, width, 330, palette));
      ROCK_KINDS.forEach((kind, i) => {
        const size = kind === "boulder" ? "boulder" : "large";
        const unit = kind === "boulder" ? 13 : 22;
        const cx = x + 110 + i * ((width - 220) / 6);
        out.push(
          place(todayRock(kind, size, palette, unit, 0.3), {
            x: cx,
            y: top + 96,
          }),
        );
        out.push(
          place(
            rockSvg(makeRock(kind, size, 3), palette, { turn: 0.3, unit }),
            { x: cx, y: top + 232 },
          ),
        );
        out.push(
          caption(cx, top + 312, `${NAMES[kind]}: ${TOLD_BY[kind]}`, {
            fill: palette.fieldMuted,
            anchor: "middle",
            size: 11,
          }),
        );
      });
      out.push(caption(x + 14, top + 44, "now", { fill: palette.fieldMuted }));
      out.push(
        caption(x + 14, top + 172, "after", { fill: palette.fieldMuted }),
      );
    });
    return out.join("");
  },
});

// 2. Turning under one light.
sections.push({
  heading: "2. One light, however a rock turns",
  note: "Every kind and size at eight turns, 16 px a unit. The light stays at the upper left: a face brightens as it turns toward it and darkens as it turns away, so a spinning rock reads as a solid thing. Each rock is one outline of six the game would hold for its kind and size.",
  height: 3 * 232 + 24,
  draw: (x, y, width) => {
    const out = [];
    const columns = 2;
    const cell = (width - 12) / columns;
    const kinds = ROCK_KINDS.filter((kind) => kind !== "boulder");
    kinds.forEach((kind, k) => {
      const left = x + (k % columns) * (cell + 12);
      const top = y + Math.floor(k / columns) * 244;
      out.push(panel(left, top, cell, 232, DARK, { label: NAMES[kind] }));
      SIZES_OF[kind].forEach((size, row) => {
        const rock = makeRock(kind, size, 5 + row);
        for (let t = 0; t < 8; t++) {
          out.push(
            place(rockSvg(rock, DARK, { turn: (t / 8) * TURN, unit: 16 }), {
              x: left + 70 + t * ((cell - 110) / 7),
              y: top + [64, 148, 204][row],
            }),
          );
        }
      });
    });
    return out.join("");
  },
});

// 3. The boulder, and hits held.
sections.push({
  heading: "3. Hits held",
  note: "A rock that takes more than one hit shows each it has taken as a crack more, in from its edge, the same cracks every time. The boulder holds five before its sixth breaks it; iron holds two when large and one when medium; a large lodestone holds one.",
  height: 300 + 12 + 170,
  draw: (x, y, width) => {
    const out = [
      panel(x, y, width, 300, DARK, {
        label: "Boulder, 0 to 5 hits held, 14 px a unit",
      }),
    ];
    const boulder = makeRock("boulder", "boulder", 2);
    for (let hits = 0; hits <= 5; hits++) {
      out.push(
        place(rockSvg(boulder, DARK, { turn: 0.5, unit: 14, hits }), {
          x: x + 130 + hits * ((width - 260) / 5),
          y: y + 160,
        }),
      );
      out.push(
        caption(x + 130 + hits * ((width - 260) / 5), y + 284, `${hits}`, {
          fill: DARK.fieldMuted,
          anchor: "middle",
        }),
      );
    }
    const top = y + 312;
    out.push(
      panel(x, top, width, 170, LIGHT, {
        label:
          "Iron (large 0 to 2, medium 0 to 1) and lodestone (large 0 to 1), 22 px a unit",
      }),
    );
    /** @type {[RockKind, RockSize, number][]} */
    const held = [
      ["iron", "large", 0],
      ["iron", "large", 1],
      ["iron", "large", 2],
      ["iron", "medium", 0],
      ["iron", "medium", 1],
      ["lodestone", "large", 0],
      ["lodestone", "large", 1],
    ];
    held.forEach(([kind, size, hits], i) => {
      out.push(
        place(
          rockSvg(makeRock(kind, size, 4), LIGHT, {
            turn: 0.2,
            unit: 22,
            hits,
          }),
          { x: x + 120 + i * ((width - 240) / 6), y: top + 92 },
        ),
      );
    });
    return out.join("");
  },
});

// 4. Small screens.
sections.push({
  heading: "4. At a phone's size",
  note: "The same rocks at 6 px a unit, a small phone's, and at 10. Under 10 px a unit the fine marks are left out: rivets, glints, fractures, a lodestone's field. Silhouette, facets and a volatile rock's seams stay.",
  height: 2 * 200 + 12,
  draw: (x, y, width) => {
    const out = [];
    [DARK, LIGHT].forEach((palette, half) => {
      const top = y + half * 212;
      out.push(panel(x, top, width, 200, palette));
      [6, 10].forEach((unit, row) => {
        let cx = x + 80;
        out.push(
          caption(x + 14, top + 66 + row * 86, `${unit} px a unit`, {
            fill: palette.fieldMuted,
            size: 11,
          }),
        );
        for (const kind of ROCK_KINDS) {
          for (const size of SIZES_OF[kind]) {
            const r = ROCK_RADIUS[size] * unit;
            cx += r + 9;
            out.push(
              place(
                rockSvg(makeRock(kind, size, 3), palette, { turn: 0.4, unit }),
                { x: cx, y: top + 60 + row * 86 },
              ),
            );
            cx += r + 9;
          }
          cx += 22;
        }
      });
    });
    return out.join("");
  },
});

// 5. Four palettes.
sections.push({
  heading: "5. In the four palettes",
  note: "The rocks keep the game's own inks, a set for light palettes and one for dark, and take their lit and shaded tones from mixes with white and with the palette's field or text. Nothing new is added to a palette.",
  height: 2 * 150 + 12,
  draw: (x, y, width) => {
    const out = [];
    Object.values(PALETTES).forEach((palette, i) => {
      const left = x + (i % 2) * (width / 2 + 6);
      const top = y + Math.floor(i / 2) * 162;
      const w = width / 2 - 6;
      out.push(panel(left, top, w, 150, palette));
      ROCK_KINDS.forEach((kind, k) => {
        const size = kind === "boulder" ? "boulder" : "large";
        out.push(
          place(
            rockSvg(makeRock(kind, size, 6), palette, {
              turn: 1.1,
              unit: kind === "boulder" ? 9 : 15,
            }),
            { x: left + 70 + k * ((w - 130) / 6), y: top + 84 },
          ),
        );
      });
    });
    return out.join("");
  },
});

// 6. Three ways.
sections.push({
  heading: "6. Three ways to draw a rock, and why the plan cuts it",
  note: "Flat, as now. Soft, a smooth blob with a crescent of shade. Cut, in facets. Each is shown at three turns. The soft rock's crescent has to be cut out of its outline again at every turn, which the game's renderer has no cheap way to do; a rock baked with its shade on would carry its shadow round with it as it spins. A cut rock needs only one flat color a face, and a face's color follows from how it lies to the light.",
  height: 2 * 190 + 12,
  draw: (x, y, width) => {
    const out = [];
    [DARK, LIGHT].forEach((palette, half) => {
      const top = y + half * 202;
      out.push(panel(x, top, width, 190, palette));
      const turns = [0.3, 2.3, 4.3];
      ["Flat (now)", "Soft", "Cut (the plan)"].forEach((name, way) => {
        const cx = x + 60 + way * ((width - 60) / 3);
        out.push(
          caption(cx + 190, top + 176, name, {
            fill: palette.fieldMuted,
            anchor: "middle",
          }),
        );
        turns.forEach((turn, t) => {
          const at = { x: cx + 60 + t * 130, y: top + 92 };
          const kind = /** @type {RockKind} */ (["stone", "ice", "iron"][t]);
          if (way === 0)
            out.push(place(todayRock(kind, "large", palette, 18, turn), at));
          if (way === 1)
            out.push(
              place(
                softRock(kind, palette, 18, turn, `soft-${palette.id}-${t}`),
                at,
              ),
            );
          if (way === 2)
            out.push(
              place(
                rockSvg(makeRock(kind, "large", 3), palette, {
                  turn,
                  unit: 18,
                }),
                at,
              ),
            );
        });
      });
    });
    return out.join("");
  },
});

// 7. What the game gets.
sections.push({
  heading: "7. What the game gets of a rock",
  note: "Left to right: its inks alone, which is the picture; its normal map, each face in the color of the way it points; the two together under the field's light; the same a quarter turn on; and with a blast going off beside it, whose light the faces turned to it take. Every one is polygons in flat colors, which the game's renderer already draws.",
  height: 3 * 150 + 24,
  draw: (x, y, width) => {
    const out = [];
    /** @type {RockKind[]} */
    const kinds = ["stone", "iron", "ice"];
    const labels = [
      "inks",
      "normal map",
      "lit",
      "lit, a quarter turn on",
      "lit, beside a blast",
    ];
    kinds.forEach((kind, row) => {
      const top = y + row * 162;
      out.push(panel(x, top, width, 150, DARK, { label: NAMES[kind] }));
      const rock = makeRock(kind, "large", 8);
      const unit = 20;
      labels.forEach((label, i) => {
        const cx = x + 170 + i * ((width - 340) / 4);
        const look =
          i === 0
            ? { as: /** @type {const} */ ("ink") }
            : i === 1
              ? { as: /** @type {const} */ ("normal") }
              : i === 3
                ? { turn: 0.3 + TURN / 4 }
                : i === 4
                  ? {
                      lamps: [
                        {
                          at: /** @type {Point} */ ([110, 40]),
                          color: ROCK_INKS.dark.core,
                          strength: 1,
                          reach: 260,
                        },
                      ],
                    }
                  : {};
        if (i === 4) {
          out.push(
            `<circle cx="${cx + 110}" cy="${top + 80 + 40}" r="46" fill="url(#glow-core-casino)" opacity="0.9"/>`,
          );
          out.push(circle(cx + 110, top + 120, 9, ROCK_INKS.dark.core));
        }
        out.push(
          place(
            rockSvg(rock, DARK, { turn: 0.3, unit, outline: i !== 1, ...look }),
            { x: cx, y: top + 80 },
          ),
        );
        out.push(
          caption(cx, top + 140, label, {
            fill: DARK.fieldMuted,
            anchor: "middle",
            size: 11,
          }),
        );
      });
    });
    return out.join("");
  },
});

/**
 * Writes the sheet and its preview.
 *
 * @returns {Promise<void>}
 */
export async function build() {
  const svg = sheetFile({
    title: "Rocks",
    lead: "The seven kinds of rock, cut in facets and lit from one side. Drawn by art/sheets/rocks.mjs from art/lib/rocks.mjs; nothing is traced or copied.",
    sections,
    defs: Object.values(PALETTES).map(rockDefs).join(""),
  });
  await writeText(join(here, "../rocks.svg"), svg);
  await writeRaster(svg, join(here, "../preview/rocks.png"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await build();
  console.log("rocks.svg");
}
