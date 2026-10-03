/**
 * Builds the card texture atlas from the vector sources.
 *
 *   yarn build:atlas
 *
 * Rasterizes the card sheet and the pile placeholders at RASTER_SCALE times the
 * design frame size, shrinks the finished frames to every other density in
 * ART_SCALES, and for each density packs the frames into as few atlas pages as
 * fit within MAX_PAGE_PX and writes the pages plus a Phaser multi-atlas
 * manifest.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = join(ROOT, "src/engine/render/assets/sprites/card");
const OUT_DIR = join(ROOT, "src/engine/render/assets/sprites/atlas");

/**
 * The densities each deck is built at, in texels per design unit, which must
 * match `CardArtScale` in `src/engine/render/layout/card_metrics.ts`.
 *
 * The first is the one the sheets are rasterized at; the rest are shrunk from
 * its finished frames, so every density is framed and edged alike.
 */
const ART_SCALES = [2, 1];

/** The density the sheets are rasterized at. */
const RASTER_SCALE = ART_SCALES[0];

/** The card frame size in design units, as the board layout measures it. */
const DESIGN_FRAME_W = 220;
const DESIGN_FRAME_H = 307;

const FRAME_W = DESIGN_FRAME_W * RASTER_SCALE;
const FRAME_H = DESIGN_FRAME_H * RASTER_SCALE;

/**
 * Transparent pixels kept between frames, so bilinear sampling at a fractional
 * scale cannot pull in the neighbouring card.
 */
const GUTTER = 8;

/** Transparent border around the outside of a page, for the same reason. */
const MARGIN = 4;

/** Largest page dimension to emit: the most some older mobile GPUs allow. */
const MAX_PAGE_PX = 4096;

/**
 * The shape every deck's card sheet shares: the 52 faces in four rows of
 * thirteen, and the two backs alone on a fifth.
 *
 * Gutters separate the cards, which is how the cutter finds them.
 */
const SHEET = {
  width: 3249,
  height: 1709,
  cols: 13,
  /** Rows of card faces. */
  faceRows: 4,
  /** Total rows, including the row holding the two backs. */
  rows: 5,
};

/** A card's own size on the sheet, in user units, and how far it may vary. */
const SHEET_CARD = { width: 224, height: 313, tolerance: 3 };

/**
 * The decks on offer, each drawn from its own sheet and written to its own
 * directory under OUT_DIR.
 *
 * Ids must match `CardDeckId` in `src/engine/render/card_deck.ts`.
 */
const DECKS = [
  { id: "classic", file: "playing_card_assets_large.svg" },
  { id: "indexed", file: "playing_card_assets_corner_pips.svg" },
  { id: "all-corner-pips", file: "playing_card_assets_all_corner_pips.svg" },
];

/** Pixels per SVG user unit when rendering the sheet. */
const SHEET_PPU = RASTER_SCALE;

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

/** The placeholder sheet: one cell of the design frame size per name, in a row. */
const PLACEHOLDERS = {
  file: "card_placeholders.svg",
  names: [
    "card-placeholder",
    "card-placeholder-full-border-circle",
    "card-placeholder-full-border-reset",
    "card-placeholder-full-border",
    "card-placeholder-full-border-reset-2-of-2",
    "card-placeholder-full-border-reset-1-of-2",
    "card-placeholder-full-border-reset-3-of-3",
    "card-placeholder-full-border-reset-2-of-3",
    "card-placeholder-full-border-reset-1-of-3",
  ],
};

/**
 * Rasterizes an SVG region to exactly `width` x `height` pixels.
 *
 * Each axis stretches independently, so grid cells that are not square in user
 * units still land on whole pixels.
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
 * Marks every pixel the sheet has drawn something on.
 *
 * Anything but full transparency counts, so the only clear lines on the sheet
 * are the gutters.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @returns {Uint8Array} One byte per pixel, row major.
 */
function paintedMask(sheet) {
  const { data, info } = sheet;
  const mask = new Uint8Array(info.width * info.height);
  for (let pixel = 0; pixel < mask.length; pixel++) {
    mask[pixel] = data[pixel * 4 + 3] > 16 ? 1 : 0;
  }
  return mask;
}

