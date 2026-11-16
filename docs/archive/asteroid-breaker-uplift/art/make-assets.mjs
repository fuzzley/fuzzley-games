// Writes the uplift's art as the game could use it, the same bytes every
// run, into ../assets/art/:
//
//   node docs/archive/asteroid-breaker-uplift/art/make-assets.mjs           everything
//   node docs/archive/asteroid-breaker-uplift/art/make-assets.mjs rocks     only those groups
//
// The game draws its art at run time, in the palette on the page, from
// shapes. So what it would take from here is the geometry (geometry/*.json:
// points, facets and the way each faces, in field units, with roles in
// place of colors). The atlases and sprites are the same art as pictures,
// for anything that wants pictures, and to see what the geometry draws.
// ../assets/art/README.md says what each file holds.
//
// A group is one function below: rocks, pods, fuzzball, bubbles, pickups,
// hazards, energy and backdrops. Two atlases hold more than one group's
// pictures: the hulls', which `pods()` writes with the comet's head in it,
// and the things', which `things()` packs from five groups' sprites
// whenever any of them is asked for.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { atlasJson, pack, writeAtlas } from "./lib/atlas.mjs";
import {
  LIMITS,
  PARALLAX,
  SECTORS,
  SECTOR_NAMES,
  STAR_SHARES,
  backdropDefs,
  backdropSvg,
  fieldSvg,
  makeBackdrop,
  starCount,
} from "./lib/backdrop.mjs";
import {
  circle,
  ellipse,
  num,
  path,
  polygon,
  polyline,
  rect,
  ring,
  svgFile,
} from "./lib/core.mjs";
import {
  BODY,
  FACES,
  FACE_USES,
  FUR_WIDTH,
  GRID,
  LOOK,
  SMALL_UNDER,
  STRANDS,
  fuzzballShape,
} from "./lib/fuzzball.mjs";
import {
  SHELL_RADIUS,
  energyOf,
  flameSvg,
  glow,
  glowDefs,
  halo,
  makeShot,
  muzzleFlashSvg,
  shellSvg,
  shotSvg,
} from "./lib/fx.mjs";
import { EYE_INK, GLINT, PALETTES, tonesOf } from "./lib/palettes.mjs";
import { sharp, writeRaster } from "./lib/raster.mjs";
import {
  LIGHT,
  ROCK_KINDS,
  SIZES_OF,
  cracksOf,
  litBy,
  makeRock,
  normalColor,
  rockDefs,
  rockSvg,
  toneAt,
} from "./lib/rocks.mjs";
import {
  PODS,
  POD_LENGTH,
  POD_VARIANTS,
  RINGS,
  pilotSize,
  podTones,
} from "./lib/ship.mjs";
import {
  STRAY_FILL,
  STRAY_RADIUS,
  TOWARD_LIGHT,
  TOW_RADIUS,
  bubbleSvg,
  towLine,
} from "./lib/strays.mjs";
import {
  BURR_RADIUS,
  MOTE_SIZES,
  ORB,
  PICKUP_GROUPS,
  PICKUP_IDS,
  PICKUP_NAMES,
  burrSvg,
  cometSvg,
  makeBurr,
  makeComet,
  makeSymbol,
  moteSvg,
  orbSvg,
  symbolSvg,
} from "./lib/things.mjs";

/** @import { Frame } from "./lib/atlas.mjs" */
/** @import { Point, Vec3 } from "./lib/core.mjs" */
/** @import { EyeMark, FuzzballShape, SparkMark } from "./lib/fuzzball.mjs" */
/** @import { WeaponId } from "./lib/fx.mjs" */
/** @import { Palette } from "./lib/palettes.mjs" */
/** @import { RockKind, RockShape, RockSize } from "./lib/rocks.mjs" */
/** @import { PickupGroup } from "./lib/things.mjs" */

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
const HELD =
  /** @type {Partial<Record<RockKind, Partial<Record<RockSize, number>>>>} */ ({
    boulder: { boulder: 5 },
    iron: { large: 2, medium: 1 },
    lodestone: { large: 1 },
  });

/** The pixels a field unit takes in the sprites written as SVG. */
const SPRITE_UNIT = 32;

/** The pixels a field unit takes in the backdrops' pictures. */
const BACKDROP_UNIT = 20;

/** The seed the backdrops' stars and air are strewn from. */
const BACKDROP_SEED = 1;

/** The fields a backdrop is made for, in field units: a laptop's, and a phone's held upright. */
const FIELDS = [
  { suffix: "", width: 72, height: 40 },
  { suffix: "-tall", width: 40, height: 72 },
];

/**
 * How many field units a unit of the fuzzball's grid takes in a picture: its
 * grid of 32 is 64 pixels across in the atlas, more than the field shows it at.
 */
const GRID_SCALE = 1 / 12;

/** The color a sprite to be tinted is drawn in. */
const WHITE = "#ffffff";

/** The static charge's whole tiers, the chain's x1 to x4. */
const TIERS = [0, 1, 2, 3];

/** The four weapons, the gun first. */
const WEAPONS = /** @type {WeaponId[]} */ (["gun", "spread", "rapid", "lance"]);

/** The three sizes of spark, by name, smallest first, as `MOTE_SIZES` has them. */
const SPARKS = ["small", "medium", "large"];

/**
 * How much of the orb's symbol's square each group's symbol takes, which
 * `orbSvg()` keeps to itself.
 */
const SYMBOL_SHARE = /** @type {Record<PickupGroup, number>} */ ({
  weapon: 1,
  guard: 0.86,
  field: 0.96,
});

/**
 * The comet's warning, in field units from the point on the field's edge the
 * comet comes in by, pointing along x into the field, which `warningSvg()`
 * keeps to itself: a bar on the edge, and three chevrons of one shape about
 * its own middle, each at a place along x and a size, the pen's width the
 * same for all three.
 */
const WARNING = {
  bar: {
    points: /** @type {Point[]} */ ([
      [0, -1.15],
      [0, 1.15],
    ]),
    width: 0.36,
  },
  chevron: {
    points: /** @type {Point[]} */ ([
      [-0.4, -0.8],
      [0.4, 0],
      [-0.4, 0.8],
    ]),
    width: 0.3,
  },
  chevrons: [
    { x: 0.95, size: 1 },
    { x: 2, size: 0.86 },
    { x: 3.05, size: 0.72 },
  ],
};

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
 * Returns plain data with every number in it to four places.
 *
 * @template T
 * @param {T} data
 * @returns {T}
 */
