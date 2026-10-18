import {
  TableLayoutSpec,
  designSize,
} from "@/engine/render/layout/table_layout";

/** Places one placeholder of the loading skeleton, as CSS percentages. */
export interface SkeletonSlot {
  /** The pile the placeholder stands in for. */
  readonly pileId: string;
  /** The left edge of its grid cell, as a share of the board's width. */
  readonly left: string;
  /** The top edge of its grid cell, as a share of the board's height. */
  readonly top: string;
  /** One grid cell's width, as a share of the board's width. */
  readonly width: string;
  /** One grid cell's height, as a share of the board's height. */
  readonly height: string;
}

/**
 * Returns where the loading skeleton draws each pile of a board.
 *
 * Positioned rather than laid out on a CSS grid, because a slot may sit at a
 * fractional column or row, as a pyramid's half-offset rows do, and a grid
 * line cannot be fractional. A board taller than its grid, for its columns to
 * fan into, counts the extra height as rows, and a row anchored to the bottom
 * is counted up from the last, so it sits on the board's bottom edge.
 */
export function skeletonSlots(layout: TableLayoutSpec): SkeletonSlot[] {
  const share = (value: number, of: number) => `${(value / of) * 100}%`;
  const { cardSize, gap, padding } = layout;
  const rowHeight = cardSize.height + gap.y;
  const rows = Math.max(
    layout.rows,
    (designSize(layout).height - 2 * padding.y + gap.y) / rowHeight,
  );
  return layout.slots.map((slot) => {
    // An offset is in design units; the skeleton counts in grid cells.
    const offsetColumns = (slot.offset?.x ?? 0) / (cardSize.width + gap.x);
    const offsetRows = (slot.offset?.y ?? 0) / rowHeight;
    const row = slot.anchor === "bottom" ? rows - 1 - slot.row : slot.row;
    return {
      pileId: slot.pileId,
      left: share(slot.column + offsetColumns, layout.columns),
      top: share(row + offsetRows, rows),
      width: share(1, layout.columns),
      height: share(1, rows),
    };
  });
}
