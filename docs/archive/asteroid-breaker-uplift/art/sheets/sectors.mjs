// Draws the sectors' sheet, ../sectors.svg, and its preview: the backdrop
// behind the play, one look for each sector.
//
//   node docs/archive/asteroid-breaker-uplift/art/sheets/sectors.mjs

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  TURN,
  attrs,
  between,
  hexOf,
  luminance,
  place,
  rect,
  seeded,
  svgFile,
} from "../lib/core.mjs";
import {
  SECTORS,
  SECTOR_NAMES,
  backdropDefs,
  backdropSvg,
  fieldSvg,
  makeBackdrop,
  todayBackdropSvg,
} from "../lib/backdrop.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { ROCK_RADIUS, makeRock, rockDefs, rockSvg } from "../lib/rocks.mjs";
import { SHEET, caption, sheetFile } from "../lib/sheet.mjs";
import { sharp, writeRaster, writeText } from "../lib/raster.mjs";

/** @import { BackdropLayer, Sector } from "../lib/backdrop.mjs" */
/** @import { Palette } from "../lib/palettes.mjs" */
/** @import { RockKind, RockSize } from "../lib/rocks.mjs" */

const here = import.meta.dirname;

/** The seed every backdrop on the sheet strews its stars and its air from. */
const SEED = 7;

/** A laptop's field and a phone's held upright, in field units. */
const WIDE = { width: 72, height: 40 };
const TALL = { width: 40, height: 72 };

/**
 * The dozen rocks strewn over each sector, of the kinds its waves send: the
 * first two where its landmark lies, so they are read against it.
 *
 * @type {Record<Sector, { rocks: [RockKind, RockSize][], pinned: [number, number][] }>}
 */
const STREWN = {
  "inner-belt": {
    rocks: [
      ["stone", "large"],
      ["ice", "medium"],
      ["stone", "large"],
      ["ice", "large"],
      ["crystal", "large"],
      ["stone", "large"],
      ["ice", "large"],
      ["stone", "medium"],
      ["crystal", "medium"],
      ["stone", "medium"],
      ["stone", "small"],
      ["ice", "small"],
      ["stone", "small"],
    ],
    pinned: [
      [0.8, 0.82],
      [0.5, 0.86],
    ],
  },
  "iron-reach": {
    rocks: [
      ["iron", "large"],
      ["stone", "medium"],
      ["iron", "large"],
      ["volatile", "large"],
      ["iron", "large"],
      ["stone", "large"],
      ["iron", "medium"],
      ["volatile", "medium"],
      ["iron", "medium"],
      ["ice", "medium"],
      ["iron", "small"],
      ["iron", "small"],
    ],
    pinned: [
      [0.88, 0.3],
      [0.66, 0.44],
    ],
  },
  storm: {
    rocks: [
      ["lodestone", "large"],
      ["volatile", "medium"],
      ["lodestone", "large"],
      ["volatile", "large"],
      ["iron", "large"],
      ["volatile", "large"],
      ["lodestone", "medium"],
      ["lodestone", "medium"],
      ["ice", "small"],
      ["stone", "small"],
      ["lodestone", "small"],
      ["ice", "small"],
      ["stone", "small"],
    ],
    pinned: [
      [0.13, 0.42],
      [0.24, 0.78],
    ],
  },
  endless: {
    rocks: [
      ["boulder", "boulder"],
      ["crystal", "large"],
      ["stone", "large"],
      ["ice", "large"],
      ["iron", "large"],
      ["lodestone", "large"],
      ["volatile", "medium"],
      ["stone", "medium"],
      ["ice", "medium"],
      ["iron", "small"],
      ["lodestone", "small"],
      ["stone", "small"],
    ],
    pinned: [
      [0.52, 0.5],
      [0.3, 0.7],
    ],
  },
};

/**
 * @typedef {object} Strewn A rock laid on a field.
 * @property {RockKind} kind
 * @property {RockSize} size
 * @property {number} u How far across the field it lies, 0 to 1.
 * @property {number} v How far down the field it lies, 0 to 1.
 * @property {number} turn
 * @property {number} seed
 */

