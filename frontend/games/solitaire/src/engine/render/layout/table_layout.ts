import { Point } from "@/engine/core/common/point";
import { Insets, NO_INSETS, Viewport } from "../view/table_view_state";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "./card_metrics";
import type { FanFit, PileLayoutOverride } from "./pile_layout";
import { formFactorOf } from "./form_factor";

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
  /** Zero-based row, counting from the edge the slot is anchored to. */
  readonly row: number;
  /**
   * The edge the row counts from: the top by default, or the bottom, where row
   * 0 sits on the board's bottom edge however tall the screen is.
   */
  readonly anchor?: "top" | "bottom";
  /**
   * How far the pile sits from its grid cell, in design units, for piles that
   * overlap their neighbours down a rail or along a row.
   */
  readonly offset?: Point;
}

/** Describes a board as a grid of card-sized slots for a game's piles. */
export interface TableLayoutSpec {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** Where each pile sits; piles absent from this list are not drawn. */
  readonly slots: readonly SlotPlacement[];
  /** The size of one grid cell, in design units. */
  readonly cardSize: Size;
  /** Space between adjacent columns and rows, in design units. */
  readonly gap: Point;
  /** Space at the edges of the board, in design units. */
  readonly padding: Point;

  /**
   * The design height the board reserves, overriding the height its grid alone
   * would need. It is the board's own height, measured below anything laid
   * over the top of the canvas.
   *
   * A game whose columns fan sets this, or the board scales up until a long
   * column runs off the bottom of the screen.
   */
  readonly designHeightPx?: number;

  /**
   * How far each downward fan may open or close to fit the room below its
   * pile; fans keep their own gaps when omitted.
   */
  readonly fanFit?: FanFit;

  /**
   * How particular piles arrange their cards on this grid, keyed by pile id,
   * each worked out from the arrangement its zone would otherwise use.
   */
  readonly pileLayouts?: Readonly<Record<string, PileLayoutOverride>>;

  /**
   * Whether this grid is another's mirror image, which turns every sideways
   * spread around.
   */
  readonly mirrored?: boolean;
}

/** Describes what distinguishes one board's grid from another's. */
export interface TableGridSpec {
  /** How many card-widths across the grid is. */
  readonly columns: number;
  /** How many card-heights down the grid is. */
  readonly rows: number;
  /** Where each pile sits; piles absent from this list are not drawn. */
  readonly slots: readonly SlotPlacement[];
  /** The design height the board reserves; see {@link TableLayoutSpec}. */
  readonly designHeightPx?: number;
  /** Space between columns and rows, if not the gap every board shares. */
  readonly gap?: Point;
  /** Space at the board's edges, if not the padding every board shares. */
  readonly padding?: Point;
  /** How fans fit their room; see {@link TableLayoutSpec}. */
  readonly fanFit?: FanFit;
  /** How particular piles arrange their cards; see {@link TableLayoutSpec}. */
  readonly pileLayouts?: Readonly<Record<string, PileLayoutOverride>>;
}

