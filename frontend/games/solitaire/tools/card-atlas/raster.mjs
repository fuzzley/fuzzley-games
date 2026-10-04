/**
 * The frame every deck is cut to, and the rasterizing, cutting and edge
 * measuring every deck shares, however its artwork is drawn.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

/**
 * The densities each deck is built at, in texels per design unit, which must
 * match `CardArtScale` in `src/engine/render/layout/card_metrics.ts`.
 *
 * The first is the one the artwork is rasterized at; the rest are shrunk from
 * its finished frames, so every density is framed and edged alike.
 */
export const ART_SCALES = [2, 1];

/** The density the artwork is rasterized at. */
export const RASTER_SCALE = ART_SCALES[0];

/** The card frame size in design units, as the board layout measures it. */
export const DESIGN_FRAME_W = 220;
export const DESIGN_FRAME_H = 307;

export const FRAME_W = DESIGN_FRAME_W * RASTER_SCALE;
export const FRAME_H = DESIGN_FRAME_H * RASTER_SCALE;

/**
 * The card backs every deck is given, whatever its faces, which must match
 * `CardBackStyle` in `src/engine/render/card_back.ts`: the plain backs the
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
 * @param {{x: number, y: number, w: number, h: number}} box The user-unit region to render.
 * @param {number} width Output width in pixels.
 * @param {number} height Output height in pixels.
 * @param {import("@resvg/resvg-js").ResvgRenderOptions["font"]} [font] Fonts
 *   for any text the SVG draws.
 * @returns {Promise<{data: Buffer, info: sharp.OutputInfo}>} Raw RGBA pixels.
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

  const png = new Resvg(sized, { fitTo: { mode: "original" }, font })
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
export async function cutFrames(sheet, nameAt, rows, cols, originAt) {
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

/**
 * How much of each corner to ignore when inspecting an edge, in pixels at
 * RASTER_SCALE, since only there does a card's own outline fall inside the
 * frame.
 */
export const EDGE_CORNER_PX = 48;

/** The sides of a frame, in the order they are reported. */
export const EDGE_NAMES = ["left", "right", "top", "bottom"];

/**
 * Decodes a frame and returns a scorer for how much of one of its edges is
 * inked at a given depth, as a fraction of that edge's length.
 *
 * @param {Buffer} png The frame to measure.
 * @param {number} cornerPx How much of each corner to ignore, in pixels.
 * @returns {Promise<(edge: string, depth: number) => number>} The scorer.
 */
export async function edgeScorer(png, cornerPx = EDGE_CORNER_PX) {
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
