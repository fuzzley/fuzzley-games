// Packs pictures into an atlas: where each frame goes, and the atlas written
// as a PNG from one SVG a frame. A frame's place is the same in every layer
// of an atlas (a rock's inks, its normal map and its glow share one), so a
// game reads one map for them all.

import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { sharp } from "./raster.mjs";

/**
 * @typedef {object} Frame A picture's place in an atlas, in pixels.
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/** The pixels left clear around every frame, so a neighbour never bleeds into it. */
export const PADDING = 2;

/**
 * Returns where each of some sizes goes in an atlas no wider than a width:
 * tallest first, in rows, left to right.
 *
 * @param {readonly { name: string, w: number, h: number }[]} sizes Whole pixels.
 * @param {number} [most] The atlas's most width.
 * @returns {{ frames: Frame[], width: number, height: number }}
 */
export function pack(sizes, most = 2048) {
  const order = [...sizes].sort(
    (a, b) => b.h - a.h || b.w - a.w || a.name.localeCompare(b.name),
  );
  /** @type {Frame[]} */
  const frames = [];
  let x = PADDING;
  let y = PADDING;
  let row = 0;
  let width = 0;
  for (const { name, w, h } of order) {
    if (x + w + PADDING > most) {
      x = PADDING;
      y += row + PADDING;
      row = 0;
    }
    frames.push({ name, x, y, w, h });
    x += w + PADDING;
    row = Math.max(row, h);
    width = Math.max(width, x);
  }
  frames.sort((a, b) => a.name.localeCompare(b.name));
  return { frames, width, height: y + row + PADDING };
}

/**
 * Writes an atlas as a PNG: each frame's SVG drawn where the packing put it,
 * over nothing.
 *
 * @param {string} file
 * @param {{ frames: Frame[], width: number, height: number }} packed
 * @param {(name: string, frame: Frame) => string} svgOf Returns a frame's picture as an SVG file of the frame's size.
 * @returns {Promise<void>}
 */
export async function writeAtlas(file, packed, svgOf) {
  await mkdir(dirname(file), { recursive: true });
  const layers = await Promise.all(
    packed.frames.map(async (frame) => ({
      input: await sharp(Buffer.from(svgOf(frame.name, frame)))
        .resize(frame.w, frame.h, { fit: "fill" })
        .png()
        .toBuffer(),
      left: frame.x,
      top: frame.y,
    })),
  );
  await sharp({
    create: {
      width: packed.width,
      height: packed.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(file);
}

/**
 * Returns an atlas's map as JSON: its frames by name, as Phaser's
 * `load.atlas()` reads a hash of them, with whatever else is said of each.
 *
 * @param {{ frames: Frame[], width: number, height: number }} packed
 * @param {string[]} images The atlas's layers' file names.
 * @param {number} unit The pixels a field unit takes in it.
 * @param {(name: string) => Record<string, unknown>} [more] What else to say of a frame.
 * @returns {string}
 */
export function atlasJson(packed, images, unit, more = () => ({})) {
  return `${JSON.stringify(
    {
      frames: Object.fromEntries(
        packed.frames.map(({ name, x, y, w, h }) => [
          name,
          {
            frame: { x, y, w, h },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w, h },
            sourceSize: { w, h },
            ...more(name),
          },
        ]),
      ),
      meta: {
        images,
        size: { w: packed.width, h: packed.height },
        unit,
        scale: "1",
      },
    },
    null,
    1,
  )}\n`;
}