/**
 * Splits a line profile into the runs that carry paint.
 *
 * @param {number[]} painted How many painted pixels each line holds.
 * @returns {{start: number, end: number}[]} Inclusive runs, ascending.
 */
function paintedRuns(painted) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < painted.length; i++) {
    if (painted[i] > 0 && start < 0) start = i;
    if (painted[i] === 0 && start >= 0) {
      runs.push({ start, end: i - 1 });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ start, end: painted.length - 1 });
  return runs;
}

/**
 * Checks a set of runs is the row or column of cards it should be, in count and
 * in size.
 *
 * @param {{start: number, end: number}[]} runs The runs found.
 * @param {number} count How many cards the axis holds.
 * @param {number} size A card's size along the axis, in pixels.
 * @param {string} axis Axis name, for error messages.
 */
function assertCardRuns(runs, count, size, axis) {
  if (runs.length !== count) {
    throw new Error(
      `Expected ${count} ${axis} runs of cards on the sheet, found ` +
        `${runs.length}: ${runs.map((r) => `${r.start}-${r.end}`).join(", ")}`,
    );
  }
  const slack = SHEET_CARD.tolerance * SHEET_PPU;
  for (const [index, run] of runs.entries()) {
    const span = run.end - run.start + 1;
    if (Math.abs(span - size) > slack) {
      throw new Error(
        `The ${axis} run at ${index} spans ${span}px, but a card is ${size}px ` +
          `give or take ${slack}; something is drawn out in a gutter`,
      );
    }
  }
}

/**
 * Locates the cards on the sheet, each run of painted lines being one row or
 * column of cards.
 *
 * Columns are found over the whole sheet, since the row of backs holds only two
 * cards.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @returns {{columns: {start: number, end: number}[], rows: {start: number, end: number}[]}} Card spans in pixels.
 */
function findCards(sheet) {
  const { width, height } = sheet.info;
  const mask = paintedMask(sheet);

  const columnPaint = new Array(width).fill(0);
  const rowPaint = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      columnPaint[x]++;
      rowPaint[y]++;
    }
  }

  const columns = paintedRuns(columnPaint);
  const rows = paintedRuns(rowPaint);
  assertCardRuns(columns, SHEET.cols, SHEET_CARD.width * SHEET_PPU, "vertical");
  assertCardRuns(rows, SHEET.rows, SHEET_CARD.height * SHEET_PPU, "horizontal");
  return { columns, rows };
}

/**
 * Cuts a grid of exactly FRAME_W x FRAME_H frames out of a rendered sheet,
 * copying pixels without resampling.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @param {(row: number, col: number) => string | null} nameAt Frame name for a cell, or null to skip it.
 * @param {number} rows Grid rows.
 * @param {number} cols Grid columns.
 * @param {(row: number, col: number) => {left: number, top: number}} originAt Crop origin for a cell.
 * @returns {Promise<{name: string, png: Buffer}[]>} The cut frames.
 */
async function cutFrames(sheet, nameAt, rows, cols, originAt) {
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const name = nameAt(row, col);
      if (!name) continue;

      const { left, top } = originAt(row, col);
      const png = await sharp(sheet.data, {
        raw: {
          width: sheet.info.width,
          height: sheet.info.height,
          channels: 4,
        },
      })
        .extract({ left, top, width: FRAME_W, height: FRAME_H })
        .png()
        .toBuffer();

      frames.push({ name, png });
    }
  }
  return frames;
}

/** How far into a frame to look for a bled rule, in pixels. */
const EDGE_RING_PX = 10;

/**
 * How much of each corner to ignore when inspecting an edge, in pixels at
 * RASTER_SCALE, since only there does a card's own outline fall inside the
 * frame.
 */
const EDGE_CORNER_PX = 48;

/** Fraction of an edge that must be inked before it counts as a bled rule. */
const EDGE_BLEED_COVERAGE = 0.5;

/** The sides of a frame, in the order they are reported. */
const EDGE_NAMES = ["left", "right", "top", "bottom"];

