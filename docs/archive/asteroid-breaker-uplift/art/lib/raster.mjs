// Turns an SVG into a PNG or a WebP with sharp, which the frontend already
// installs for `@fz/style`'s icons. The docs folder is no workspace, so sharp
// is found through the frontend's own modules.

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(
  join(import.meta.dirname, "../../../../../frontend/lib/style/package.json"),
);

/** @type {typeof import("sharp")} */
export const sharp = require("sharp");

/**
 * Writes an SVG as a raster image beside or apart from it, at a scale.
 *
 * @param {string} svg The SVG's source.
 * @param {string} file Where to write; ".png" or ".webp" picks the format.
 * @param {{ scale?: number }} [how] How many pixels a unit of the SVG takes.
 * @returns {Promise<void>}
 */
export async function writeRaster(svg, file, { scale = 1 } = {}) {
  await mkdir(dirname(file), { recursive: true });
  const image = sharp(Buffer.from(svg), { density: 72 * scale });
  await (
    file.endsWith(".webp")
      ? image.webp({ quality: 90 })
      : image.png({ compressionLevel: 9 })
  ).toFile(file);
}

/**
 * Writes a text file, making its folder first.
 *
 * @param {string} file
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function writeText(file, content) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}
