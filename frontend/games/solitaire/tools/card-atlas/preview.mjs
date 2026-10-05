/**
 * Draws a contact sheet of built decks as a phone shows them: a fanned column
 * and a fanned waste, at the size a seven-column and a ten-column board draw
 * their cards.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { DESIGN_FRAME_H, DESIGN_FRAME_W } from "./raster.mjs";
import { COLUMN_STRIP_H, WASTE_STRIP_W } from "./mobile-deck.mjs";

/** @import { OverlayOptions } from "sharp" */
/** @import { AtlasTexture } from "./atlas-writer.mjs" */

/**
 * Returns the pixels of a deck's frame, by its name.
 *
 * @typedef {(name: string) => Promise<Buffer>} FrameReader
 */

/**
 * Device pixels per design unit on a 390 CSS px phone at 3x, for a board of
 * seven columns and of ten, with the compact layout's 8 unit gaps.
 */
const BOARDS = [7, 10].map((columns) => ({
  columns,
  scale: (390 * 3) / (columns * 221 + (columns - 1) * 8 + 2 * 8),
}));

/**
 * How far a face-down card in a column leaves the next one down.
 *
 * Mirrors `TABLEAU_FACE_DOWN_OFFSET` in `src/games/common/pile_layouts.ts`.
 */
const FACE_DOWN_STRIP_H = 18;

/** The column: two cards face down, then a run, the last of it uncovered. */
const COLUMN = [
  "card-back-blue",
  "card-back-blue",
  "card-spades-king",
  "card-hearts-queen",
  "card-clubs-jack",
  "card-diamonds-10",
  "card-spades-9",
  "card-hearts-8",
  "card-clubs-7",
  "card-diamonds-6",
];

/** The waste, after a draw of three. */
const WASTE = ["card-clubs-ace", "card-hearts-5", "card-spades-10"];

/** The default felt. Mirrors `DEFAULT_BACKGROUND_COLOR`. */
const FELT = "#0f4d0e";

const GAP = 24;
const LABEL_W = 170;

/**
 * Returns a lookup from frame name to that frame's pixels, read from a deck's
 * built 1x atlas.
 *
 * @param {string} atlasDir
 * @param {string} deckId
 * @returns {Promise<FrameReader>}
 */
async function readFrames(atlasDir, deckId) {
  const dir = join(atlasDir, deckId, "1x");
  /** @type {{textures: AtlasTexture[]}} */
  const manifest = JSON.parse(
    await readFile(join(dir, "card_assets_atlas.json"), "utf8"),
  );
  return async (name) => {
    for (const texture of manifest.textures) {
      const entry = texture.frames.find((frame) => frame.filename === name);
      if (!entry) continue;
      const { x, y, w, h } = entry.frame;
      return sharp(join(dir, texture.image))
        .extract({ left: x, top: y, width: w, height: h })
        .png()
        .toBuffer();
    }
    throw new Error(`${deckId} has no frame ${name}`);
  };
}

/**
 * Returns a frame shrunk to a board's scale.
 *
 * @param {Buffer} png
 * @param {number} scale Device pixels per design unit.
 * @returns {Promise<Buffer>}
 */
function shrink(png, scale) {
  return sharp(png)
    .resize(
      Math.round(DESIGN_FRAME_W * scale),
      Math.round(DESIGN_FRAME_H * scale),
      { fit: "fill", kernel: "linear" },
    )
    .png()
    .toBuffer();
}

/**
 * Returns a line of text as a PNG, for labelling a row.
 *
 * @param {string} text
 * @returns {Buffer}
 */
function label(text) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LABEL_W}" height="40">` +
    `<text x="0" y="26" font-family="sans-serif" font-size="20" fill="#fff">` +
    `${text}</text></svg>`;
  return new Resvg(svg).render().asPng();
}

/**
 * Lays out one deck's row: for each board, its column and its waste.
 *
 * @param {FrameReader} frameOf
 * @param {string} deckId
 * @param {number} top Where the row starts, in pixels down the sheet.
 * @returns {Promise<{layers: OverlayOptions[], width: number, height: number}>}
 */
async function deckRow(frameOf, deckId, top) {
  const layers = [{ input: label(deckId), left: GAP, top }];
  let left = GAP + LABEL_W;
  let height = 0;

  for (const { scale } of BOARDS) {
    let y = 0;
    for (const name of COLUMN) {
      layers.push({
        input: await shrink(await frameOf(name), scale),
        left,
        top: top + Math.round(y * scale),
      });
      y += name.startsWith("card-back") ? FACE_DOWN_STRIP_H : COLUMN_STRIP_H;
    }
    // The last card is face up, and shows whole rather than its strip.
    const columnH = (y - COLUMN_STRIP_H + DESIGN_FRAME_H) * scale;
    left += Math.round(DESIGN_FRAME_W * scale) + GAP;

    for (const [index, name] of WASTE.entries()) {
      layers.push({
        input: await shrink(await frameOf(name), scale),
        left: left + Math.round(index * WASTE_STRIP_W * scale),
        top,
      });
    }
    left +=
      Math.round(
        ((WASTE.length - 1) * WASTE_STRIP_W + DESIGN_FRAME_W) * scale,
      ) +
      2 * GAP;
    height = Math.max(height, Math.ceil(columnH));
  }
  return { layers, width: left, height };
}

/**
 * Writes the contact sheet: a row per deck, each read from its built atlas.
 *
 * @param {string} atlasDir The directory the decks are built into.
 * @param {string[]} deckIds The decks, in the order to show them.
 * @param {string} outFile The PNG to write.
 */
export async function writePreview(atlasDir, deckIds, outFile) {
  const layers = [];
  let width = 0;
  let top = GAP;
  for (const deckId of deckIds) {
    const row = await deckRow(await readFrames(atlasDir, deckId), deckId, top);
    layers.push(...row.layers);
    width = Math.max(width, row.width);
    top += row.height + GAP;
  }

  await mkdir(dirname(outFile), { recursive: true });
  await sharp({
    create: { width, height: top, channels: 4, background: FELT },
  })
    .composite(layers)
    .png()
    .toFile(outFile);

  const boards = BOARDS.map(
    ({ columns, scale }) => `${columns} columns at ${scale.toFixed(3)}`,
  ).join(", ");
  console.log(`Preview (device px per design unit: ${boards}): ${outFile}`);
}