/**
 * Decodes a frame and returns a scorer for how much of one of its edges is
 * inked at a given depth, as a fraction of that edge's length.
 *
 * @param {Buffer} png The frame to measure.
 * @param {number} cornerPx How much of each corner to ignore, in pixels.
 * @returns {Promise<(edge: string, depth: number) => number>} The scorer.
 */
async function edgeScorer(png, cornerPx = EDGE_CORNER_PX) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  /** Returns whether a pixel is ink, not paper or an antialiased edge. */
  const isInk = (x, y) => {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] <= 250) return 0;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 190 ? 1 : 0;
  };

  const from = cornerPx;
  const toX = info.width - cornerPx;
  const toY = info.height - cornerPx;

  const edges = {
    left: { span: toY - from, at: (i, depth) => isInk(depth, from + i) },
    right: {
      span: toY - from,
      at: (i, depth) => isInk(info.width - 1 - depth, from + i),
    },
    top: { span: toX - from, at: (i, depth) => isInk(from + i, depth) },
    bottom: {
      span: toX - from,
      at: (i, depth) => isInk(from + i, info.height - 1 - depth),
    },
  };

  return (edge, depth) => {
    const { span, at } = edges[edge];
    let inked = 0;
    for (let i = 0; i < span; i++) inked += at(i, depth);
    return inked / span;
  };
}

/**
 * Fails the build if any frame has a neighbouring card's rule inside it: a line
 * inking most of an edge's length, unlike artwork that merely sits near it.
 *
 * Run it before {@link stampCardEdge}, whose edge it would read as bled.
 *
 * @param {{name: string, png: Buffer}[]} frames The cut frames.
 */
async function assertEdgesAreClear(frames) {
  const dirty = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png);

    let worst = 0;
    let worstEdge = "";
    for (let depth = 0; depth < EDGE_RING_PX; depth++) {
      for (const edge of EDGE_NAMES) {
        const coverage = score(edge, depth);
        if (coverage > worst) {
          worst = coverage;
          worstEdge = edge;
        }
      }
    }

    if (worst > EDGE_BLEED_COVERAGE) {
      dirty.push(
        `${frame.name} (${worstEdge} edge ${Math.round(worst * 100)}% inked)`,
      );
    }
  }

  if (dirty.length > 0) {
    throw new Error(
      `Frames have a line running along an edge, so the crop is off its ` +
        `card:\n  ${dirty.join("\n  ")}`,
    );
  }
}

/**
 * The hairline edge stamped onto every card frame, in texels.
 *
 * The frame is cut a little inside the card, losing its outline, so without
 * this two overlapping face-up cards read as one white shape. The drop shadow
 * cannot stand in for it, since it falls away from the seams the fans make.
 */
const CARD_EDGE = {
  width: 4,
  color: "#000000",
  opacity: 0.55,
  /**
   * Corner radius of the stroke's centreline, kept tight because the frames'
   * chamfered corners vary; the composite clips whatever overhangs.
   */
  radius: 2,
};

/**
 * Renders the card edge once, for compositing onto every frame.
 *
 * @returns {Buffer} The edge as a frame-sized PNG.
 */
function renderCardEdge() {
  const inset = CARD_EDGE.width / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${FRAME_W}" height="${FRAME_H}">` +
    `<rect x="${inset}" y="${inset}"` +
    ` width="${FRAME_W - CARD_EDGE.width}"` +
    ` height="${FRAME_H - CARD_EDGE.width}"` +
    ` rx="${CARD_EDGE.radius}" fill="none"` +
    ` stroke="${CARD_EDGE.color}" stroke-opacity="${CARD_EDGE.opacity}"` +
    ` stroke-width="${CARD_EDGE.width}"/>` +
    `</svg>`;
  return new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
}

/**
 * Stamps the card edge onto each frame.
 *
 * Composited `atop`, so the stroke stays inside the card's silhouette rather
 * than in the transparent corners, where sampling would fringe it back in.
 *
 * @param {{name: string, png: Buffer}[]} frames The cut frames.
 * @returns {Promise<{name: string, png: Buffer}[]>} The stamped frames.
 */
