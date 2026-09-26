import { Point } from "@/engine/core/common/point";
import { Viewport } from "../view/table_view_state";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  HEADER_HEIGHT_COMPACT_PX,
  HEADER_HEIGHT_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "./card_metrics";

/** Holds a width and height in design units. */
export interface Size {
  width: number;
  height: number;
}

/** Places one pile in the table's grid. */
export interface SlotPlacement {
  /** The pile this slot belongs to. */
  readonly pileId: string;
  /** Zero-based column, counting from the left. */
  readonly column: number;
  /** Zero-based row, counting from the top. */
  readonly row: number;
}

/** Describes a board as a grid of card-sized slots for a game's piles. */
export interface TableLayoutSpec {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** Where each pile sits. Piles absent from this list are not drawn. */
  readonly slots: readonly SlotPlacement[];
  /** The size of one grid cell, in design units. */
  readonly cardSize: Size;
  /** Space between adjacent columns and rows, in design units. */
  readonly gap: Point;
  /** Space at the edges of the board, in design units. */
  readonly padding: Point;
  /**
   * Height of the header overlaying the top of the canvas, which the board lays
   * itself out below, in CSS pixels.
   */
  readonly headerHeightPx: number;

  /**
   * The design height the board reserves, overriding the height its grid alone
   * would need.
   *
   * A game whose columns fan sets this, or the board scales up until a long
   * column runs off the bottom of the screen.
   */
  readonly designHeightPx?: number;
}

/** Describes what distinguishes one board's grid from another's. */
export interface TableGridSpec {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** Where each pile sits. Piles absent from this list are not drawn. */
  readonly slots: readonly SlotPlacement[];
  /** The design height the board reserves; see {@link TableLayoutSpec}. */
  readonly designHeightPx?: number;
}

/** Completes a board's grid with the measurements every board shares. */
export function tableLayout(grid: TableGridSpec): TableLayoutSpec {
  return {
    columns: grid.columns,
    rows: grid.rows,
    slots: grid.slots,
    cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
    gap: { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
    padding: { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
    headerHeightPx: HEADER_HEIGHT_PX,
    designHeightPx: grid.designHeightPx,
  };
}

/** Returns the size the board occupies at scale 1, header included. */
export function designSize(spec: TableLayoutSpec): Size {
  const width =
    spec.columns * spec.cardSize.width +
    Math.max(0, spec.columns - 1) * spec.gap.x +
    2 * spec.padding.x;
  const gridHeight =
    spec.headerHeightPx +
    spec.rows * spec.cardSize.height +
    Math.max(0, spec.rows - 1) * spec.gap.y +
    2 * spec.padding.y;
  return { width, height: spec.designHeightPx ?? gridHeight };
}

/**
 * Computes the scale, from design units to device pixels, that fits the board
 * below the header.
 *
 * It is capped at the pixel ratio rather than at 1, so a high density display
 * draws a design unit with more than one device pixel.
 */
export function computeScale(
  spec: TableLayoutSpec,
  viewport: Viewport,
): number {
  const design = designSize(spec);
  const pixelRatio = viewport.pixelRatio;
  const screenWidth = viewport.width || design.width * pixelRatio;
  const screenHeight =
    (viewport.height || design.height * pixelRatio) -
    spec.headerHeightPx * pixelRatio;

  const scaleX = screenWidth / design.width;
  const scaleY = screenHeight / (design.height - spec.headerHeightPx);
  let scale = Math.min(scaleX, scaleY);
  if (scale > pixelRatio) scale = pixelRatio;
  if (scale <= 0) scale = pixelRatio;
  return scale;
}

/**
 * The widest screen, in CSS pixels, on which a board tightens its gaps to give
 * its cards more room.
 *
 * Mirrors the `tablet` breakpoint in `src/ui/app/styles/_breakpoints.scss`.
 */
export const COMPACT_MAX_WIDTH_CSS_PX = 720;

/** Space between piles on a small screen, in design units. */
const COMPACT_GAP = { x: 8, y: 14 };

/** Space at the edges of the board on a small screen, in design units. */
const COMPACT_PADDING = { x: 8, y: 14 };

/**
 * Returns the board with its gaps, padding and header tightened for a small
 * screen, or unchanged on a larger one.
 */
export function compactFor(
  spec: TableLayoutSpec,
  viewport: Viewport,
): TableLayoutSpec {
  const cssWidth = viewport.width / (viewport.pixelRatio || 1);
  if (cssWidth === 0 || cssWidth > COMPACT_MAX_WIDTH_CSS_PX) {
    return spec;
  }
  // Never loosen a board that is already tighter than this.
  return {
    ...spec,
    gap: {
      x: Math.min(spec.gap.x, COMPACT_GAP.x),
      y: Math.min(spec.gap.y, COMPACT_GAP.y),
    },
    padding: {
      x: Math.min(spec.padding.x, COMPACT_PADDING.x),
      y: Math.min(spec.padding.y, COMPACT_PADDING.y),
    },
    headerHeightPx: Math.min(spec.headerHeightPx, HEADER_HEIGHT_COMPACT_PX),
  };
}

/** Holds everything the view needs to place a board for one frame. */
export interface TableMetrics {
  /** The board this measures. */
  readonly layout: TableLayoutSpec;
  /** Design units to screen pixels. */
  readonly scale: number;
  /** Where each pile's top-left corner sits, in screen pixels. */
  readonly origins: ReadonlyMap<string, Point>;
}

/** Measures a board for a viewport, compacting it first on a small screen. */
export function measureTable(
  rawLayout: TableLayoutSpec,
  viewport: Viewport,
): TableMetrics {
  const layout = compactFor(rawLayout, viewport);
  const scale = computeScale(layout, viewport);
  return {
    layout,
    scale,
    origins: computePileOrigins(layout, viewport, scale),
  };
}

/**
 * Computes the top-left screen origin of every pile the layout places,
 * centring the board horizontally when there is room.
 *
 * @param scale The scale factor from {@link computeScale}.
 */
export function computePileOrigins(
  spec: TableLayoutSpec,
  viewport: Viewport,
  scale: number,
): Map<string, Point> {
  const cardWidth = spec.cardSize.width * scale;
  const cardHeight = spec.cardSize.height * scale;
  const gapX = spec.gap.x * scale;
  const gapY = spec.gap.y * scale;

  const totalLayoutWidth =
    spec.columns * cardWidth + Math.max(0, spec.columns - 1) * gapX;
  const screenWidth = viewport.width || designSize(spec).width;
  const paddingX = Math.max(
    spec.padding.x * scale,
    (screenWidth - totalLayoutWidth) / 2,
  );
  const paddingY = spec.padding.y * scale;

  // The header is a DOM overlay measured in CSS pixels, so it converts to
  // device pixels by the pixel ratio rather than by the layout scale.
  const headerHeight = spec.headerHeightPx * viewport.pixelRatio;

  const origins = new Map<string, Point>();
  for (const slot of spec.slots) {
    origins.set(slot.pileId, {
      x: paddingX + slot.column * (cardWidth + gapX),
      y: headerHeight + paddingY + slot.row * (cardHeight + gapY),
    });
  }
  return origins;
}
