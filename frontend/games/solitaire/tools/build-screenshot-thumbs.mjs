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
import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @import { Region } from "sharp" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "docs/screenshots");
const SOURCE = "overview.png";
const TARGET_DIR = join(ROOT, "public/docs/screenshots");

/**
 * The images to write, each twice the CSS size it is shown at so that it
 * stays sharp on a high density display: the rules page shows its screenshot
 * at up to 800 CSS px wide.
 *
 * The thumbnail is cropped to the board, since the header would be an
 * illegible strip at its size. The quality keeps card faces legible at a
 * fraction of the PNG's size; the rules page's larger image gets more, since
 * it is looked at closely.
 */
const OUTPUTS = [
  {
    file: "overview.webp",
    width: 1600,
    height: 900,
    boardOnly: false,
    quality: 90,
  },
  { file: "thumb.webp", width: 192, height: 108, boardOnly: true, quality: 80 },
  {
    file: "preview.webp",
    width: 1280,
    height: 720,
    boardOnly: false,
    quality: 80,
  },
];

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
 * Writes every output of one game's screenshot, returning their sizes.
 *
 * @param {string} id The game, which names its screenshot directories.
 * @returns {Promise<string[]>}
 */
async function shrink(id) {
  const source = join(SOURCE_DIR, id, SOURCE);
  const targetDir = join(TARGET_DIR, id);
  await mkdir(targetDir, { recursive: true });
  const { region, felt } = await findBoard(source);
  const sizes = [];
  for (const output of OUTPUTS) {
    const target = join(targetDir, output.file);
    const image = sharp(source);
    await (output.boardOnly ? image.extract(region) : image)
      // Contained rather than cropped, since a wide board runs edge to edge;
      // any strip left over goes below it, as more felt.
      .resize(output.width, output.height, {
        fit: "contain",
        position: "top",
        background: felt,
      })
      .webp({ quality: output.quality })
      .toFile(target);
    const kilobytes = Math.round((await stat(target)).size / 1024);
    sizes.push(`${output.file} ${kilobytes} KB`);
  }
  return sizes;
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