function fineDeep(data) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "number" ? fine(value) : value,
    ),
  );
}

/**
 * Writes a group's geometry as compact JSON, its numbers to four places,
 * under a line that says how to read it.
 *
 * @param {string} name
 * @param {string} about
 * @param {Record<string, unknown>} data
 * @returns {Promise<void>}
 */
async function writeGeometry(name, about, data) {
  await write(
    join(out, `geometry/${name}.json`),
    `${JSON.stringify({ about, ...fineDeep(data) })}\n`,
  );
}

// --- Sprites ------------------------------------------------------------

/**
 * @typedef {object} Sprite A piece's picture, drawn about its anchor.
 * @property {string} name
 * @property {string} group The group of assets it is one of, which names its folder.
 * @property {"field" | "grid" | "radius"} units What its sizes are in: field units, units of the fuzzball's grid, or its own radius.
 * @property {number} scale How many field units one of its units takes in a picture.
 * @property {Box} box How far it reaches from its anchor, in its units.
 * @property {boolean} tint Whether it is white on nothing, to be tinted, and so the same for every palette.
 * @property {number} [png] The pixels one of its units takes in a PNG of it alone, for a sprite written as one too.
 * @property {(px: number, palette: Palette) => string} draw Returns it about its anchor, one of its units taking a number of pixels.
 */

/** @typedef {[left: number, up: number, right: number, down: number]} Box */

/**
 * Returns a sprite in field units.
 *
 * @param {string} group
 * @param {string} name
 * @param {Box} box
 * @param {Sprite["draw"]} draw
 * @param {boolean} [tint]
 * @returns {Sprite}
 */
function fieldSprite(group, name, box, draw, tint = false) {
  return { name, group, units: "field", scale: 1, box, tint, draw };
}

/**
 * Returns the box that reaches a distance every way from its anchor.
 *
 * @param {number} reach
 * @returns {Box}
 */
function around(reach) {
  return [reach, reach, reach, reach];
}

/**
 * Returns the box that holds points, with a margin past them.
 *
 * @param {readonly Point[]} points From the anchor.
 * @param {number} margin
 * @returns {Box}
 */
function boxOf(points, margin) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [
    Math.max(0, -Math.min(...xs)) + margin,
    Math.max(0, -Math.min(...ys)) + margin,
    Math.max(0, ...xs) + margin,
    Math.max(0, ...ys) + margin,
  ];
}

/**
 * Returns where a sprite's picture holds it at a size: the picture's width
 * and height and the sprite's anchor in it, in whole pixels.
 *
 * @param {Sprite} sprite
 * @param {number} px The pixels one of its units takes.
 * @returns {{ w: number, h: number, x: number, y: number }}
 */
function frameOf(sprite, px) {
  // A box of 16/15 at 120 pixels is 128 and a hair over, which is still 128.
  const whole = (/** @type {number} */ reach) => Math.ceil(reach * px - 1e-6);
  const [left, up, right, down] = sprite.box;
  const [x, y] = [whole(left), whole(up)];
  return { w: x + whole(right), h: y + whole(down), x, y };
}

/**
 * Returns a sprite's picture as an SVG file with its own defs.
 *
 * @param {Sprite} sprite
 * @param {Palette} palette
 * @param {number} px The pixels one of its units takes.
 * @returns {string}
 */
function pictureOf(sprite, palette, px) {
  const { w, h, x, y } = frameOf(sprite, px);
  const drawn = sprite.draw(px, palette);
  return svgFile(w, h, `<g transform="translate(${x} ${y})">${drawn}</g>`, {
    defs: glowDefs(drawn),
  });
}

/**
 * Writes sprites as SVG, at 32 pixels a field unit: one to be tinted once,
 * the others in the dark palette and the light.
 *
 * @param {readonly Sprite[]} sprites
 * @returns {Promise<number>} How many files it wrote.
 */
async function writeSprites(sprites) {
  let files = 0;
  for (const sprite of sprites) {
    /** @type {[string, Palette][]} */
    const folders = sprite.tint
      ? [["tint", MODES.dark]]
      : Object.entries(MODES);
    for (const [folder, palette] of folders) {
      await write(
        join(out, "sprites", folder, sprite.group, `${sprite.name}.svg`),
        pictureOf(sprite, palette, SPRITE_UNIT * sprite.scale),
      );
      files++;
    }
  }
  return files;
}

/**
 * Returns a drawing without what the kit lays under a piece in the field's
 * color, its outline and its backing, which the game draws for itself in
 * the palette on the page.
 *
 * Those are the shapes filled or stroked in the field's color at full
 * strength; a glint, as white as a light field is, is never at full
 * strength.
 *
 * @param {string} svg
 * @param {Palette} palette
 * @param {number} count How many shapes are to go, so that a change to the kit's drawing fails here and not in a picture.
 * @returns {string}
 */
function bare(svg, palette, count) {
  let gone = 0;
  const kept = svg.replace(
    /<(?:polygon|polyline|circle|ellipse)\b[^>]*\/>/g,
    (shape) => {
      const backing =
        (shape.includes(`fill="${palette.field}"`) ||
          shape.includes(`stroke="${palette.field}"`)) &&
        !shape.includes("opacity=");
      if (backing) gone++;
      return backing ? "" : shape;
    },
  );
  if (gone !== count) {
    throw new Error(
      `A drawing has ${gone} shapes in the field's color where ${count} were to go.`,
    );
  }
  return kept;
}

/**
 * Checks that no picture in an atlas shows at its frame's edge, where a
 * piece that has outgrown its sprite's box would be cut off.
 *
 * @param {string} file The atlas, as a PNG.
 * @param {{ frames: Frame[] }} packed
 * @returns {Promise<void>}
 * @throws {RangeError} for a picture that reaches its frame's edge.
 */
async function checkEdges(file, packed) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // A halo's last pixel is a faint trace of it, and no more than that.
  const shows = (/** @type {number} */ x, /** @type {number} */ y) =>
    (data[(y * info.width + x) * info.channels + 3] ?? 0) > 8;
  for (const { name, x, y, w, h } of packed.frames) {
    let cut = false;
    for (let i = 0; i < w; i++) {
      cut ||= shows(x + i, y) || shows(x + i, y + h - 1);
    }
    for (let j = 0; j < h; j++) {
      cut ||= shows(x, y + j) || shows(x + w - 1, y + j);
    }
    if (cut) throw new RangeError(`${name} reaches the edge of its frame.`);
  }
}

