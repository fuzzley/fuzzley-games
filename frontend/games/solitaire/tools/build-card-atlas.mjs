/**
 * Builds the card texture atlas from the vector sources.
 *
 *   yarn build:atlas
 *
 * Rasterizes the card sheet and the pile placeholders at ART_SCALE times the
 * design frame size, packs the frames into as few atlas pages as fit within
 * MAX_PAGE_PX, and writes the pages plus a Phaser multi-atlas manifest.
 *
 * The sheet is rendered in one pass by rewriting the SVG root to a viewBox over
 * the card block with preserveAspectRatio="none". That maps every grid cell onto
 * a whole number of pixels, so each frame is cut out at exactly its final size
 * and never goes through a resampling step.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = join(ROOT, "src/game/assets/sprites/card");
const OUT_DIR = join(ROOT, "src/game/assets/sprites/atlas");

/**
 * Texels per design unit. Must match CARD_ART_SCALE in
 * src/game/render/scene/board/layout/board_layout_constants.ts.
 */
const ART_SCALE = 2;

/** The card frame size in design units, as the board layout measures it. */
const DESIGN_FRAME_W = 220;
const DESIGN_FRAME_H = 307;

const FRAME_W = DESIGN_FRAME_W * ART_SCALE;
const FRAME_H = DESIGN_FRAME_H * ART_SCALE;

/**
 * Transparent pixels kept between frames. Without a gutter, bilinear sampling
 * at a fractional scale reaches past a frame's edge and pulls in the
 * neighbouring card, fringing the card borders.
 */
const GUTTER = 8;

/** Transparent border around the outside of a page, for the same reason. */
const MARGIN = 4;

/**
 * Largest page dimension to emit. WebGL guarantees far more than this on
 * desktop, but 4096 is the floor still found on older mobile GPUs.
 */
const MAX_PAGE_PX = 4096;

/**
 * The card sheet's grid, in SVG user units. The 52 faces occupy four rows; the
 * two backs sit alone on a fifth. Cells abut with no gutter of their own, so
 * the block is exactly COLS x ROWS cells.
 */
const SHEET = {
  file: "playing_card_assets_large.svg",
  x: 86,
  y: 34,
  cellW: 2907 / 13,
  cellH: 1252 / 4,
  cols: 13,
  rows: 5,
};

/** Suits in card sheet row order. */
const SHEET_SUITS = ["clubs", "hearts", "spades", "diamonds"];

/** Ranks in card sheet column order. */
const SHEET_RANKS = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
];

/** The two card backs, on the sheet's fifth row. */
const SHEET_BACKS = ["card-back-blue", "card-back-red"];

/** The placeholder sheet: three cells of the design frame size, in a row. */
const PLACEHOLDERS = {
  file: "card_placeholders.svg",
  names: [
    "card-placeholder",
    "card-placeholder-full-border-circle",
    "card-placeholder-full-border-reset",
  ],
};

/**
 * Rasterizes an SVG region to exactly `width` x `height` pixels.
 *
 * Rewrites the root element's sizing attributes so the given user-unit box maps
 * onto the whole output, stretching each axis independently. The card grid's
 * cells are not square in user units, so a uniform fit would leave them on
 * fractional pixel boundaries.
 *
 * @param {string} svg The SVG document source.
 * @param {{x: number, y: number, w: number, h: number}} box The user-unit region to render.
 * @param {number} width Output width in pixels.
 * @param {number} height Output height in pixels.
 * @returns {Promise<{data: Buffer, info: sharp.OutputInfo}>} Raw RGBA pixels.
 */
async function rasterize(svg, box, width, height) {
  const sized = svg.replace(/<svg\b[^>]*?>/, (root) => {
    const attributes = root
      .slice(0, -1)
      .replace(/\s(width|height|viewBox|preserveAspectRatio)="[^"]*"/g, "");
    return (
      `${attributes} width="${width}" height="${height}"` +
      ` viewBox="${box.x} ${box.y} ${box.w} ${box.h}"` +
      ` preserveAspectRatio="none">`
    );
  });

  const png = new Resvg(sized, { fitTo: { mode: "original" } })
    .render()
    .asPng();
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== width || info.height !== height) {
    throw new Error(
      `Expected a ${width}x${height} raster, got ${info.width}x${info.height}`,
    );
  }
  return { data, info };
}

/**
 * Cuts a grid of frames out of a rendered sheet.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @param {(row: number, col: number) => string | null} nameAt Frame name for a cell, or null to skip it.
 * @param {number} rows Grid rows.
 * @param {number} cols Grid columns.
 * @returns {Promise<{name: string, png: Buffer}[]>} The cut frames.
 */
async function cutFrames(sheet, nameAt, rows, cols) {
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const name = nameAt(row, col);
      if (!name) continue;

      const png = await sharp(sheet.data, {
        raw: {
          width: sheet.info.width,
          height: sheet.info.height,
          channels: 4,
        },
      })
        .extract({
          left: col * FRAME_W,
          top: row * FRAME_H,
          width: FRAME_W,
          height: FRAME_H,
        })
        .png()
        .toBuffer();

      frames.push({ name, png });
    }
  }
  return frames;
}

