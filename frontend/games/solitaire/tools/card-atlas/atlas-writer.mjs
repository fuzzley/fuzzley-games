/**
 * Finishes a deck's frames and writes them out as a Phaser multi-atlas, one
 * density at a time, whatever the frames were drawn from.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  CARD_FRAME_NAMES,
  EDGE_CORNER_UNITS,
  EDGE_NAMES,
  edgeScorer,
  frameSize,
} from "./raster.mjs";

/** @import { Box, Frame } from "./raster.mjs" */

/**
 * One atlas page, with where each of its frames sits on it.
 *
 * @typedef {{frames: (Frame & {x: number, y: number})[], width: number, height: number}} Page
 */

/**
 * A page as the atlas manifest lists it, in the multi-atlas form Phaser loads.
 *
 * @typedef {{image: string, format: string, size: {w: number, h: number}, scale: number, frames: {filename: string, frame: Box, anchor: {x: number, y: number}}[]}} AtlasTexture
 */

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
 * The hairline edge stamped onto every card frame, in design units.
 *
 * The frame is cut a little inside the card, losing its outline, so without
 * this two overlapping face-up cards read as one white shape. The drop shadow
 * cannot stand in for it, since it falls away from the seams the fans make.
 */
const CARD_EDGE = {
  widthUnits: 2,
  color: "#000000",
  opacity: 0.55,
  /**
   * Corner radius of the stroke's centreline, kept tight because the frames'
   * chamfered corners vary; the composite clips whatever overhangs.
   */
  radiusUnits: 1,
};

/**
 * Returns how wide the card edge is at a density, in texels: a whole number,
 * so it lands on the texel grid rather than blurring across it, and at least
 * one.
 *
 * @param {number} artScale
 * @returns {number}
 */
function cardEdgeTexels(artScale) {
  return Math.max(1, Math.round(CARD_EDGE.widthUnits * artScale));
}

/**
 * Renders the card edge at a density, for compositing onto every frame.
 *
 * @param {number} artScale
 * @returns {Buffer} The edge as a frame-sized PNG.
 */
function renderCardEdge(artScale) {
  const { width, height } = frameSize(artScale);
  const stroke = cardEdgeTexels(artScale);
  const inset = stroke / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}">` +
    `<rect x="${inset}" y="${inset}"` +
    ` width="${width - stroke}"` +
    ` height="${height - stroke}"` +
    ` rx="${CARD_EDGE.radiusUnits * artScale}" fill="none"` +
    ` stroke="${CARD_EDGE.color}" stroke-opacity="${CARD_EDGE.opacity}"` +
    ` stroke-width="${stroke}"/>` +
    `</svg>`;
  return new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
}

/**
 * Stamps the card edge onto each frame.
 *
 * Composited `atop`, so the stroke stays inside the card's silhouette rather
 * than in the transparent corners, where sampling would fringe it back in.
 *
 * @param {Frame[]} frames The drawn frames.
 * @param {number} artScale The density the frames are at.
 * @returns {Promise<Frame[]>} The stamped frames.
 */
async function stampCardEdge(frames, artScale) {
  const edge = renderCardEdge(artScale);
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
 * row's antialiasing, unless the edge is only one texel wide.
 */
const EDGE_STAMP_DEPTH = 1;

/** Fraction of an edge the stamp has to ink to count as present. */
const EDGE_STAMP_COVERAGE = 0.9;

/**
 * Fails the build if a frame came out of {@link stampCardEdge} without an
 * edge.
 *
 * @param {Frame[]} frames The stamped frames.
 * @param {number} artScale The density the frames are at.
 */
async function assertEdgesAreStamped(frames, artScale) {
  const cornerPx = EDGE_CORNER_UNITS * artScale;
  const depth = Math.min(EDGE_STAMP_DEPTH, cardEdgeTexels(artScale) - 1);
  const missing = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png, cornerPx);

    let worst = 1;
    let worstEdge = "";
    for (const edge of EDGE_NAMES) {
      const coverage = score(edge, depth);
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
 * Splits frames into pages and lays each page out as a grid.
 *
 * @param {Frame[]} frames The frames to pack.
 * @param {number} frameW Frame width in pixels.
 * @param {number} frameH Frame height in pixels.
 * @returns {Page[]}
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
  /** @type {Page[]} */
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

/**
 * Removes a previous build, so stale pages cannot linger.
 *
 * @param {string} outDir
 */
async function cleanOutput(outDir) {
  const existing = await readdir(outDir).catch(() => []);
  for (const file of existing) {
    if (/^card_assets(-\d+)?\.png$/.test(file)) {
      await unlink(join(outDir, file));
    }
  }
}

/**
 * Packs one density's frames into pages and writes them with their manifest.
 *
 * @param {Frame[]} frames The frames, at `artScale`.
 * @param {number} artScale The density the frames are at.
 * @param {string} outDir The directory to write into.
 */
async function writeAtlas(frames, artScale, outDir) {
  const { width: frameW, height: frameH } = frameSize(artScale);
  const pages = packPages(frames, frameW, frameH);

  await mkdir(outDir, { recursive: true });
  await cleanOutput(outDir);

  /** @type {AtlasTexture[]} */
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

/**
 * Fails the build if a deck's cards are not exactly the frames the engine
 * draws from.
 *
 * @param {{name: string}[]} frames The deck's faces and backs.
 */
function assertEveryCardFrame(frames) {
  const names = frames.map((frame) => frame.name);
  const missing = CARD_FRAME_NAMES.filter((name) => !names.includes(name));
  const extra = names.filter(
    (name, index) =>
      !CARD_FRAME_NAMES.includes(name) || names.indexOf(name) !== index,
  );
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `The deck's frames are not the cards the engine draws: ` +
        `missing ${missing.join(", ") || "none"}; ` +
        `unexpected or repeated ${extra.join(", ") || "none"}`,
    );
  }
}

/**
 * Edges a deck's cards at one density and writes them, with the placeholders,
 * as that density's atlas under `deckDir`.
 *
 * @param {Frame[]} cardFrames The faces and backs, at `artScale`.
 * @param {Frame[]} placeholderFrames The shared placeholders, at `artScale`.
 * @param {number} artScale The density the frames are drawn at.
 * @param {string} deckDir The deck's directory; each density gets its own inside it.
 */
export async function writeDeckAtlas(
  cardFrames,
  placeholderFrames,
  artScale,
  deckDir,
) {
  assertEveryCardFrame(cardFrames);

  // Placeholders are outline art already, and are drawn under the cards rather
  // than overlapping them, so only the cards are stamped.
  const stampedCards = await stampCardEdge(cardFrames, artScale);
  await assertEdgesAreStamped(stampedCards, artScale);
  await writeAtlas(
    [...stampedCards, ...placeholderFrames],
    artScale,
    join(deckDir, `${artScale}x`),
  );
}