/**
 * Returns where a sector's rocks lie, as shares of the field, clear of each
 * other and of the edges on a wide field and on a tall one.
 *
 * @param {Sector} sector
 * @returns {Strewn[]}
 */
function strew(sector) {
  const random = seeded(SECTORS.indexOf(sector) * 53 + 11);
  const { rocks, pinned } = STREWN[sector];
  /** @type {Strewn[]} */
  const laid = [];
  const clear = (
    /** @type {number} */ u,
    /** @type {number} */ v,
    /** @type {number} */ r,
  ) =>
    [WIDE, TALL].every(({ width, height }) => {
      const x = u * width;
      const y = v * height;
      if (
        x < r + 0.6 ||
        x > width - r - 0.6 ||
        y < r + 0.6 ||
        y > height - r - 0.6
      )
        return false;
      return laid.every((other) => {
        const gap = Math.hypot(x - other.u * width, y - other.v * height);
        return gap > r + ROCK_RADIUS[other.size] + 1.4;
      });
    });
  rocks.forEach(([kind, size], i) => {
    const r = ROCK_RADIUS[size];
    let [u, v] = pinned[i] ?? [random(), random()];
    for (let tries = 0; tries < 400 && !clear(u, v, r); tries++) {
      u = random();
      v = random();
    }
    laid.push({
      kind,
      size,
      u,
      v,
      turn: between(random, 0, TURN),
      seed: 3 + i,
    });
  });
  return laid;
}

const LAID = /** @type {Record<Sector, Strewn[]>} */ (
  Object.fromEntries(SECTORS.map((sector) => [sector, strew(sector)]))
);

/**
 * Returns a field's rocks and a burst of shots drawn over it, in pixels from
 * its top left corner.
 *
 * @param {Sector} sector
 * @param {{ width: number, height: number }} field
 * @param {number} unit
 * @param {Palette} palette
 * @returns {string}
 */
function playSvg(sector, { width, height }, unit, palette) {
  const parts = LAID[sector].map(({ kind, size, u, v, turn, seed }) =>
    place(rockSvg(makeRock(kind, size, seed), palette, { turn, unit }), {
      x: u * width * unit,
      y: v * height * unit,
    }),
  );
  // Five shots in a row, as far apart as the gun lays them, in the field's text, as the game draws them.
  const heading = -0.62;
  for (let i = 0; i < 5; i++) {
    const x = (0.34 * width + Math.cos(heading) * (3 + i * 4.48)) * unit;
    const y = (0.66 * height + Math.sin(heading) * (3 + i * 4.48)) * unit;
    const long = 0.72 * unit;
    const thick = Math.max(1.6, 0.3 * unit);
    parts.push(
      `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${((heading * 360) / TURN).toFixed(1)})">`,
      `<circle r="${(1.05 * unit).toFixed(2)}" fill="url(#backdrop-${palette.id}-text-bell)" opacity="0.3"/>`,
      `<rect${attrs({
        x: -long / 2,
        y: -thick / 2,
        width: long,
        height: thick,
        rx: thick / 2,
        fill: palette.fieldText,
        stroke: palette.field,
        "stroke-width": Math.max(0.8, 0.09 * unit),
        "paint-order": "stroke",
      })}/>`,
      "</g>",
    );
  }
  return parts.join("");
}

/**
 * @typedef {object} Scene A field to show.
 * @property {Sector} sector
 * @property {Palette} palette
 * @property {{ width: number, height: number }} field
 * @property {number} unit
 * @property {boolean} [today] Whether the backdrop is today's: the flat field and its specks.
 * @property {boolean} [bare] Whether the rocks and the shots are left off.
 * @property {boolean} [grey] Whether every color is turned to the grey of its lightness.
 * @property {readonly BackdropLayer[]} [layers]
 * @property {number} [time]
 */