/**
 * Splits frames into pages and lays each page out as a grid.
 *
 * @param {{name: string, png: Buffer}[]} frames The frames to pack.
 * @returns {{frames: {name: string, png: Buffer, x: number, y: number}[], width: number, height: number}[]} The pages.
 */
function packPages(frames) {
  const columns = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (FRAME_W + GUTTER),
  );
  const rows = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (FRAME_H + GUTTER),
  );
  if (columns < 1 || rows < 1) {
    throw new Error(
      `A ${FRAME_W}x${FRAME_H} frame does not fit a ${MAX_PAGE_PX}px page`,
    );
  }

  const perPage = columns * rows;
  const pages = [];
  for (let start = 0; start < frames.length; start += perPage) {
    const pageFrames = frames.slice(start, start + perPage);
    const placed = pageFrames.map((frame, index) => ({
      ...frame,
      x: MARGIN + (index % columns) * (FRAME_W + GUTTER),
      y: MARGIN + Math.floor(index / columns) * (FRAME_H + GUTTER),
    }));

    // Size the page to its contents rather than the maximum, so a page holding
    // a handful of leftover frames does not cost a full 4096 square of VRAM.
    const usedColumns = Math.min(columns, placed.length);
    const usedRows = Math.ceil(placed.length / columns);
    pages.push({
      frames: placed,
      width: 2 * MARGIN + usedColumns * FRAME_W + (usedColumns - 1) * GUTTER,
      height: 2 * MARGIN + usedRows * FRAME_H + (usedRows - 1) * GUTTER,
    });
  }
  return pages;
}

/** Removes atlas artefacts from a previous build so stale pages cannot linger. */
async function cleanOutput() {
  const existing = await readdir(OUT_DIR).catch(() => []);
  for (const file of existing) {
    if (/^card_assets(-\d+)?\.png$/.test(file)) {
      await unlink(join(OUT_DIR, file));
    }
  }
}

async function main() {
  const sheetSvg = await readFile(join(CARD_DIR, SHEET.file), "utf8");
  const sheet = await rasterize(
    sheetSvg,
    {
      x: SHEET.x,
      y: SHEET.y,
      w: SHEET.cols * SHEET.cellW,
      h: SHEET.rows * SHEET.cellH,
    },
    SHEET.cols * FRAME_W,
    SHEET.rows * FRAME_H,
  );

  const cardFrames = await cutFrames(
    sheet,
    (row, col) => {
      if (row < SHEET_SUITS.length) {
        return `card-${SHEET_SUITS[row]}-${SHEET_RANKS[col]}`;
      }
      return SHEET_BACKS[col] ?? null;
    },
    SHEET.rows,
    SHEET.cols,
  );

  const placeholderSvg = await readFile(
    join(CARD_DIR, PLACEHOLDERS.file),
    "utf8",
  );
  const placeholderSheet = await rasterize(
    placeholderSvg,
    {
      x: 0,
      y: 0,
      w: PLACEHOLDERS.names.length * DESIGN_FRAME_W,
      h: DESIGN_FRAME_H,
    },
    PLACEHOLDERS.names.length * FRAME_W,
    FRAME_H,
  );
  const placeholderFrames = await cutFrames(
    placeholderSheet,
    (_row, col) => PLACEHOLDERS.names[col] ?? null,
    1,
    PLACEHOLDERS.names.length,
  );

  const frames = [...cardFrames, ...placeholderFrames];
  const pages = packPages(frames);

  await mkdir(OUT_DIR, { recursive: true });
  await cleanOutput();

  const textures = [];
  for (const [index, page] of pages.entries()) {
    const image = `card_assets-${index}.png`;
    await sharp({
      create: {
        width: page.width,
        height: page.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        page.frames.map((frame) => ({
          input: frame.png,
          left: frame.x,
          top: frame.y,
        })),
      )
      .png({ compressionLevel: 9 })
      .toFile(join(OUT_DIR, image));

    textures.push({
      image,
      format: "RGBA8888",
      size: { w: page.width, h: page.height },
      scale: 1,
      frames: page.frames.map((frame) => ({
        filename: frame.name,
        frame: { x: frame.x, y: frame.y, w: FRAME_W, h: FRAME_H },
        anchor: { x: 0.5, y: 0.5 },
      })),
    });

    console.log(
      `  ${image}  ${page.width}x${page.height}  ${page.frames.length} frames`,
    );
  }

  await writeFile(
    join(OUT_DIR, "card_assets_atlas.json"),
    `${JSON.stringify({ textures }, null, 2)}\n`,
  );

  console.log(
    `Built ${frames.length} frames at ${FRAME_W}x${FRAME_H} (${ART_SCALE}x) across ${pages.length} page(s).`,
  );
}

await main();