// --- Hulls --------------------------------------------------------------

/** @typedef {ReturnType<typeof tonesOf>} Tones */

/**
 * @typedef {object} Hull Something hard, cut in facets and lit as a rock is: a pod's hull, or the comet's head.
 * @property {string} name
 * @property {string} group
 * @property {number} reach How far it reaches from the middle it turns about, in field units.
 * @property {{ points: Point[], normal: Vec3, part: string }[]} facets Back to front.
 * @property {(palette: Palette) => Record<string, Tones>} tones Returns each part's ink in its four tones.
 */

/**
 * Returns everything hard that is not a rock: the three pods' hulls, their
 * noses along x, and the comet's head, flying along x.
 *
 * @returns {Hull[]}
 */
function hullsOf() {
  const comet = makeComet();
  return [
    ...POD_VARIANTS.map((variant) => ({
      name: `pod-${variant}`,
      group: "pods",
      reach: PODS[variant].size.reach,
      facets: PODS[variant].facets,
      tones: (/** @type {Palette} */ palette) => {
        const { hull, trim } = podTones(palette);
        return { hull, trim };
      },
    })),
    {
      name: "comet-head",
      group: "hazards",
      reach: Math.max(...comet.outline.map(([x, y]) => Math.hypot(x, y))),
      facets: comet.facets.map((facet) => ({ ...facet, part: "head" })),
      tones: (palette) => ({ head: tonesOf(palette.danger, palette) }),
    },
  ];
}

/**
 * Returns half the side of a hull's picture, in whole pixels: it is square
 * about the middle the hull turns about, so it turns in place.
 *
 * @param {Hull} hull
 * @param {number} px The pixels a field unit takes.
 * @returns {number}
 */
function halfOf(hull, px) {
  return Math.ceil(hull.reach * px) + 2;
}

/**
 * Returns a hull's picture as an SVG file, its facets alone, with no
 * outline, each drawn as `rockSvg()` draws a rock's: lit by the field's
 * light, in its ink alone, or as its normal map.
 *
 * @param {Hull} hull
 * @param {Palette} palette
 * @param {number} px The pixels a field unit takes.
 * @param {"lit" | "ink" | "normal"} as
 * @returns {string}
 */
function hullPicture(hull, palette, px, as) {
  const tones = hull.tones(palette);
  const half = halfOf(hull, px);
  const drawn = hull.facets.map(({ points, normal, part }) => {
    const set = /** @type {Tones} */ (tones[part]);
    const fill =
      as === "normal"
        ? normalColor(normal, 0)
        : as === "ink"
          ? set.ink
          : toneAt(litBy(normal, 0), set);
    return polygon(
      points.map(([x, y]) => /** @type {Point} */ ([x * px, y * px])),
      fill,
      { stroke: fill, "stroke-width": 0.6, "stroke-linejoin": "round" },
    );
  });
  return svgFile(
    2 * half,
    2 * half,
    `<g transform="translate(${half} ${half})">${drawn.join("")}</g>`,
  );
}

/**
 * Writes hulls as SVG, lit, at 32 pixels a field unit, in the dark palette
 * and the light.
 *
 * @param {readonly Hull[]} hulls
 * @returns {Promise<number>} How many files it wrote.
 */
async function writeHulls(hulls) {
  for (const hull of hulls) {
    for (const [mode, palette] of Object.entries(MODES)) {
      await write(
        join(out, "sprites", mode, hull.group, `${hull.name}.svg`),
        hullPicture(hull, palette, SPRITE_UNIT, "lit"),
      );
    }
  }
  return hulls.length * Object.keys(MODES).length;
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
    await writeAtlas(
      join(out, "atlas", `${file}.png`),
      packed,
      (name, frame) => {
        const rock = /** @type {RockShape} */ (shapes.get(name));
        return svgFile(
          frame.w,
          frame.h,
          `<g transform="translate(${frame.w / 2} ${frame.h / 2})">${rockSvg(rock, palette, { unit: ATLAS_UNIT, outline: false, as })}</g>`,
          { defs: rockDefs(palette) },
        );
      },
    );
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

// --- Pods ---------------------------------------------------------------

/**
 * Writes the pods: their geometry, their hulls as SVG, and the hulls' atlas
 * in five layers that share one map, with the comet's head in it, since it
 * is cut and lit the same way.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function pods() {
  await writeGeometry(
    "pods",
    "The three pods, in field units about the middle each turns about, its canopy's, its nose along x, y down. A facet's normal has z toward the viewer; light it by the dot of that normal, turned with the pod, and the light, as a rock is lit. A facet's part names its ink: hull is the palette's accent and trim the field's muted text, each in four tones by the light, every tone held to 3:1 against the field. canopy is the glass's radius, and pilot how wide the fuzzball's grid of 32 is drawn in it; the fuzzball stays upright as the hull turns. An engine is where a flame leaves the hull, pointing back, and how wide; hook is where the tow line ties. rings are how far out the Shield's shell and a new pod's guard lie.",
    {
      light: LIGHT,
      length: POD_LENGTH,
      rings: RINGS,
      pods: POD_VARIANTS.map((variant) => {
        const pod = PODS[variant];
        return {
          name: `pod-${variant}`,
          title: pod.name,
          says: pod.says,
          size: pod.size,
          canopy: pod.canopy,
          pilot: pilotSize(pod),
          hook: pod.hook,
          engines: pod.engines,
          facets: pod.facets.map(({ part, normal, points }) => ({
            part,
            normal,
            points,
          })),
        };
      }),
    },
  );

  const hulls = hullsOf();
  const byName = new Map(hulls.map((hull) => [hull.name, hull]));
  const hullOf = (/** @type {string} */ name) =>
    /** @type {Hull} */ (byName.get(name));
  const packed = pack(
    hulls.map((hull) => {
      const side = 2 * halfOf(hull, ATLAS_UNIT);
      return { name: hull.name, w: side, h: side };
    }),
    256,
  );
  /** @type {[string, Palette, "lit" | "normal" | "ink"][]} */
  const layers = [
    ["hulls-ink-dark", MODES.dark, "ink"],
    ["hulls-ink-light", MODES.light, "ink"],
    ["hulls-normal", MODES.dark, "normal"],
    ["hulls-lit-dark", MODES.dark, "lit"],
    ["hulls-lit-light", MODES.light, "lit"],
  ];
  for (const [file, palette, as] of layers) {
    await writeAtlas(join(out, "atlas", `${file}.png`), packed, (name) =>
      hullPicture(hullOf(name), palette, ATLAS_UNIT, as),
    );
  }
  await write(
    join(out, "atlas/hulls.json"),
    atlasJson(
      packed,
      layers.map(([file]) => `${file}.png`),
      ATLAS_UNIT,
      (name) => {
        const hull = hullOf(name);
        const side = fine((2 * halfOf(hull, ATLAS_UNIT)) / ATLAS_UNIT);
        return {
          group: hull.group,
          units: "field",
          px: ATLAS_UNIT,
          size: { w: side, h: side },
          anchor: { x: 0.5, y: 0.5 },
          reach: fine(hull.reach),
        };
      },
    ),
  );
  const files = await writeHulls(hulls.filter(({ group }) => group === "pods"));
  return `pods: ${POD_VARIANTS.length} hulls and the comet's head, an atlas of ${packed.width} by ${packed.height} in ${layers.length} layers, ${files} sprites`;
}