/** Completes a board's grid with the measurements every board shares. */
export function tableLayout(grid: TableGridSpec): TableLayoutSpec {
  return {
    columns: grid.columns,
    rows: grid.rows,
    slots: grid.slots,
    cardSize: { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
    gap: grid.gap ?? { x: LAYOUT_GAP_X, y: LAYOUT_GAP_Y },
    padding: grid.padding ?? { x: LAYOUT_PADDING_X, y: LAYOUT_PADDING_Y },
    designHeightPx: grid.designHeightPx,
    fanFit: grid.fanFit,
    pileLayouts: grid.pileLayouts,
  };
}

/** Returns the size the board occupies at scale 1. */
export function designSize(spec: TableLayoutSpec): Size {
  const width =
    spec.columns * spec.cardSize.width +
    Math.max(0, spec.columns - 1) * spec.gap.x +
    2 * spec.padding.x;
  const gridHeight =
    spec.rows * spec.cardSize.height +
    Math.max(0, spec.rows - 1) * spec.gap.y +
    2 * spec.padding.y;
  return { width, height: spec.designHeightPx ?? gridHeight };
}

/**
 * Computes the scale, from design units to device pixels, that fits the board
 * inside the viewport's insets.
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
  const insets = insetsPx(viewport);
  const screenWidth = viewport.width
    ? viewport.width - insets.left - insets.right
    : design.width * pixelRatio;
  const screenHeight = viewport.height
    ? viewport.height - insets.top - insets.bottom
    : design.height * pixelRatio;

  const scaleX = screenWidth / design.width;
  const scaleY = screenHeight / design.height;
  let scale = Math.min(scaleX, scaleY);
  if (scale > pixelRatio) scale = pixelRatio;
  if (scale <= 0) scale = pixelRatio;
  return scale;
}

/** Space between piles on a small screen, in design units. */
const COMPACT_GAP = { x: 8, y: 14 };

/** Space at the edges of the board on a small screen, in design units. */
const COMPACT_PADDING = { x: 8, y: 14 };

/**
 * Returns the board with its gaps and padding tightened for a compact screen,
 * a phone upright or on its side, or unchanged on a roomy one.
 */
export function compactFor(
  spec: TableLayoutSpec,
  viewport: Viewport,
): TableLayoutSpec {
  if (formFactorOf(viewport) === "roomy") return spec;
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
  /**
   * How far each pile's cards may reach below its origin, in design units,
   * before they meet the board's bottom edge or the pile below.
   */
  readonly rooms: ReadonlyMap<string, number>;
}

/** Measures a board for a viewport, compacting it first on a small screen. */
export function measureTable(
  rawLayout: TableLayoutSpec,
  viewport: Viewport,
): TableMetrics {
  const layout = compactFor(rawLayout, viewport);
  const scale = computeScale(layout, viewport);
  const origins = computePileOrigins(layout, viewport, scale);
  return {
    layout,
    scale,
    origins,
    rooms: computePileRooms(layout, viewport, scale, origins),
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

  const insets = insetsPx(viewport);
  const totalLayoutWidth =
    spec.columns * cardWidth + Math.max(0, spec.columns - 1) * gapX;
  const screenWidth = viewport.width
    ? viewport.width - insets.left - insets.right
    : designSize(spec).width;
  const paddingX = Math.max(
    spec.padding.x * scale,
    (screenWidth - totalLayoutWidth) / 2,
  );
  const paddingY = spec.padding.y * scale;
  const bottom = boardBottomPx(spec, viewport, scale);

  const origins = new Map<string, Point>();
  for (const slot of spec.slots) {
    const rowOffset = slot.row * (cardHeight + gapY);
    origins.set(slot.pileId, {
      x:
        insets.left +
        paddingX +
        slot.column * (cardWidth + gapX) +
        (slot.offset?.x ?? 0) * scale,
      y:
        (slot.anchor === "bottom"
          ? bottom - paddingY - cardHeight - rowOffset
          : insets.top + paddingY + rowOffset) +
        (slot.offset?.y ?? 0) * scale,
    });
  }
  return origins;
}

/**
 * Computes how far each pile's cards may reach below its origin, in design
 * units: to the board's bottom edge, less its padding, or to a gap above the
 * nearest pile below it.
 *
 * A pile below counts if it shares the column, or if it is anchored to the
 * bottom edge, since a pile there may spread beyond its own column.
 *
 * @param origins The origins from {@link computePileOrigins}.
 */
export function computePileRooms(
  spec: TableLayoutSpec,
  viewport: Viewport,
  scale: number,
  origins: ReadonlyMap<string, Point>,
): Map<string, number> {
  const cardWidth = spec.cardSize.width * scale;
  const floor = boardBottomPx(spec, viewport, scale) - spec.padding.y * scale;

  const rooms = new Map<string, number>();
  for (const slot of spec.slots) {
    const origin = origins.get(slot.pileId);
    if (!origin) continue;

    let limit = floor;
    for (const other of spec.slots) {
      const below = origins.get(other.pileId);
      if (!below || other === slot || below.y <= origin.y) continue;
      const shares =
        other.anchor === "bottom" || Math.abs(below.x - origin.x) < cardWidth;
      if (shares) limit = Math.min(limit, below.y - spec.gap.y * scale);
    }
    rooms.set(slot.pileId, Math.max(0, (limit - origin.y) / scale));
  }
  return rooms;
}

/**
 * Returns where the board's bottom edge is, in device pixels: above the bottom
 * inset, or the board's design height below the top inset before the canvas
 * has been measured.
 */
function boardBottomPx(
  spec: TableLayoutSpec,
  viewport: Viewport,
  scale: number,
): number {
  const insets = insetsPx(viewport);
  return viewport.height
    ? viewport.height - insets.bottom
    : insets.top + designSize(spec).height * scale;
}

/**
 * Returns the viewport's insets in device pixels.
 *
 * Converted by the pixel ratio rather than by the layout scale, because they
 * are a measurement of the DOM laid over the canvas, not of the board.
 */
function insetsPx(viewport: Viewport): Insets {
  const insets = viewport.insets ?? NO_INSETS;
  const ratio = viewport.pixelRatio;
  return {
    top: insets.top * ratio,
    right: insets.right * ratio,
    bottom: insets.bottom * ratio,
    left: insets.left * ratio,
  };
}
