import { Point } from "@/engine/core/common/point";
import { Viewport } from "../view/table_view_state";

/** A width and height in design units. */
export interface Size {
  width: number;
  height: number;
}

/** Where one pile sits in the table's grid. */
export interface SlotPlacement {
  /** The pile this slot belongs to. */
  readonly pileId: string;
  /** Zero-based column, counting from the left. */
  readonly column: number;
  /** Zero-based row, counting from the top. */
  readonly row: number;
}

/**
 * Where a game's piles sit, as a grid of card-sized slots.
 *
 * The whole board as data, so a game declares its shape instead of a layout
 * function hardcoding one: Klondike is 7 columns by 2 rows with a gap where the
 * waste fan needs room, FreeCell is 8 by 2 with free cells and foundations
 * sharing the top row, Spider is 10 by 2. Everything downstream — the design
 * size, the scale, the pile origins, the drop rectangles — is derived from
 * this, so a game with more columns simply gets a wider board.
 */
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
   * Height of the UI header overlaying the top of the canvas, in CSS pixels.
   * The board lays itself out below it.
   */
  readonly headerHeightPx: number;

  /**
   * The design height the board reserves, overriding the height its grid alone
   * would need.
   *
   * A fanned column reaches well past the slot it starts in — a Klondike
   * tableau runs about a card and a half below its row — and a board sized to
   * its bare grid would scale itself up until that column ran off the bottom of
   * the screen. How much room to leave is a judgement about how long a column
   * gets in practice rather than something arithmetic can answer, so a game
   * that fans states it.
   *
   * Width needs no such override: nothing fans sideways past the grid, so the
   * columns account for themselves and a game with more of them simply gets a
   * wider board.
   */
  readonly designHeightPx?: number;
}

/**
 * The size the board would occupy at scale 1, header included.
 *
 * Derived from the grid rather than fixed, which is what lets a game choose its
 * own column count: an 8-column board is wider than a 7-column one by exactly
 * one card and one gap, and its scale falls out of that without anyone
 * restating a design width.
 *
 * @param spec The board's grid.
 */
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
 * Computes the uniform scale factor that fits the board onto the viewport,
 * accounting for the header overlay.
 *
 * The result maps design units to device pixels, so it is capped at the
 * viewport's pixel ratio rather than at 1.0: on a 2x display a design unit is
 * worth two device pixels, and rendering it as one would waste half the
 * display's resolution.
 *
 * @param spec The board's grid.
 * @param viewport The available drawable area.
 * @returns The scale factor in the range (0, viewport.pixelRatio].
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
 * Below this CSS width a board tightens its gaps to buy card size.
 *
 * The same figure the application uses to decide the game rail should stop
 * taking a column's worth of screen: at that size every design unit spent on
 * the space between piles is one not spent on the cards themselves.
 */
export const COMPACT_MAX_WIDTH_CSS_PX = 720;

/** Space between piles on a small screen, in design units. */
const COMPACT_GAP = { x: 8, y: 14 };

/** Space at the edges of the board on a small screen, in design units. */
const COMPACT_PADDING = { x: 8, y: 14 };

/**
 * The board tightened for a small screen, or the board unchanged.
 *
 * A phone holding a ten-column Spider board spends about a tenth of its width
 * on gaps authored for a desktop. Reclaiming it makes the cards about a tenth
 * larger, which is worth having even though it does not make a ten-column game
 * roomy on a phone — nothing short of turning it sideways does that.
 *
 * @param spec The board's grid.
 * @param viewport The available drawable area.
 */
export function compactFor(
  spec: TableLayoutSpec,
  viewport: Viewport,
): TableLayoutSpec {
  const cssWidth = viewport.width / (viewport.pixelRatio || 1);
  if (cssWidth === 0 || cssWidth > COMPACT_MAX_WIDTH_CSS_PX) {
    return spec;
  }
  // Tighten, never loosen: a board already drawn closer together than this
  // asked for that, and a small screen is no reason to spread it out.
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
  };
}

/**
 * Everything the view needs to place a board for one frame.
 *
 * Measured once and handed to whoever needs it, so the scale and the origins
 * are derived in one place rather than recomputed by the view builder, the drop
 * resolver and the hit test independently — three answers that have to agree.
 */
export interface TableMetrics {
  /** The board this measures. */
  readonly layout: TableLayoutSpec;
  /** Design units to screen pixels. */
  readonly scale: number;
  /** Where each pile's top-left corner sits, in screen pixels. */
  readonly origins: ReadonlyMap<string, Point>;
}

/**
 * Measures a board for the given viewport.
 *
 * @param layout The board's grid.
 * @param viewport The available drawable area.
 */
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
 * Computes the absolute screen origin of every pile the layout places.
 *
 * The board is centred horizontally when the viewport is wider than it needs,
 * and falls back to its padding when narrower.
 *
 * @param spec The board's grid.
 * @param viewport The available drawable area.
 * @param scale The scale factor from {@link computeScale}.
 * @returns A map from pile id to its top-left origin, in screen pixels.
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