// --- The fuzzball -------------------------------------------------------

/**
 * Returns a posed fuzzball's body and fur in one color, about its body's
 * middle, as `fuzzballSvg()` draws them under its eyes.
 *
 * @param {FuzzballShape} shape
 * @param {number} px The pixels a unit of the grid takes.
 * @param {string} color
 * @returns {string}
 */
function furSvg(shape, px, color) {
  const at = (/** @type {Point} */ [x, y]) => `${num(x * px)} ${num(y * px)}`;
  const d = shape.fur
    .map(({ from, control, to }) => `M${at(from)}Q${at(control)} ${at(to)}`)
    .join("");
  return [
    circle(0, 0, shape.body * px, color),
    path(d, {
      fill: "none",
      stroke: color,
      "stroke-width": shape.furWidth * px,
      "stroke-linecap": "round",
    }),
  ].join("");
}

/**
 * Returns a face's eyes alone, about the body's middle, in the mark's own
 * eye ink and glint, as `fuzzballSvg()` draws them over the fur.
 *
 * @param {readonly EyeMark[]} marks
 * @param {number} px The pixels a unit of the grid takes.
 * @returns {string}
 */
function eyesSvg(marks, px) {
  const tones = { eye: EYE_INK, glint: GLINT };
  const at = (/** @type {Point} */ [x, y]) =>
    /** @type {Point} */ ([x * px, y * px]);
  return marks
    .map((mark) => {
      const color = tones[mark.tone];
      if (mark.kind === "ellipse" && mark.at) {
        const [x, y] = at(mark.at);
        return ellipse(x, y, (mark.rx ?? 0) * px, (mark.ry ?? 0) * px, color);
      }
      const points = (mark.points ?? []).map(at);
      return mark.kind === "polygon"
        ? polygon(points, color)
        : polyline(points, color, (mark.width ?? 1) * px);
    })
    .join("");
}

/**
 * Returns a full charge's sparks in one color, about the body's middle: each
 * a faint wide mark under a full narrow one, as `fuzzballSvg()` draws them
 * in an ink's two spark tones.
 *
 * @param {readonly SparkMark[]} marks
 * @param {number} px The pixels a unit of the grid takes.
 * @param {string} color
 * @returns {string}
 */
function sparksSvg(marks, px, color) {
  return marks
    .map(({ kind, points }) => {
      const at = points.map(
        ([x, y]) => /** @type {Point} */ ([x * px, y * px]),
      );
      return kind === "tick"
        ? polyline(at, color, 1.5 * px, { opacity: 0.4 }) +
            polyline(at, color, Math.max(0.8, 0.55 * px))
        : polygon(at, color, {
            opacity: 0.4,
            stroke: color,
            "stroke-width": 1.1 * px,
            "stroke-linejoin": "round",
          }) + polygon(at, color);
    })
    .join("");
}

/**
 * Returns two corners for each of a face's marks that it lies between.
 *
 * @param {readonly EyeMark[]} marks
 * @returns {Point[]}
 */
function eyeCorners(marks) {
  return marks.flatMap((mark) => {
    const [x, y] = mark.at ?? [0, 0];
    const points = mark.at
      ? /** @type {Point[]} */ ([[x, y]])
      : (mark.points ?? []);
    const rx = mark.rx ?? (mark.width ?? 0) / 2;
    const ry = mark.ry ?? (mark.width ?? 0) / 2;
    return points.flatMap(
      ([px, py]) =>
        /** @type {Point[]} */ ([
          [px - rx, py - ry],
          [px + rx, py + ry],
        ]),
    );
  });
}

/**
 * Returns the fuzzball's sprites, on its grid about its body's middle: its
 * body and fur in white at each tier of static and in its small form, a full
 * charge's sparks in white, and each face's eyes, which every face's sprite
 * holds at the same place, so one swaps for another.
 *
 * @returns {Sprite[]}
 */
function fuzzballSprites() {
  /** @type {(name: string, box: Box, draw: Sprite["draw"], tint?: boolean) => Sprite} */
  const sprite = (name, box, draw, tint = false) => ({
    name,
    group: "fuzzball",
    units: "grid",
    scale: GRID_SCALE,
    box,
    tint,
    draw,
  });
  const white = (
    /** @type {string} */ name,
    /** @type {FuzzballShape} */ shape,
  ) =>
    sprite(
      name,
      around(shape.reach + 0.5),
      (px) => furSvg(shape, px, WHITE),
      true,
    );
  const faces = FACES.map((face) => fuzzballShape({ face }).eyes);
  const small = fuzzballShape({ small: true });
  const tiny = fuzzballShape({ small: true, tiny: 1 });
  const { sparks } = fuzzballShape({ charge: 3 });
  const eyesBox = boxOf(faces.flatMap(eyeCorners), 0.5);
  const smallBox = boxOf(eyeCorners([...small.eyes, ...tiny.eyes]), 0.5);
  return [
    ...TIERS.map((tier) =>
      white(`fuzz-tier-${tier}`, fuzzballShape({ charge: tier })),
    ),
    white("fuzz-small", small),
    sprite(
      "fuzz-sparks",
      boxOf(
        sparks.flatMap(({ points }) => points),
        1.5,
      ),
      (px) => sparksSvg(sparks, px, WHITE),
      true,
    ),
    ...FACES.map((face, i) =>
      sprite(`eyes-${face}`, eyesBox, (px) =>
        eyesSvg(/** @type {EyeMark[]} */ (faces[i]), px),
      ),
    ),
    sprite("eyes-small", smallBox, (px) => eyesSvg(small.eyes, px)),
    sprite("eyes-tiny", smallBox, (px) => eyesSvg(tiny.eyes, px)),
  ];
}

