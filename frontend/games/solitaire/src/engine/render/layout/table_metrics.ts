import { Point } from "./geometry";
import { Insets, NO_INSETS, Viewport } from "./viewport";
import { formFactorOf } from "./form_factor";
import { SlotPlacement, TableLayoutSpec, designSize } from "./table_layout";

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
 * A pile below counts if it shares the column, or if it is in a row anchored
 * to the bottom edge below the pile's own row, since a pile there may spread
 * beyond its own column. A pile anchored to the bottom in the pile's own row,
 * as on a rail beside the columns, counts only in its own column.
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
        (other.anchor === "bottom" &&
          rowFromTop(spec, other) > rowFromTop(spec, slot)) ||
        Math.abs(below.x - origin.x) < cardWidth;
      if (shares) limit = Math.min(limit, below.y - spec.gap.y * scale);
    }
    rooms.set(slot.pileId, Math.max(0, (limit - origin.y) / scale));
  }
  return rooms;
}

/** Returns which grid row a slot sits in, counting from the top. */
function rowFromTop(spec: TableLayoutSpec, slot: SlotPlacement): number {
  return slot.anchor === "bottom" ? spec.rows - 1 - slot.row : slot.row;
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
