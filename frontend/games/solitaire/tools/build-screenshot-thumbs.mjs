/**
 * Makes the images the site serves from each game's rules-page screenshot.
 *
 *   yarn build:thumbs
 *
 * Reads the lossless original, `docs/screenshots/<id>/overview.png`, which
 * `yarn capture:screenshots` writes, and writes three WebP images to
 * `public/docs/screenshots/<id>/`: an `overview.webp` of the whole page for
 * the rules page, a `thumb.webp` of the board alone for a row of the game
 * browser's list, and a `preview.webp` of the whole page for the preview pane
 * beside it and for link previews. The originals run to half a megabyte
 * apiece, so they stay out of `public/`.
 */
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeImage, writeSiteImages } from "@fz/dev/screenshots";

/** @import { Region, ResizeOptions } from "sharp" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "docs/screenshots");
const SOURCE = "overview.png";
const TARGET_DIR = join(ROOT, "public/docs/screenshots");

/**
 * The rules page's image, twice the 800 CSS px it is shown at, so that it
 * stays sharp on a high density display. It is looked at closely, so it is
 * written at a higher quality than the site's images.
 */
const OVERVIEW = { file: "overview.webp", width: 1600, height: 900 };

/** The WebP quality of the rules page's image. */
const OVERVIEW_QUALITY = 90;

/**
 * The most of the height the header may take before the crop is assumed to
 * have missed the felt.
 */
const MAX_CHROME_FRACTION = 0.2;

/**
 * Returns whether a pixel is bare felt, which the default table is: a green
 * well clear of both red and blue.
 *
 * The header's translucent tint over the felt leans towards blue, which is
 * what tells it apart.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isFelt(r, g, b) {
  return g > r + 30 && g > b + 30;
}

/**
 * Finds the board below the header, and the colour of the felt along its
 * bottom edge.
 *
 * The board starts at the first row of felt down a column near the middle.
 *
 * @param {string} source The screenshot.
 * @returns {Promise<{region: Region, felt: {r: number, g: number, b: number}}>}
 */
async function findBoard(source) {
  const { data, info } = await sharp(source)
    .raw()
    .toBuffer({ resolveWithObject: true });
  /**
   * Returns whether the screenshot's pixel at a point is felt.
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  const feltAt = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return isFelt(data[i], data[i + 1], data[i + 2]);
  };

  const column = Math.floor(info.width * 0.45);
  let top = 0;
  while (top < info.height && !feltAt(column, top)) top++;

  if (top > info.height * MAX_CHROME_FRACTION) {
    throw new Error(
      `${source}: found no felt below the header. Capture screenshots on the default green table.`,
    );
  }
  const i =
    ((info.height - 1) * info.width + Math.floor(info.width / 2)) *
    info.channels;
  return {
    region: { left: 0, top, width: info.width, height: info.height - top },
    felt: { r: data[i], g: data[i + 1], b: data[i + 2] },
  };
}

/**
 * Writes the rules page's image and the site's two of one game's screenshot,
 * returning their sizes.
 *
 * The site's thumbnail is cropped to the board, since the header would be an
 * illegible strip at its size.
 *
 * @param {string} id The game, which names its screenshot directories.
 * @returns {Promise<string[]>}
 */
async function shrink(id) {
  const source = join(SOURCE_DIR, id, SOURCE);
  const targetDir = join(TARGET_DIR, id);
  const { region, felt } = await findBoard(source);
  // Contained rather than cropped, since a wide board runs edge to edge; any
  // strip left over goes below it, as more felt.
  /** @type {ResizeOptions} */
  const resize = { fit: "contain", position: "top", background: felt };
  const sizes = await writeSiteImages(source, targetDir, {
    thumbRegion: region,
    resize,
  });
  const overview = await writeImage(
    source,
    join(targetDir, OVERVIEW.file),
    OVERVIEW,
    { resize, quality: OVERVIEW_QUALITY },
  );
  const written = new Map([[OVERVIEW.file, overview], ...sizes]);
  return [...written].map(
    ([file, bytes]) => `${file} ${Math.round(bytes / 1024)} KB`,
  );
}

async function main() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const games = entries.filter((entry) => entry.isDirectory());
  for (const game of games) {
    const sizes = await shrink(game.name);
    console.log(`${game.name}: ${sizes.join(", ")}`);
  }
  console.log(`Shrank ${games.length} screenshots.`);
}

await main();