/**
 * Writes the fuzzball: its geometry, and its layers as sprites, white fur
 * to be tinted with a pilot's ink and eyes to lay over it.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function fuzzball() {
  const posed = (/** @type {FuzzballShape} */ { fur, furWidth, reach }) => ({
    reach,
    furWidth,
    fur,
  });
  await writeGeometry(
    "fuzzball",
    "The fuzzball, on the brand mark's grid of 32 units about its body's middle, y down. Its body is a disc of the body's radius, and each strand of its fur a quadratic curve from a point, by a control, to its tip, stroked furWidth wide with round ends; both take a pilot's ink. strands are the mark's own thirty, clockwise from its right. tiers are the fur at each whole static charge, 0, which is the mark's, to 3, and reach how far it then reaches from the middle; a full charge's sparks are ticks, which are lines, and stars, which are polygons, in the ink's spark tones. faces are each face's eye marks, back to front: an ellipse at a point, a polygon, or a stroke of a width with round ends and joins; tone eye is the mark's eye ink and glint its white, the same in every palette. A stray pleads upward; every other face looks straight out, and look is how far the eyes shift across and down toward what the fuzzball looks at. small is the form drawn where the grid takes smallUnder pixels or fewer: every other strand, fatter, with larger eyes and no glints, as it is at 12 pixels and at 8.",
    {
      grid: GRID,
      body: BODY,
      furWidth: FUR_WIDTH,
      smallUnder: SMALL_UNDER,
      look: LOOK,
      strands: STRANDS,
      tiers: TIERS.map((tier) => {
        const shape = fuzzballShape({ charge: tier });
        return {
          name: `fuzz-tier-${tier}`,
          tier,
          ...posed(shape),
          ...(shape.sparks.length > 0 ? { sparks: shape.sparks } : {}),
        };
      }),
      faces: FACES.map((face) => ({
        name: `eyes-${face}`,
        face,
        shown: FACE_USES[face],
        eyes: fuzzballShape({ face }).eyes,
      })),
      small: [
        { size: 12, tiny: 0 },
        { size: 8, tiny: 1 },
      ].map(({ size, tiny }) => {
        const shape = fuzzballShape({ small: true, tiny });
        return { size, ...posed(shape), eyes: shape.eyes };
      }),
    },
  );
  const files = await writeSprites(fuzzballSprites());
  return `fuzzball: ${TIERS.length} tiers of fur, ${FACES.length} faces and the small form at two sizes, ${files} sprites`;
}

// --- Bubbles ------------------------------------------------------------

/**
 * Returns the bubbles' sprites, each about its middle: a stray's bubble and
 * a bubble in tow, empty, their wash the field's text where a fuzzball's ink
 * would be, and the Shield's shell.
 *
 * @returns {Sprite[]}
 */
function bubbleSprites() {
  const bubble = (/** @type {string} */ name, /** @type {number} */ radius) =>
    fieldSprite("bubbles", name, around(radius + 0.1), (px, palette) =>
      bare(bubbleSvg({ radius, unit: px }, palette), palette, 2),
    );
  return [
    bubble("bubble-stray", STRAY_RADIUS),
    bubble("bubble-tow", TOW_RADIUS),
    // The shell's halo reaches a quarter past its radius.
    fieldSprite(
      "bubbles",
      "shell",
      around(SHELL_RADIUS * 1.25 + 0.04),
      (px, palette) => shellSvg(palette, { unit: px }),
    ),
  ];
}

/**
 * Writes the bubbles: their measures and a tow line at rest, and a sprite
 * of each.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function bubbles() {
  const { at, threads } = towLine({ hook: PODS.bumble.hook });
  await writeGeometry(
    "bubbles",
    "A stray's bubble, a bubble in tow and the Shield's shell, in field units about each one's middle, y down. A bubble is a disc of its radius: a faint wash of its fuzzball's ink, a thin rim of the field's text mixed toward the field, and one glint toward the light, which comes from towardLight, in radians, the upper left. fuzzball is how wide the fuzzball's grid of 32 is drawn in it. The shell is a ring of the accent at its radius about the pod's middle, over a wash and a halo of the same. line is a tow line at rest behind Bumble as it flies along x: each bubble's middle, the nearest the pod first, and the thread to each, from the pod's hook or from the bubble ahead, as points.",
    {
      towardLight: TOWARD_LIGHT,
      stray: {
        name: "bubble-stray",
        radius: STRAY_RADIUS,
        fuzzball: STRAY_FILL * STRAY_RADIUS,
      },
      tow: {
        name: "bubble-tow",
        radius: TOW_RADIUS,
        fuzzball: STRAY_FILL * TOW_RADIUS,
      },
      shell: { name: "shell", radius: SHELL_RADIUS },
      line: { pod: "pod-bumble", hook: PODS.bumble.hook, at, threads },
    },
  );
  const files = await writeSprites(bubbleSprites());
  return `bubbles: a stray's, one in tow and the Shield's shell, ${files} sprites`;
}

// --- Pickups ------------------------------------------------------------

/**
 * Returns a pickup's symbol alone in white, about its middle.
 *
 * A symbol's cuts are lines in the color under it, which a picture over
 * nothing has none of, so they are masked out of it.
 *
 * @param {(typeof PICKUP_IDS)[number]} id
 * @param {number} side Its square's side, in pixels.
 * @returns {string}
 */
function whiteSymbol(id, side) {
  if (makeSymbol(id).cuts.length === 0) return symbolSvg(id, WHITE, side);
  const cut = symbolSvg(id, WHITE, side, { ground: "#000000" });
  return [
    `<mask id="cuts-${id}">${cut}</mask>`,
    rect(-0.6 * side, -0.6 * side, 1.2 * side, 1.2 * side, WHITE, {
      mask: `url(#cuts-${id})`,
    }),
  ].join("");
}

/**
 * Returns the pickups' sprites, each about its middle: every orb at rest,
 * and every symbol alone in white, the size it is in its orb.
 *
 * @returns {Sprite[]}
 */
