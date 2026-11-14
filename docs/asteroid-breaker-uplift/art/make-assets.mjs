// Writes the uplift's art as the game could use it, the same bytes every
// run, into ../assets/art/:
//
//   node docs/asteroid-breaker-uplift/art/make-assets.mjs           everything
//   node docs/asteroid-breaker-uplift/art/make-assets.mjs rocks     only those groups
//
// The game draws its art at run time, in the palette on the page, from
// shapes. So what it would take from here is the geometry (geometry/*.json:
// points, facets and the way each faces, in field units, with roles in
// place of colors). The atlases and sprites are the same art as pictures,
// for anything that wants pictures, and to see what the geometry draws.
// ../assets/art/README.md says what each file holds.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { atlasJson, pack, writeAtlas } from "./lib/atlas.mjs";
import { svgFile } from "./lib/core.mjs";
import { PALETTES } from "./lib/palettes.mjs";
import {
  LIGHT,
  ROCK_KINDS,
  SIZES_OF,
  cracksOf,
  makeRock,
  rockDefs,
  rockSvg,
} from "./lib/rocks.mjs";

/** @import { Point } from "./lib/core.mjs" */
/** @import { Palette } from "./lib/palettes.mjs" */
/** @import { RockKind, RockShape, RockSize } from "./lib/rocks.mjs" */

const here = import.meta.dirname;
const out = join(here, "../assets/art");

/**
 * The pixels a field unit takes in the atlases: what a window 960 px tall
 * shows. The geometry draws at any size; the game bakes its own art at up to 32.
 */
export const ATLAS_UNIT = 24;

/** The palette each mode's pictures are drawn in; the geometry serves all four. */
export const MODES = { dark: PALETTES.casino, light: PALETTES.classic };

/** How many outlines each kind and size of rock has, as the game holds six today. */
const OUTLINES = 6;

/** How far a kind's picture reaches past its radius: a glow, gems, a lodestone's field. */
const REACH = /** @type {Record<RockKind, number>} */ ({
  stone: 1.12,
  ice: 1.12,
  iron: 1.12,
  boulder: 1.12,
  volatile: 1.32,
  lodestone: 1.42,
  crystal: 1.5,
});

/** The most hits a kind holds at a size before the one that breaks it. */
const HELD = /** @type {Partial<Record<RockKind, Partial<Record<RockSize, number>>>>} */ ({
  boulder: { boulder: 5 },
  iron: { large: 2, medium: 1 },
  lodestone: { large: 1 },
});

/**
 * Returns a number to four places, which is finer than a pixel at any size
 * the game draws.
 *
 * @param {number} value
 * @returns {number}
 */
const fine = (value) => Math.round(value * 1e4) / 1e4;

/** @param {readonly Point[]} points */
const fineAll = (points) => points.map(([x, y]) => [fine(x), fine(y)]);

/**
 * Writes a file, making its folder first.
 *
 * @param {string} file
 * @param {string} content
 * @returns {Promise<void>}
 */
async function write(file, content) {
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, content);
}

/**
 * Writes the rocks: their geometry, and an atlas in seven layers that share
 * one map.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function rocks() {
  /** @type {Map<string, RockShape>} */
  const shapes = new Map();
  for (const kind of ROCK_KINDS) {
    for (const size of SIZES_OF[kind]) {
      for (let i = 1; i <= OUTLINES; i++) {
        shapes.set(`${kind}-${size}-${i}`, makeRock(kind, size, i));
      }
    }
  }
  await write(
    join(out, "geometry/rocks.json"),
    `${JSON.stringify({
      about:
        "Every outline of every kind and size of rock, in units of its own radius, y down. A facet's normal has z toward the viewer; light it by the dot of that normal, turned with the rock, and the light. Tones name which of an ink's four tones or which role a mark takes.",
      light: LIGHT.map(fine),
      rocks: [...shapes].map(([name, rock]) => ({
        name,
        kind: rock.kind,
        size: rock.size,
        radius: rock.radius,
        outline: fineAll(rock.outline),
        rim: fineAll(rock.rim),
        facets: rock.facets.map(({ points, normal, part }) => ({
          part,
          normal: normal.map(fine),
          points: fineAll(points),
        })),
        strokes: rock.strokes.map(({ points, tone, width }) => ({
          tone,
          width: fine(width),
          points: fineAll(points),
        })),
        dots: rock.dots.map(({ at, r, tone }) => ({
          tone,
          at: [fine(at[0]), fine(at[1])],
          r: fine(r),
        })),
        glows: rock.glows.map(({ at, r, tone, strength }) => ({
          tone,
          at: [fine(at[0]), fine(at[1])],
          r: fine(r),
          strength,
        })),
        aura: rock.aura.map(({ points, width }) => ({
          width: fine(width),
          points: fineAll(points),
        })),
        cracks: cracksOf(rock, HELD[rock.kind]?.[rock.size] ?? 0).map(fineAll),
      })),
    })}\n`,
  );

  const packed = pack(
    [...shapes].map(([name, rock]) => {
      const half = Math.ceil(rock.radius * REACH[rock.kind] * ATLAS_UNIT) + 1;
      return { name, w: half * 2, h: half * 2 };
    }),
  );
  /** @type {[string, Palette, "lit" | "normal" | "ink" | "glow"][]} */
  const layers = [
    ["rocks-ink-dark", MODES.dark, "ink"],
    ["rocks-ink-light", MODES.light, "ink"],
    ["rocks-normal", MODES.dark, "normal"],
    ["rocks-glow-dark", MODES.dark, "glow"],
    ["rocks-glow-light", MODES.light, "glow"],
    ["rocks-lit-dark", MODES.dark, "lit"],
    ["rocks-lit-light", MODES.light, "lit"],
  ];
  for (const [file, palette, as] of layers) {
    await writeAtlas(join(out, "atlas", `${file}.png`), packed, (name, frame) => {
      const rock = /** @type {RockShape} */ (shapes.get(name));
      return svgFile(
        frame.w,
        frame.h,
        `<g transform="translate(${frame.w / 2} ${frame.h / 2})">${rockSvg(rock, palette, { unit: ATLAS_UNIT, outline: false, as })}</g>`,
        { defs: rockDefs(palette) },
      );
    });
  }
  await write(
    join(out, "atlas/rocks.json"),
    atlasJson(
      packed,
      layers.map(([file]) => `${file}.png`),
      ATLAS_UNIT,
      (name) => {
        const rock = /** @type {RockShape} */ (shapes.get(name));
        return { kind: rock.kind, size: rock.size, radius: rock.radius };
      },
    ),
  );
  return `rocks: ${shapes.size} outlines, an atlas of ${packed.width} by ${packed.height} in ${layers.length} layers`;
}

/** Every group of assets, by the name it is asked for by. */
const GROUPS = /** @type {Record<string, () => Promise<string>>} */ ({ rocks });

const asked = process.argv.slice(2);
for (const [name, group] of Object.entries(GROUPS)) {
  if (asked.length > 0 && !asked.includes(name)) continue;
  console.log(await group());
}