/**
 * Returns a field with its backdrop, clipped to it, at a place on the sheet.
 *
 * @param {number} x
 * @param {number} y
 * @param {Scene} scene
 * @returns {string}
 */
function sceneSvg(
  x,
  y,
  {
    sector,
    palette,
    field,
    unit,
    today = false,
    bare = false,
    grey = false,
    layers,
    time = 0,
  },
) {
  const backdrop = today
    ? todayBackdropSvg({ ...field, unit, seed: SEED }, palette)
    : backdropSvg(
        {
          sector,
          ...field,
          unit,
          seed: SEED,
          time,
          ...(layers ? { layers } : {}),
        },
        palette,
      );
  const drawn = fieldSvg(
    x,
    y,
    field.width * unit,
    field.height * unit,
    backdrop + (bare ? "" : playSvg(sector, field, unit, palette)),
    palette,
  );
  const frame = rect(
    x - 0.5,
    y - 0.5,
    field.width * unit + 1,
    field.height * unit + 1,
    "none",
    {
      stroke: palette.mode === "light" ? SHEET.line : palette.fieldLine,
      "stroke-width": 1,
    },
  );
  return (grey ? greyed(drawn) : drawn) + frame;
}

/**
 * Returns the grey as light as a color.
 *
 * @param {string} hex
 * @returns {string}
 */
function greyOf(hex) {
  const light = luminance(hex);
  const value =
    light <= 0.0031308 ? light * 12.92 : 1.055 * light ** (1 / 2.4) - 0.055;
  return hexOf([value * 255, value * 255, value * 255]);
}

/**
 * Returns an SVG with every color in it turned to the grey as light as it
 * is, and every gradient it names to that gradient's grey twin, which
 * `greyed()` of the defs makes. No filter does this: each color is worked
 * out.
 *
 * @param {string} svg
 * @returns {string}
 */
