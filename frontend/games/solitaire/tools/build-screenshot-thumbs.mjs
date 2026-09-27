/**
 * Shrinks each game's rules-page screenshot into the images the game browser
 * shows.
 *
 *   yarn build:thumbs
 *
 * Reads `public/docs/screenshots/<id>/overview.png`, crops away the header
 * above the board, and writes a `thumb.webp` for a row of the list and a
 * `preview.webp` for the preview pane beside it. The full screenshots run to
 * a megabyte apiece, too heavy to list.
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots");
const SOURCE = "overview.png";

/**
 * The images to write, each twice the CSS size it is shown at so that it
 * stays sharp on a high density display.
 */
const OUTPUTS = [
  { file: "thumb.webp", width: 192, height: 108 },
  { file: "preview.webp", width: 1280, height: 720 },
];

/** WebP quality, which keeps card faces legible at a fraction of the PNG. */
const QUALITY = 80;

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
 */
function isFelt(r, g, b) {
  return g > r + 30 && g > b + 30;
}

/**
 * Finds the board below the header, and the colour of the felt along its
 * bottom edge.
 *
 * The board starts at the first row of felt down a column near the middle.
 */
async function findBoard(source) {
  const { data, info } = await sharp(source)
    .raw()
    .toBuffer({ resolveWithObject: true });
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

/** Writes every output of one game's screenshot, returning their sizes. */
async function shrink(dir) {
  const source = join(dir, SOURCE);
  const { region, felt } = await findBoard(source);
  const sizes = [];
  for (const output of OUTPUTS) {
    const target = join(dir, output.file);
    await sharp(source)
      .extract(region)
      // Contained rather than cropped, since a wide board runs edge to edge;
      // any strip left over goes below it, as more felt.
      .resize(output.width, output.height, {
        fit: "contain",
        position: "top",
        background: felt,
      })
      .webp({ quality: QUALITY })
      .toFile(target);
    const kilobytes = Math.round((await stat(target)).size / 1024);
    sizes.push(`${output.file} ${kilobytes} KB`);
  }
  return sizes;
}

async function main() {
  const entries = await readdir(SCREENSHOT_DIR, { withFileTypes: true });
  const games = entries.filter((entry) => entry.isDirectory());
  for (const game of games) {
    const sizes = await shrink(join(SCREENSHOT_DIR, game.name));
    console.log(`${game.name}: ${sizes.join(", ")}`);
  }
  console.log(`Shrank ${games.length} screenshots.`);
}

await main();