function pickupSprites() {
  return PICKUP_IDS.flatMap((id) => {
    const side = ORB.symbol * SYMBOL_SHARE[PICKUP_GROUPS[id]];
    return [
      fieldSprite(
        "pickups",
        `orb-${id}`,
        around(ORB.halo + 0.04),
        (px, palette) => bare(orbSvg(id, palette, { unit: px }), palette, 1),
      ),
      fieldSprite(
        "pickups",
        `symbol-${id}`,
        around(0.6 * side),
        (px) => whiteSymbol(id, side * px),
        true,
      ),
    ];
  });
}

/**
 * Writes the pickups: each symbol's shapes and the orb's measures, every orb
 * as a sprite, and every symbol alone in white.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function pickups() {
  await writeGeometry(
    "pickups",
    "The eight pickups. orb is an orb's sizes in field units: its radius, its rim's width, how far its halo reaches and the side of its symbol's square, of which sides gives each group's own. A pickup's group is told by its orb's rim: one ring for a weapon, a doubled ring for a guard, a ring cut in four arcs for a field effect. A symbol is in shares of its square about its middle, y down: fills are polygons, lines are strokes of a width with round ends and joins, and cuts are lines drawn over those in the color of the glass under them. The rim and the halo take the palette's accent, the glass the field with a little of the accent, and the symbol the accent mixed toward white in a dark palette and toward the field's text in a light one. small is the symbol as it is under 10 pixels a unit, where it differs.",
    {
      orb: ORB,
      sides: Object.fromEntries(
        Object.entries(SYMBOL_SHARE).map(([group, share]) => [
          group,
          ORB.symbol * share,
        ]),
      ),
      pickups: PICKUP_IDS.map((id) => {
        const symbol = makeSymbol(id);
        const small = makeSymbol(id, { small: true });
        return {
          name: `orb-${id}`,
          symbol: `symbol-${id}`,
          id,
          title: PICKUP_NAMES[id],
          group: PICKUP_GROUPS[id],
          ...symbol,
          ...(JSON.stringify(small) === JSON.stringify(symbol)
            ? {}
            : { small }),
        };
      }),
    },
  );
  const files = await writeSprites(pickupSprites());
  return `pickups: ${PICKUP_IDS.length} orbs and their symbols, ${files} sprites`;
}

// --- Hazards ------------------------------------------------------------

/**
 * Returns what the comet gives off, apart from its head, cut from the one
 * drawing `cometSvg()` makes of them all: what lies under the head, which
 * is its tail, its streaks and the halo around it, and what lies over it,
 * its leading edge.
 *
 * @param {ReturnType<typeof makeComet>} comet
 * @param {Palette} palette
 * @param {number} px The pixels a field unit takes.
 * @returns {{ under: string, over: string }}
 */
function cometGlow(comet, palette, px) {
  const whole = cometSvg(comet, palette, { unit: px });
  // The head begins with its outline, the first shape stroked in the field's color.
  const outline = whole.indexOf(`stroke="${palette.field}"`);
  const head = whole.lastIndexOf("<polygon", outline);
  const edge = whole.lastIndexOf("<polyline");
  if (outline < 0 || head < 0 || edge < head) {
    throw new Error("The comet is no longer drawn tail, head, then edge.");
  }
  return { under: whole.slice(0, head), over: whole.slice(edge) };
}

/**
 * Returns one chevron of the comet's warning in the danger color, about its
 * own middle, pointing along x, as `warningSvg()` draws the first of its
 * three: plain, or lit, over a halo and, on a dark field, with a bright
 * middle.
 *
 * @param {number} px The pixels a field unit takes.
 * @param {Palette} palette
 * @param {boolean} lit
 * @returns {string}
 */
function chevronSvg(px, palette, lit) {
  const { points, width } = WARNING.chevron;
  const at = points.map(([x, y]) => /** @type {Point} */ ([x * px, y * px]));
  const pen = Math.max(1.4, width * px);
  const energy = energyOf(palette.danger, palette);
  return [
    lit ? glow(0, 0, 1.5 * px, energy.halo, palette, 0.8) : "",
    polyline(at, palette.danger, pen, { "stroke-linejoin": "miter" }),
    lit && palette.mode === "dark"
      ? polyline(at, energy.hot, pen * 0.36, { "stroke-linejoin": "miter" })
      : "",
  ].join("");
}

/**
 * Returns the hazards' sprites: the comet's tail and its leading edge,
 * about the comet's middle, to go under and over its head; the warning's
 * bar and one chevron, plain and lit; and the burr.
 *
 * @returns {Sprite[]}
 */
function hazardSprites() {
  const comet = makeComet();
  const burr = makeBurr();
  const { bar } = WARNING;
  /** @type {(name: string, box: Box, draw: Sprite["draw"]) => Sprite} */
  const sprite = (name, box, draw) => fieldSprite("hazards", name, box, draw);
  return [
    sprite(
      "comet-tail",
      [9, 2.15, 2.65, 2.15],
      (px, palette) => cometGlow(comet, palette, px).under,
    ),
    sprite(
      "comet-edge",
      [0, 0.7, 2, 0.7],
      (px, palette) => cometGlow(comet, palette, px).over,
    ),
    sprite("warning-bar", [0.25, 1.2, 0.25, 1.2], (px, palette) =>
      polyline(
        bar.points.map(([x, y]) => /** @type {Point} */ ([x * px, y * px])),
        palette.danger,
        Math.max(2, bar.width * px),
        { "stroke-linecap": "butt" },
      ),
    ),
    sprite("warning-chevron", [0.6, 1, 0.68, 1], (px, palette) =>
      chevronSvg(px, palette, false),
    ),
    sprite("warning-chevron-lit", around(1.54), (px, palette) =>
      chevronSvg(px, palette, true),
    ),
    sprite("burr", around(BURR_RADIUS * 1.2), (px, palette) =>
      bare(
        burrSvg(burr, palette, { unit: px }),
        palette,
        burr.spines.length + 1,
      ),
    ),
  ];
}

