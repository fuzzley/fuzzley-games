import { Point, Size } from "./geometry";

import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "./card_metrics";
import type { FanFit, PileLayoutOverride } from "./pile_layout";

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

/**
 * Returns the artwork a pile's placeholder shows on a grid, given the artwork
 * its game asks for.
 */
export type PileBackgroundOverride = (artwork: string) => string;

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
   * Which artwork particular piles' placeholders show on this grid, keyed by
   * pile id, each worked out from the artwork the game asks for.
   */
  readonly pileBackgrounds?: Readonly<Record<string, PileBackgroundOverride>>;

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
  /** Which artwork particular piles' placeholders show; see {@link TableLayoutSpec}. */
  readonly pileBackgrounds?: Readonly<Record<string, PileBackgroundOverride>>;
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
    pileBackgrounds: grid.pileBackgrounds,
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
