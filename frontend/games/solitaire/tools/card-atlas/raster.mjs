/**
 * The frame every deck is cut to, and the rasterizing, cutting and edge
 * measuring every deck shares, however its artwork is drawn.
 */
import { renderAsync } from "@resvg/resvg-js";
import sharp from "sharp";

/** @import { ResvgRenderOptions } from "@resvg/resvg-js" */
/** @import { OutputInfo } from "sharp" */

/**
 * A card frame, by the name an atlas lists it under.
 *
 * @typedef {{name: string, png: Buffer}} Frame
 */

/**
 * Raw RGBA pixels, with their size.
 *
 * @typedef {{data: Buffer, info: OutputInfo}} Raster
 */

/**
 * A box, by its top left corner and its size.
 *
 * @typedef {{x: number, y: number, w: number, h: number}} Box
 */

/**
 * A size in texels.
 *
 * @typedef {{width: number, height: number}} Size
 */

/**
 * A side of a frame.
 *
 * @typedef {"left" | "right" | "top" | "bottom"} EdgeName
 */

/**
 * The densities each deck is built at, in texels per design unit, which must
 * match `CardArtScale` in `src/engine/render/deck/card_art_scale.ts`.
 *
 * Every density is drawn from the artwork itself rather than shrunk from
 * another, which keeps thin strokes as sharp without the light halo a shrink
 * leaves around them.
 */
export const ART_SCALES = [0.5, 0.75, 1, 1.5, 2];

/** The card frame size in design units, as the board layout measures it. */
export const DESIGN_FRAME_W = 220;
export const DESIGN_FRAME_H = 307;

/**
 * Returns the size of a frame at a density: the design size scaled and rounded
 * to whole texels, the artwork stretched to fill it, since 307 units at 0.5x
 * would otherwise be 153.5.
 *
 * Mirrors `cardFrameTexels` in `src/engine/render/deck/card_art_scale.ts`.
 *
 * @param {number} artScale Texels per design unit.
 * @returns {Size}
 */
export function frameSize(artScale) {
  return {
    width: Math.round(DESIGN_FRAME_W * artScale),
    height: Math.round(DESIGN_FRAME_H * artScale),
  };
}

/**
 * The card backs every deck is given, whatever its faces, which must match
 * `CardBackStyle` in `src/engine/render/deck/card_back.ts`: the plain backs the
 * mobile deck draws, then the card artwork's own.
 */
export const BACK_FRAME_NAMES = [
  "card-back-blue",
  "card-back-red",
  "card-back-classic-blue",
  "card-back-classic-red",
];

/**
 * The name of every card frame an atlas must hold: a face for each suit and
 * rank, as `playingCardFaceKey` in `src/engine/core/card/playing_card.ts`
 * names it, and every back.
 */
export const CARD_FRAME_NAMES = [
  ...["clubs", "diamonds", "hearts", "spades"].flatMap((suit) =>
    [
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
    ].map((rank) => `card-${suit}-${rank}`),
  ),
  ...BACK_FRAME_NAMES,
];

/**
 * Rasterizes an SVG region to exactly `width` x `height` pixels.
 *
 * Each axis stretches independently, so grid cells that are not square in user
 * units still land on whole pixels.
 *
 * @param {string} svg The SVG document source.
 * @param {Box} box The user-unit region to render.
 * @param {number} width Output width in pixels.
 * @param {number} height Output height in pixels.
 * @param {ResvgRenderOptions["font"]} [font] Fonts for any text the SVG draws.
 * @returns {Promise<Raster>}
 */
export async function rasterize(svg, box, width, height, font) {
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

  // Drawn on one of libuv's worker threads, so several frames draw at once.
  const rendered = await renderAsync(sized, {
    fitTo: { mode: "original" },
    font,
  });
  const { data, info } = await sharp(rendered.asPng())
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
 * Draws one frame at a density from the region of an SVG that holds it.
 *
 * @param {string} name The frame's name.
 * @param {string} svg The SVG document source.
 * @param {Box} box The frame's region, DESIGN_FRAME_W x DESIGN_FRAME_H user units.
 * @param {number} artScale Texels per design unit.
 * @param {ResvgRenderOptions["font"]} [font] Fonts for any text the SVG draws.
 * @returns {Promise<Frame>}
 */
export async function drawFrame(name, svg, box, artScale, font) {
  const { width, height } = frameSize(artScale);
  const { data, info } = await rasterize(svg, box, width, height, font);
  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return { name, png };
}

/**
 * How many frames draw at once: enough to keep libuv's worker threads busy
 * without holding a copy of a large card sheet for every frame of a deck.
 */
const FRAMES_DRAWN_AT_ONCE = 8;

/**
 * Draws a frame for each item, several at once, and returns them in order.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<Frame>} draw
 * @returns {Promise<Frame[]>}
 */
export async function drawEach(items, draw) {
  /** @type {Frame[]} */
  const frames = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      frames[index] = await draw(items[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(FRAMES_DRAWN_AT_ONCE, items.length) },
      worker,
    ),
  );
  return frames;
}

/**
 * Cuts frames of one size out of a rendered sheet, copying pixels without
 * resampling.
 *
 * @param {Raster} sheet The rendered sheet.
 * @param {{name: string, left: number, top: number}[]} cuts Each frame's name and top left corner, in pixels.
 * @param {Size} size The frames' size, in pixels.
 * @returns {Promise<Frame[]>} The cut frames.
 */
export async function cutFrames(sheet, cuts, size) {
  const frames = [];
  for (const { name, left, top } of cuts) {
    const png = await sharp(sheet.data, {
      raw: {
        width: sheet.info.width,
        height: sheet.info.height,
        channels: 4,
      },
    })
      .extract({ left, top, width: size.width, height: size.height })
      .png()
      .toBuffer();

    frames.push({ name, png });
  }
  return frames;
}

/**
 * How much of each corner to ignore when inspecting an edge, in design units,
 * since only there does a card's own outline fall inside the frame.
 */
export const EDGE_CORNER_UNITS = 24;

/**
 * The sides of a frame, in the order they are reported.
 *
 * @type {EdgeName[]}
 */
export const EDGE_NAMES = ["left", "right", "top", "bottom"];

/**
 * Decodes a frame and returns a scorer for how much of one of its edges is
 * inked at a given depth, as a fraction of that edge's length.
 *
 * @param {Buffer} png The frame to measure.
 * @param {number} cornerPx How much of each corner to ignore, in pixels.
 * @returns {Promise<(edge: EdgeName, depth: number) => number>} The scorer.
 */
export async function edgeScorer(png, cornerPx) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  /**
   * Returns 1 if a pixel is ink, not paper or an antialiased edge, and 0 if
   * not, so a run of pixels can be summed.
   *
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  const isInk = (x, y) => {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] <= 250) return 0;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 190 ? 1 : 0;
  };

  const from = cornerPx;
  const toX = info.width - cornerPx;
  const toY = info.height - cornerPx;

  /**
   * Each edge's length, and whether the pixel a distance along it and a depth
   * in from it is ink.
   *
   * @type {Record<EdgeName, {span: number, at: (i: number, depth: number) => number}>}
   */
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