/**
 * Writes the hazards: the comet's, the warning's and the burr's geometry,
 * their sprites, and the comet's head as SVG; its head's layers are in the
 * hulls' atlas, which `pods()` writes.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function hazards() {
  const comet = makeComet();
  const burr = makeBurr();
  await writeGeometry(
    "hazards",
    "The comet, its warning and the burr, in field units, y down. The comet flies along x, about the middle it hits with, and radius is how far from that it meets what it touches. Its head is facets in the palette's danger color, lit as a rock's are: a facet's normal has z toward the viewer. edge is its leading edge, a line that glows; tail is streaks behind its head, each a wedge from its half width at from to a point length farther back along its y; and streaks are thin lines beside it. The warning is drawn from the point on the field's edge the comet comes in by, pointing along x into the field, in the danger color: a bar across the edge, and three chevrons of one shape, each about its own middle at x and at a size, the pen's width the same for all three; its lane is as wide as the comet. The burr is in shares of its radius about its middle: core is its seed's outline and spines are its thorns' outlines, each a polygon out from the seed, in a dull brown mixed from the palette's warning, its danger and the field's muted text.",
    {
      light: LIGHT,
      comet: {
        name: "comet-head",
        radius: comet.radius,
        outline: comet.outline,
        facets: comet.facets.map(({ normal, points }) => ({ normal, points })),
        edge: comet.edge,
        tail: comet.tail,
        streaks: comet.streaks,
      },
      warning: WARNING,
      burr: { name: "burr", radius: BURR_RADIUS, ...burr },
    },
  );
  const files =
    (await writeSprites(hazardSprites())) +
    (await writeHulls(hullsOf().filter(({ group }) => group === "hazards")));
  return `hazards: the comet, its warning and the burr, ${files} sprites`;
}

// --- Energy -------------------------------------------------------------

/**
 * Returns the box a shot's picture needs: its tail behind, its halo around.
 *
 * @param {ReturnType<typeof makeShot>} shot
 * @returns {Box}
 */
function shotBox(shot) {
  const [along, across, ahead] = shot.halo;
  const drawn = [...shot.body, ...shot.barbs.flat()];
  const high = Math.max(across, ...drawn.map(([, y]) => Math.abs(y) + 0.06));
  return [
    Math.max(shot.tail[0], along - ahead) + 0.04,
    high + 0.04,
    Math.max(along + ahead, ...drawn.map(([x]) => x + 0.06)) + 0.04,
    high + 0.04,
  ];
}

/**
 * Returns the sprites of what glows: each weapon's shot, about the middle
 * it hits with; the muzzle's flash, about the muzzle; the flame, about the
 * tail it leaves; a spark in its three sizes; and, in white, the soft disc
 * every halo is and a ring.
 *
 * The frames of the flash share one box, and the flame's another, so one
 * swaps for the next.
 *
 * @returns {Sprite[]}
 */
function energySprites() {
  /** @type {(name: string, box: Box, draw: Sprite["draw"]) => Sprite} */
  const sprite = (name, box, draw) => fieldSprite("energy", name, box, draw);
  return [
    ...WEAPONS.map((weapon) =>
      sprite(`shot-${weapon}`, shotBox(makeShot(weapon)), (px, palette) =>
        bare(shotSvg(weapon, palette, { unit: px }), palette, 1),
      ),
    ),
    ...[0, 1].map((frame) =>
      sprite(
        `muzzle-flash-${frame + 1}`,
        [0.85, 1.1, 1.36, 1.1],
        (px, palette) =>
          muzzleFlashSvg(/** @type {0 | 1} */ (frame), palette, { unit: px }),
      ),
    ),
    ...[0, 1, 2].map((frame) =>
      sprite(`flame-${frame + 1}`, [1.93, 0.76, 0.63, 0.76], (px, palette) =>
        flameSvg(/** @type {0 | 1 | 2} */ (frame), palette, { unit: px }),
      ),
    ),
    // A spark's halo reaches 2.7 times as far as the spark.
    ...MOTE_SIZES.map((reach, size) =>
      sprite(
        `spark-${SPARKS[size]}`,
        around(2.7 * reach + 0.04),
        (px, palette) =>
          moteSvg(/** @type {0 | 1 | 2} */ (size), palette, { unit: px }),
      ),
    ),
    {
      name: "soft-disc",
      group: "energy",
      units: "radius",
      scale: 64 / ATLAS_UNIT,
      box: around(1),
      tint: true,
      png: 128,
      draw: (px) => halo(0, 0, px, WHITE),
    },
    {
      name: "ring",
      group: "energy",
      units: "radius",
      scale: 60 / ATLAS_UNIT,
      box: around(16 / 15),
      tint: true,
      png: 120,
      draw: (px) => ring(0, 0, px, WHITE, px / 12),
    },
  ];
}