function greyed(svg) {
  return svg
    .replace(/url\(#([^)]+)\)/g, "url(@$1-grey)")
    .replace(/ id="([^"]+)"/g, ' id="$1-grey"')
    .replace(/#[0-9a-fA-F]{6}\b/g, greyOf)
    .replace(/url\(@/g, "url(#");
}

/**
 * Returns the most any large shape of a backdrop stands out from the field,
 * as a contrast ratio, measured from its picture: the wash, the landmark's
 * faces and billows and the vignette, without the stars, the specks and the
 * hair lines.
 *
 * @param {Sector} sector
 * @param {Palette} palette
 * @returns {Promise<number>}
 */
async function largestContrast(sector, palette) {
  const unit = 4;
  const inner = backdropSvg(
    {
      sector,
      ...WIDE,
      unit,
      seed: SEED,
      layers: ["wash", "landmark", "vignette"],
    },
    palette,
  )
    .replace(/<circle[^>]*\/>/g, "")
    .replace(/<polyline[^>]*\/>/g, "");
  const svg = svgFile(WIDE.width * unit, WIDE.height * unit, inner, {
    defs: backdropDefs(palette),
    background: palette.field,
  });
  const { data, info } = await sharp(Buffer.from(svg))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const field = luminance(palette.field);
  let most = 1;
  for (let i = 0; i < data.length; i += info.channels) {
    const light = luminance(
      hexOf([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]),
    );
    most = Math.max(
      most,
      (Math.max(light, field) + 0.05) / (Math.min(light, field) + 0.05),
    );
  }
  return most;
}

/**
 * Returns a row of fields, one for each sector, with each one's name under
 * it.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} gap
 * @param {Omit<Scene, "sector">} scene
 * @param {(sector: Sector) => string} [named]
 * @returns {string}
 */
function sectorRow(x, y, gap, scene, named = (sector) => SECTOR_NAMES[sector]) {
  const wide = scene.field.width * scene.unit;
  return SECTORS.map(
    (sector, i) =>
      sceneSvg(x + i * (wide + gap), y, { ...scene, sector }) +
      caption(
        x + i * (wide + gap),
        y + scene.field.height * scene.unit + 17,
        named(sector),
        { fill: SHEET.ink },
      ),
  ).join("");
}

/** What each sector's backdrop is, in a line. */
const LOOKS = /** @type {Record<Sector, string>} */ ({
  "inner-belt":
    "Inner belt: a ringed planet's limb low on the right, in a warm, calm wash",
  "iron-reach":
    "Iron reach: a cratered moon in a broken girder ring, in cold steel with dark pools",
  storm:
    "Storm: a thunderhead up the left side with forks inside it, wind across an ember wash",
  endless:
    "Endless: a galaxy's band from corner to corner, the wave's constellation over it",
});

/**
 * Returns the sheet's sections, given how far each backdrop's large shapes
 * stand out from the field.
 *
 * @param {Record<string, number>} measured The largest contrast, by palette and sector.
 * @returns {import("../lib/sheet.mjs").Section[]}
 */
function sectionsOf(measured) {
  /** @type {import("../lib/sheet.mjs").Section[]} */
  const sections = [];
  const { casino, midnight, classic, pastel } = PALETTES;

  sections.push({
    heading: "1. The four places, in Casino night",
    note: "A laptop's field, 72 by 40 units at 10 px a unit, each with a dozen rocks of its sector's kinds and a burst of shots. The rocks and the shots should be the first things seen.",
    height: 2 * 426 + 14,
    draw: (x, y) =>
      SECTORS.map((sector, i) => {
        const left = x + 20 + (i % 2) * 760;
        const top = y + Math.floor(i / 2) * 440;
        return (
          sceneSvg(left, top, {
            sector,
            palette: casino,
            field: WIDE,
            unit: 10,
          }) + caption(left, top + 418, LOOKS[sector], { fill: SHEET.ink })
        );
      }).join(""),
  });

  sections.push({
    heading: "2. In the other three palettes",
    note: "The same fields at 5 px a unit. In a light palette space is white: the wash is a pale tint, the stars are dark specks, and a landmark is paper left dry in the wash, its shade in pale ink.",
    height: 3 * 240,
    draw: (x, y) =>
      [midnight, classic, pastel]
        .map((palette, row) =>
          sectorRow(
            x,
            y + row * 240,
            26.66,
            { palette, field: WIDE, unit: 5 },
            (sector) => `${palette.name}: ${SECTOR_NAMES[sector]}`,
          ),
        )
        .join(""),
  });

  sections.push({
    heading: "3. A phone, upright",
    note: "A tall field, 40 by 72 units at 6 px a unit. A landmark keeps its size and its corner, so the short side shows more of it; the wash stretches the way the field is long.",
    height: 2 * 466,
    draw: (x, y) =>
      [casino, classic]
        .map((palette, row) =>
          sectorRow(
            x + 20,
            y + row * 466,
            40,
            { palette, field: TALL, unit: 6 },
            (sector) => `${palette.name}: ${SECTOR_NAMES[sector]}`,
          ),
        )
        .join(""),
  });

  sections.push({
    heading: "4. Layer by layer",
    note: "Storm at 5 px a unit, back to front: the far wash, the stars in three depths, the landmark, the air and the vignette, each alone, then all five together, the landmark as a fork flickers, a third of a second every eleven or so, and the whole under the play.",
    height: 2 * 480 - 14,
    draw: (x, y) => {
      const flash = makeBackdrop({ sector: "storm", ...WIDE }).landmark.find(
        (mark) => mark.is === "line" && mark.flicker,
      );
      const time =
        flash && flash.is === "line" && flash.flicker
          ? flash.flicker.after + 0.05
          : 0;
      return [casino, classic]
        .map((palette, half) => {
          /** @type {[string, Partial<Scene>][]} */
          const frames = [
            ["the far wash", { bare: true, layers: ["wash"] }],
            ["the stars", { bare: true, layers: ["stars"] }],
            ["the landmark", { bare: true, layers: ["landmark"] }],
            ["the air", { bare: true, layers: ["air"] }],
            ["the vignette", { bare: true, layers: ["vignette"] }],
            ["all together", { bare: true }],
            [
              "the landmark at a flicker",
              { bare: true, layers: ["landmark"], time },
            ],
            ["under the play", {}],
          ];
          return frames
            .map(([name, more], i) => {
              const left = x + (i % 4) * 386.66;
              const top = y + half * 480 + Math.floor(i / 4) * 233;
              return (
                sceneSvg(left, top, {
                  sector: "storm",
                  palette,
                  field: WIDE,
                  unit: 5,
                  ...more,
                }) +
                caption(left, top + 217, `${palette.name}: ${name}`, {
                  fill: SHEET.ink,
                })
              );
            })
            .join("");
        })
        .join("");
    },
  });

  sections.push({
    heading: "5. The greyscale test",
    note: "Every color turned to the grey as light as it is, at 4 px a unit, beside today's flat field. Under each: the most any large shape of that backdrop stands out from the field, which the direction holds under 1.5 to 1.",
    height: 2 * 200,
    draw: (x, y) =>
      [casino, classic]
        .map((palette, row) => {
          const top = y + row * 200;
          const scene = { palette, field: WIDE, unit: 4, grey: true };
          return (
            sceneSvg(x, top, { ...scene, sector: "inner-belt", today: true }) +
            caption(x, top + 177, `${palette.name}: today`, {
              fill: SHEET.ink,
            }) +
            sectorRow(
              x + 308,
              top,
              20,
              scene,
              (sector) =>
                `${SECTOR_NAMES[sector]}, ${(measured[`${palette.id}:${sector}`] ?? 1).toFixed(2)} to 1`,
            )
          );
        })
        .join(""),
  });

  sections.push({
    heading: "6. Now and after",
    note: "Today's backdrop, the field's flat color under specks of one size, beside the Inner belt's, with the same rocks on both.",
    height: 2 * 440 - 14,
    draw: (x, y) =>
      [casino, classic]
        .map((palette, row) => {
          const top = y + row * 440;
          const scene = {
            sector: /** @type {Sector} */ ("inner-belt"),
            palette,
            field: WIDE,
            unit: 10,
          };
          return (
            sceneSvg(x + 20, top, { ...scene, today: true }) +
            caption(x + 20, top + 418, `${palette.name}: now`, {
              fill: SHEET.ink,
            }) +
            sceneSvg(x + 780, top, scene) +
            caption(x + 780, top + 418, `${palette.name}: after`, {
              fill: SHEET.ink,
            })
          );
        })
        .join(""),
  });

  return sections;
}

/**
 * Writes the sheet and its preview.
 *
 * @returns {Promise<void>}
 */
export async function build() {
  /** @type {Record<string, number>} */
  const measured = {};
  for (const palette of Object.values(PALETTES)) {
    for (const sector of SECTORS)
      measured[`${palette.id}:${sector}`] = await largestContrast(
        sector,
        palette,
      );
  }
  const defs = Object.values(PALETTES)
    .map((palette) => rockDefs(palette) + backdropDefs(palette))
    .join("");
  const svg = sheetFile({
    title: "Sectors",
    lead: "What lies behind the play: a far wash, stars in three depths, one landmark, the sector's air and a vignette, in each sector's own look and each palette's own colors. Drawn by art/sheets/sectors.mjs from art/lib/backdrop.mjs; nothing is traced or copied.",
    sections: sectionsOf(measured),
    defs: defs + greyed(defs),
  });
  await writeText(join(here, "../sectors.svg"), svg);
  await writeRaster(svg, join(here, "../preview/sectors.png"));
  console.table(
    Object.fromEntries(
      Object.values(PALETTES).map((palette) => [
        palette.name,
        Object.fromEntries(
          SECTORS.map((sector) => [
            sector,
            Number((measured[`${palette.id}:${sector}`] ?? 1).toFixed(3)),
          ]),
        ),
      ]),
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await build();
  console.log("sectors.svg");
}