async function stampCardEdge(frames) {
  const edge = renderCardEdge();
  return Promise.all(
    frames.map(async (frame) => ({
      name: frame.name,
      png: await sharp(frame.png)
        .composite([{ input: edge, blend: "atop" }])
        .png()
        .toBuffer(),
    })),
  );
}

/**
 * Depth the stamped edge is measured at: one texel in, clear of the outermost
 * row's antialiasing.
 */
const EDGE_STAMP_DEPTH = 1;

/** Fraction of an edge the stamp has to ink to count as present. */
const EDGE_STAMP_COVERAGE = 0.9;

/**
 * Fails the build if a frame came out of {@link stampCardEdge}, or out of
 * shrinking a stamped frame, without an edge.
 *
 * @param {{name: string, png: Buffer}[]} frames The stamped frames.
 * @param {number} artScale The density the frames are at.
 */
async function assertEdgesAreStamped(frames, artScale) {
  const cornerPx = (EDGE_CORNER_PX * artScale) / RASTER_SCALE;
  const missing = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png, cornerPx);

    let worst = 1;
    let worstEdge = "";
    for (const edge of EDGE_NAMES) {
      const coverage = score(edge, EDGE_STAMP_DEPTH);
      if (coverage < worst) {
        worst = coverage;
        worstEdge = edge;
      }
    }

    if (worst < EDGE_STAMP_COVERAGE) {
      missing.push(
        `${frame.name} (${worstEdge} edge only ${Math.round(worst * 100)}% inked)`,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Frames at ${artScale}x did not come out with an edge on every ` +
        `side:\n  ${missing.join("\n  ")}`,
    );
  }
}

/**
 * Shrinks finished frames to another density.
 *
 * sharp resizes in premultiplied alpha, so the transparent corners do not
 * darken the card's edge.
 *
 * @param {{name: string, png: Buffer}[]} frames Frames at RASTER_SCALE.
 * @param {number} artScale The density to shrink them to.
 * @returns {Promise<{name: string, png: Buffer}[]>} The shrunk frames.
 */
async function scaleFrames(frames, artScale) {
  if (artScale === RASTER_SCALE) return frames;
  return Promise.all(
    frames.map(async (frame) => ({
      name: frame.name,
      png: await sharp(frame.png)
        .resize(DESIGN_FRAME_W * artScale, DESIGN_FRAME_H * artScale, {
          fit: "fill",
        })
        .png()
        .toBuffer(),
    })),
  );
}

/**
 * Splits frames into pages and lays each page out as a grid.
 *
 * @param {{name: string, png: Buffer}[]} frames The frames to pack.
 * @param {number} frameW Frame width in pixels.
 * @param {number} frameH Frame height in pixels.
 * @returns {{frames: {name: string, png: Buffer, x: number, y: number}[], width: number, height: number}[]} The pages.
 */
function packPages(frames, frameW, frameH) {
  const maxColumns = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (frameW + GUTTER),
  );
  const rows = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (frameH + GUTTER),
  );
  if (maxColumns < 1 || rows < 1) {
    throw new Error(
      `A ${frameW}x${frameH} frame does not fit a ${MAX_PAGE_PX}px page`,
    );
  }

  const perPage = maxColumns * rows;
  const pages = [];
  for (let start = 0; start < frames.length; start += perPage) {
    const pageFrames = frames.slice(start, start + perPage);
    // Size the page to its contents rather than the maximum, so a page holding
    // a handful of leftover frames does not cost a full 4096 square of VRAM,
    // and spread them over the fewest columns that keep the same rows, so the
    // last row is not left mostly empty.
    const usedRows = Math.ceil(pageFrames.length / maxColumns);
    const columns = Math.ceil(pageFrames.length / usedRows);
    const placed = pageFrames.map((frame, index) => ({
      ...frame,
      x: MARGIN + (index % columns) * (frameW + GUTTER),
      y: MARGIN + Math.floor(index / columns) * (frameH + GUTTER),
    }));

    pages.push({
      frames: placed,
      width: 2 * MARGIN + columns * frameW + (columns - 1) * GUTTER,
      height: 2 * MARGIN + usedRows * frameH + (usedRows - 1) * GUTTER,
    });
  }
  return pages;
}

/** Removes a previous build, so stale pages cannot linger. */
async function cleanOutput(outDir) {
  const existing = await readdir(outDir).catch(() => []);
  for (const file of existing) {
    if (/^card_assets(-\d+)?\.png$/.test(file)) {
      await unlink(join(outDir, file));
    }
  }
}

/**
 * Builds one deck's atlas from its own sheet.
 *
 * @param {typeof DECKS[number]} deck The deck to build.
 * @param {{name: string, png: Buffer}[]} placeholderFrames The shared placeholders.
 */
async function buildDeck(deck, placeholderFrames) {
  console.log(`${deck.id}  (${deck.file}):`);

  const source = await readFile(join(CARD_DIR, deck.file), "utf8");
  const sheet = await rasterize(
    source,
    { x: 0, y: 0, w: SHEET.width, h: SHEET.height },
    SHEET.width * SHEET_PPU,
    SHEET.height * SHEET_PPU,
  );

  const cards = findCards(sheet);
  console.log(
    `  grid: ${cards.columns.length} columns of cards, ` +
      `${cards.rows.length} rows`,
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
    (row, col) => {
      // Centre the frame on the card, trimming an even sliver off each side and
      // keeping the gutter out of the crop.
      const column = cards.columns[col];
      const line = cards.rows[row];
      return {
        left: Math.round((column.start + column.end + 1) / 2 - FRAME_W / 2),
        top: Math.round((line.start + line.end + 1) / 2 - FRAME_H / 2),
      };
    },
  );

  await assertEdgesAreClear(cardFrames);

  // Placeholders are outline art already, and are drawn under the cards rather
  // than overlapping them, so only the cards are stamped.
  const stampedCards = await stampCardEdge(cardFrames);

  for (const artScale of ART_SCALES) {
    const scaledCards = await scaleFrames(stampedCards, artScale);
    await assertEdgesAreStamped(scaledCards, artScale);
    const placeholders = await scaleFrames(placeholderFrames, artScale);
    await writeAtlas(
      [...scaledCards, ...placeholders],
      artScale,
      join(OUT_DIR, deck.id, `${artScale}x`),
    );
  }
}

/**
 * Packs one density's frames into pages and writes them with their manifest.
 *
 * @param {{name: string, png: Buffer}[]} frames The frames, at `artScale`.
 * @param {number} artScale The density the frames are at.
 * @param {string} outDir The directory to write into.
 */
async function writeAtlas(frames, artScale, outDir) {
  const frameW = DESIGN_FRAME_W * artScale;
  const frameH = DESIGN_FRAME_H * artScale;
  const pages = packPages(frames, frameW, frameH);

  await mkdir(outDir, { recursive: true });
  await cleanOutput(outDir);

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
      .toFile(join(outDir, image));

    textures.push({
      image,
      format: "RGBA8888",
      size: { w: page.width, h: page.height },
      scale: 1,
      frames: page.frames.map((frame) => ({
        filename: frame.name,
        frame: { x: frame.x, y: frame.y, w: frameW, h: frameH },
        anchor: { x: 0.5, y: 0.5 },
      })),
    });

    console.log(
      `  ${artScale}x/${image}  ${page.width}x${page.height}  ${page.frames.length} frames`,
    );
  }

  await writeFile(
    join(outDir, "card_assets_atlas.json"),
    `${JSON.stringify({ textures }, null, 2)}\n`,
  );

  console.log(
    `  ${frames.length} frames at ${frameW}x${frameH} (${artScale}x) across ${pages.length} page(s)`,
  );
}

async function main() {
  // Cut once and shared by every deck: the placeholders mark an empty pile
  // rather than being cards, so no deck draws them differently.
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
    (_row, col) => ({ left: col * FRAME_W, top: 0 }),
  );

  for (const deck of DECKS) {
    await buildDeck(deck, placeholderFrames);
  }

  console.log(`Built ${DECKS.length} decks.`);
}

await main();