/**
 * Writes what glows: the shots' geometry and how a halo fades, a sprite of
 * each shot, flash, flame and spark, and the soft disc and the ring in
 * white, as SVG and as PNG 256 pixels across.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function energy() {
  const fade = glowDefs(halo(0, 0, 1, WHITE));
  await writeGeometry(
    "energy",
    "The four weapons' shots, each flying along x about the middle it hits with, in field units, y down. body and core are polygons: the body takes the palette's accent and the core the field's text. tail is how far back its tail reaches from its middle, and its half width where it starts; halo is its halo's radius along it and across it and how far ahead of its middle that sits, and glow its strength; barbs are lines swept back from its head, left out under 10 pixels a unit. count is the shots a pull fires and fan the degrees between two of them. sparks are the three sizes of the spark a broken rock sheds, by how far each reaches. halo is how every soft halo fades from its middle, in a thing's own color under plain alpha: each stop is how far out it is, 0 to 1, and how much of the color shows there, and strength is what a palette of each mode multiplies that by.",
    {
      shots: WEAPONS.map((weapon) => ({
        name: `shot-${weapon}`,
        ...makeShot(weapon),
      })),
      sparks: MOTE_SIZES.map((reach, size) => ({
        name: `spark-${SPARKS[size]}`,
        reach,
      })),
      halo: {
        stops: [
          ...fade.matchAll(/offset="([\d.]+)"[^>]*stop-opacity="([\d.]+)"/g),
        ].map(([, at, shows]) => [Number(at), Number(shows)]),
        strength: {
          dark: energyOf(WHITE, MODES.dark).glow,
          light: energyOf(WHITE, MODES.light).glow,
        },
      },
    },
  );
  const sprites = energySprites();
  let files = await writeSprites(sprites);
  for (const sprite of sprites) {
    if (sprite.png === undefined) continue;
    await writeRaster(
      pictureOf(sprite, MODES.dark, sprite.png),
      join(out, "sprites/tint", `${sprite.name}.png`),
    );
    files++;
  }
  return `energy: ${WEAPONS.length} shots, 2 flashes, 3 flames, 3 sparks, a soft disc and a ring, ${files} sprites`;
}

// --- Backdrops ----------------------------------------------------------

/**
 * Writes the backdrops: each sector's geometry for a wide field and a tall
 * one, and each as a picture in the dark palette and the light, the
 * field's own color under it.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function backdrops() {
  const made = SECTORS.flatMap((sector) =>
    FIELDS.map(({ suffix, width, height }) => ({
      name: `${sector}${suffix}`,
      backdrop: makeBackdrop({ sector, width, height, seed: BACKDROP_SEED }),
    })),
  );
  await writeGeometry(
    "backdrops",
    "The four sectors' backdrops, each for a field 72 by 40 units and for one 40 by 72, in field units from the field's top left corner, y down, back to front: a far wash, stars, one landmark, the sector's air and a vignette. Its marks reach past the field's edges, so whatever shows it clips it to the field. stars are the same for every sector at a seed: each lies at shares u and v of the field's width and height, with a radius in field units and a shine, and a field shows the first of each depth, as many as shown says; they take the field's muted text with a little of starTint, by starShares. A mark is one of: soft, an ellipse of a tint fading to nothing from its middle, turned by degrees; flat, a polygon of something hard, toned by how brightly the light falls on it, 0.3 to a little over 1; line, a thin line through points; speck, a star that stays with the landmark; streak, a hair of wind fading at both ends; or bank, billows of cloud, back to front, each hiding what is behind it. A tint names what the mark mixes into the field: a role of the palette, a rock's ink or a pilot's, and never more of it than limits allows for the palette's mode, times its strength. A mark that is fine is left out under 9 pixels a unit; one that shows in one mode is left out in the other; one that flickers brightens for a moment, every so many seconds. wind is how the air drifts, in units a second, and parallax how far each depth slides for each unit the pod flies.",
    {
      seed: BACKDROP_SEED,
      limits: LIMITS,
      starShares: STAR_SHARES,
      parallax: PARALLAX,
      stars: made[0]?.backdrop.stars,
      backdrops: made.map(({ name, backdrop }) => {
        const { stars, sector, width, height, ...layers } = backdrop;
        const shown = Object.fromEntries(
          Object.keys(stars).map((depth) => [
            depth,
            starCount(/** @type {keyof typeof stars} */ (depth), width, height),
          ]),
        );
        return {
          name,
          sector,
          title: SECTOR_NAMES[sector],
          width,
          height,
          shown,
          ...layers,
        };
      }),
    },
  );

  await mkdir(join(out, "backdrops"), { recursive: true });
  const pictures = made.flatMap(({ name, backdrop }) => {
    const { sector, width, height } = backdrop;
    const [w, h] = [width * BACKDROP_UNIT, height * BACKDROP_UNIT];
    const suffix = name.slice(sector.length);
    return Object.entries(MODES).map(([mode, palette]) => {
      const drawn = backdropSvg(
        { sector, width, height, unit: BACKDROP_UNIT, seed: BACKDROP_SEED },
        palette,
      );
      const svg = svgFile(w, h, fieldSvg(0, 0, w, h, drawn, palette), {
        defs: backdropDefs(palette),
      });
      return sharp(Buffer.from(svg))
        .webp({ quality: 95 })
        .toFile(join(out, "backdrops", `${sector}-${mode}${suffix}.webp`));
    });
  });
  await Promise.all(pictures);
  return `backdrops: ${SECTORS.length} sectors for ${FIELDS.length} fields, ${pictures.length} pictures`;
}

// --- The things' atlas --------------------------------------------------

/**
 * Writes the things' atlas: every sprite of the fuzzball, the bubbles, the
 * pickups, the hazards and what glows, packed once and written in the dark
 * palette and the light under one map, a white sprite the same in both.
 *
 * @returns {Promise<string>} What was written, in a line.
 */
async function things() {
  const sprites = [
    ...fuzzballSprites(),
    ...bubbleSprites(),
    ...pickupSprites(),
    ...hazardSprites(),
    ...energySprites(),
  ];
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));
  const spriteOf = (/** @type {string} */ name) =>
    /** @type {Sprite} */ (byName.get(name));
  const packed = pack(
    sprites.map((sprite) => {
      const { w, h } = frameOf(sprite, ATLAS_UNIT * sprite.scale);
      return { name: sprite.name, w, h };
    }),
    1024,
  );
  for (const [mode, palette] of Object.entries(MODES)) {
    const file = join(out, "atlas", `things-${mode}.png`);
    await writeAtlas(file, packed, (name) =>
      pictureOf(spriteOf(name), palette, ATLAS_UNIT * spriteOf(name).scale),
    );
    await checkEdges(file, packed);
  }
  await write(
    join(out, "atlas/things.json"),
    atlasJson(
      packed,
      Object.keys(MODES).map((mode) => `things-${mode}.png`),
      ATLAS_UNIT,
      (name) => {
        const sprite = spriteOf(name);
        const px = ATLAS_UNIT * sprite.scale;
        const { w, h, x, y } = frameOf(sprite, px);
        return {
          group: sprite.group,
          ...(sprite.tint ? { tint: true } : {}),
          units: sprite.units,
          px: fine(px),
          size: { w: fine(w / px), h: fine(h / px) },
          anchor: { x: fine(x / w), y: fine(y / h) },
        };
      },
    ),
  );
  return `things: ${sprites.length} sprites, an atlas of ${packed.width} by ${packed.height} in ${Object.keys(MODES).length} palettes`;
}

/** Every group of assets, by the name it is asked for by. */
const GROUPS = /** @type {Record<string, () => Promise<string>>} */ ({
  rocks,
  pods,
  fuzzball,
  bubbles,
  pickups,
  hazards,
  energy,
  backdrops,
});

/** The groups whose sprites the things' atlas holds. */
const IN_THINGS = ["fuzzball", "bubbles", "pickups", "hazards", "energy"];

const asked = process.argv.slice(2);
const wanted = (/** @type {string} */ name) =>
  asked.length === 0 || asked.includes(name);
for (const [name, group] of Object.entries(GROUPS)) {
  if (wanted(name)) console.log(await group());
}
if (IN_THINGS.some(wanted) || asked.includes("things")) {
  console.log(await things());
}
