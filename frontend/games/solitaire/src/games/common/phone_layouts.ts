import { itemAt } from "@/engine/core/common/item_at";
import { PhoneLayouts } from "@/engine/render/layout/board_layouts";
import {
  CARD_HEIGHT_PX,
  CARD_RENDER_HEIGHT_PX,
} from "@/engine/render/layout/card_metrics";
import {
  PileLayoutOverride,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import {
  PileBackgroundOverride,
  SlotPlacement,
  TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { PHONE_FAN_FIT, TABLEAU_HOVER_EXPANSION_OFFSET } from "./pile_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "./zone_presets";

/**
 * Builds the grids a game's board lies on on a phone from a short account of
 * the board: its columns, the row of piles beside them, and what goes on each
 * rail when the phone is on its side.
 */

/** Places a pile in the row beside the columns, as on a larger screen. */
export interface RowPile {
  /** The pile. */
  readonly pileId: string;
  /** The grid column it sits in on a larger screen, counting from the left. */
  readonly column: number;
}

/** Places a pile on a rail down the side of a phone on its side. */
export interface RailPile {
  /** The pile. */
  readonly pileId: string;
  /**
   * How far below its top the pile's cards may reach, in design units; one
   * card when omitted. A pile that spreads down the rail reaches further.
   */
  readonly reach?: number;
  /** Whether the pile's sideways spread runs down the rail instead. */
  readonly spreadsDown?: boolean;
  /**
   * Whether the pile below may cover all but this pile's index strip when the
   * rail is short of room, as it may a foundation's. A foundation's ring then
   * moves to the top edge, the part of it that shows.
   */
  readonly overlapped?: boolean;
}

/** Describes a board in the terms its phone grids are built from. */
export interface PhoneBoard {
  /** The columns, left to right: the piles that fan down and take the height. */
  readonly columns: readonly string[];
  /** The other piles, in the row above the columns on a larger screen. */
  readonly row: readonly RowPile[];
  /**
   * Which of the row's piles stack down each rail on a phone on its side, top
   * first. Every pile in the row goes on exactly one.
   */
  readonly rails: {
    readonly left: readonly RailPile[];
    readonly right: readonly RailPile[];
  };
  /**
   * The longest column the grids keep on screen with every fan at its floor:
   * how many hidden cards, and how many face-up cards on them.
   */
  readonly longestColumn: {
    readonly faceDown: number;
    readonly faceUp: number;
  };
  /** How particular piles arrange their cards on every phone grid, by pile id. */
  readonly pileLayouts?: Readonly<Record<string, PileLayoutOverride>>;
}

/**
 * Returns the piles a larger screen's grid puts in one row, left to right,
 * with the column each sits in: the row of a {@link PhoneBoard}, read off the
 * zones so a pile is placed in one place only.
 */
export function pilesInRow(zones: readonly ZoneSpec[], row: number): RowPile[] {
  return zones
    .filter((zone) => zone.slot.row === row)
    .map((zone) => ({ pileId: zone.id, column: zone.slot.column }))
    .sort((a, b) => a.column - b.column);
}

/** Returns the ids of the piles in one row of a grid, left to right. */
export function pileIdsInRow(
  zones: readonly ZoneSpec[],
  row: number,
): string[] {
  return pilesInRow(zones, row).map((pile) => pile.pileId);
}

/** Space between a phone grid's columns and rows, in design units. */
const PHONE_GAP = { x: 4, y: 10 };

/** Space at a phone grid's edges, in design units. */
const PHONE_PADDING = { x: 6, y: 8 };

/**
 * The least of a pile that shows when the pile below it on a rail overlaps
 * it, in design units: enough for the mobile deck's index.
 */
export const RAIL_MIN_STEP = 50;

/**
 * Returns the grids a board lies on on a phone: upright with its row of piles
 * above the columns or along the bottom, and on its side with them on rails.
 *
 * @throws Error when a pile in the row is on no rail, or on both.
 */
export function phoneLayouts(board: PhoneBoard): PhoneLayouts {
  checkRails(board);
  const columns = Math.max(
    board.columns.length,
    ...board.row.map((pile) => pile.column + 1),
  );
  const columnHeight = longestColumnHeight(board);
  return {
    portrait: {
      top: pilesAbove(board, columns, columnHeight),
      bottom: pilesBelow(board, columns, columnHeight),
    },
    landscape: pilesBeside(board, columnHeight),
    columns: board.columns,
  };
}

/**
 * Returns the larger screen's grid with phone gaps: the row of piles along the
 * top and the columns under it.
 */
function pilesAbove(
  board: PhoneBoard,
  columns: number,
  columnHeight: number,
): TableLayoutSpec {
  const columnRow = board.row.length > 0 ? 1 : 0;
  return phoneGrid({
    columns,
    rows: columnRow + 1,
    slots: [
      ...board.row.map(({ pileId, column }) => ({ pileId, column, row: 0 })),
      ...columnSlots(board, 0, columnRow),
    ],
    innerHeight: columnRow * (CARD_HEIGHT_PX + PHONE_GAP.y) + columnHeight,
    pileLayouts: board.pileLayouts,
  });
}

/**
 * Returns a grid with the columns along the top and the row of piles, mirrored,
 * along the bottom edge, where whatever sat at the left on a larger screen
 * comes under a right thumb.
 */
function pilesBelow(
  board: PhoneBoard,
  columns: number,
  columnHeight: number,
): TableLayoutSpec {
  const hasRow = board.row.length > 0;
  const mirrored = new Set(board.row.map((pile) => pile.pileId));
  return phoneGrid({
    columns,
    rows: hasRow ? 2 : 1,
    slots: [
      ...columnSlots(board, 0, 0),
      ...board.row.map(({ pileId, column }): SlotPlacement => ({
        pileId,
        column: columns - 1 - column,
        row: 0,
        anchor: "bottom",
      })),
    ],
    innerHeight: columnHeight + (hasRow ? PHONE_GAP.y + CARD_HEIGHT_PX : 0),
    pileLayouts: withOverrides(board.pileLayouts, mirrored, mirrorPileLayout),
  });
}

/**
 * Returns a grid with the columns between two rails, starting at the top, and
 * the row's piles stacked down the rails.
 */
function pilesBeside(board: PhoneBoard, columnHeight: number): TableLayoutSpec {
  const { left, right } = board.rails;
  const first = left.length > 0 ? 1 : 0;
  const columns = board.columns.length + first + (right.length > 0 ? 1 : 0);
  const innerHeight = Math.max(
    columnHeight,
    railHeight(left),
    railHeight(right),
  );
  const downward = new Set(
    [...left, ...right]
      .filter((pile) => pile.spreadsDown)
      .map((pile) => pile.pileId),
  );
  const leftSlots = railSlots(left, 0, innerHeight);
  const rightSlots = railSlots(right, columns - 1, innerHeight);
  return phoneGrid({
    columns,
    rows: 1,
    slots: [...leftSlots, ...columnSlots(board, first, 0), ...rightSlots],
    innerHeight,
    pileLayouts: withOverrides(board.pileLayouts, downward, (own) =>
      own.kind === "spread" ? { ...own, direction: "down" } : own,
    ),
    pileBackgrounds: {
      ...railBackgrounds(left, leftSlots),
      ...railBackgrounds(right, rightSlots),
    },
  });
}

/** Describes a phone grid by the height inside its padding. */
interface PhoneGridSpec {
  readonly columns: number;
  readonly rows: number;
  readonly slots: readonly SlotPlacement[];
  /** The height the grid keeps on screen inside its padding, in design units. */
  readonly innerHeight: number;
  readonly pileLayouts?: Readonly<Record<string, PileLayoutOverride>>;
  readonly pileBackgrounds?: Readonly<Record<string, PileBackgroundOverride>>;
}

/** Completes a phone grid with the gaps, padding and fans every one shares. */
function phoneGrid(grid: PhoneGridSpec): TableLayoutSpec {
  return tableLayout({
    columns: grid.columns,
    rows: grid.rows,
    slots: grid.slots,
    gap: PHONE_GAP,
    padding: PHONE_PADDING,
    designHeightPx: grid.innerHeight + 2 * PHONE_PADDING.y,
    fanFit: PHONE_FAN_FIT,
    pileLayouts: grid.pileLayouts,
    pileBackgrounds: grid.pileBackgrounds,
  });
}

/** Places the columns side by side from `first`, in one grid row. */
function columnSlots(
  board: PhoneBoard,
  first: number,
  row: number,
): SlotPlacement[] {
  return board.columns.map((pileId, index) => ({
    pileId,
    column: first + index,
    row,
  }));
}

/** Returns how tall the longest column stands with every fan at its floor. */
function longestColumnHeight(board: PhoneBoard): number {
  const { faceDown, faceUp } = board.longestColumn;
  return (
    CARD_HEIGHT_PX +
    faceDown * PHONE_FAN_FIT.minFaceDownGap +
    Math.max(0, faceUp - 1) * PHONE_FAN_FIT.minFaceUpGap +
    TABLEAU_HOVER_EXPANSION_OFFSET
  );
}

/** Returns how far below its top a rail pile's cards may reach. */
function reachOf(pile: RailPile): number {
  return pile.reach ?? CARD_HEIGHT_PX;
}

/** Returns the least height a rail needs, its overlapped piles at the floor. */
function railHeight(rail: readonly RailPile[]): number {
  return rail.reduce(
    (height, pile, index) =>
      height +
      (index === rail.length - 1
        ? reachOf(pile)
        : pile.overlapped
          ? RAIL_MIN_STEP
          : reachOf(pile) + PHONE_GAP.y),
    0,
  );
}

/**
 * Places a rail's piles down a grid column, each below the last, overlapping
 * the piles that allow it evenly when the rail would not otherwise fit.
 */
function railSlots(
  rail: readonly RailPile[],
  column: number,
  innerHeight: number,
): SlotPlacement[] {
  const above = rail.slice(0, -1);
  const fixed = above
    .filter((pile) => !pile.overlapped)
    .reduce((height, pile) => height + reachOf(pile) + PHONE_GAP.y, 0);
  const overlapped = above.filter((pile) => pile.overlapped).length;
  const last = rail.at(-1);
  const spare = innerHeight - fixed - (last ? reachOf(last) : 0);
  const overlapStep =
    overlapped > 0 ? Math.max(RAIL_MIN_STEP, spare / overlapped) : 0;

  let y = 0;
  return rail.map((pile) => {
    const slot: SlotPlacement = {
      pileId: pile.pileId,
      column,
      row: 0,
      offset: { x: 0, y },
    };
    const full = reachOf(pile) + PHONE_GAP.y;
    y += pile.overlapped ? Math.min(full, overlapStep) : full;
    return slot;
  });
}

/**
 * Returns the placeholders a rail's overlapped piles show instead of a
 * foundation's centred ring, which would run across the piles below: the ring
 * at the top edge, and the outline open at the bottom when the next pile
 * starts within the card, so that pile's top edge closes it.
 */
function railBackgrounds(
  rail: readonly RailPile[],
  slots: readonly SlotPlacement[],
): Record<string, PileBackgroundOverride> {
  const backgrounds: Record<string, PileBackgroundOverride> = {};
  for (const [index, slot] of slots.entries()) {
    if (!itemAt(rail, index).overlapped) continue;
    const next = slots[index + 1];
    const covered =
      next !== undefined && topOf(next) - topOf(slot) < CARD_RENDER_HEIGHT_PX;
    backgrounds[slot.pileId] = foundationAs(
      covered ? COVERED_FOUNDATION_PLACEHOLDER : RAIL_FOUNDATION_PLACEHOLDER,
    );
  }
  return backgrounds;
}

/** Returns how far down its rail a slot starts, in design units. */
function topOf(slot: SlotPlacement): number {
  return slot.offset?.y ?? 0;
}

/** Returns an override that draws a foundation's ring as `artwork`. */
function foundationAs(artwork: string): PileBackgroundOverride {
  return (own) => (own === FOUNDATION_PLACEHOLDER ? artwork : own);
}

/**
 * Returns the board's own overrides with `extra` applied after them to the
 * named piles.
 */
function withOverrides(
  own: Readonly<Record<string, PileLayoutOverride>> | undefined,
  piles: ReadonlySet<string>,
  extra: PileLayoutOverride,
): Readonly<Record<string, PileLayoutOverride>> {
  const overrides: Record<string, PileLayoutOverride> = { ...own };
  for (const pileId of piles) {
    const first = own?.[pileId];
    overrides[pileId] = (layout) => extra(first ? first(layout) : layout);
  }
  return overrides;
}

/** Throws unless every pile in the row is on exactly one rail. */
function checkRails(board: PhoneBoard): void {
  const onRails = [...board.rails.left, ...board.rails.right].map(
    (pile) => pile.pileId,
  );
  const inRow = board.row.map((pile) => pile.pileId);
  const misplaced = inRow.filter(
    (pileId) => onRails.filter((railed) => railed === pileId).length !== 1,
  );
  const strays = onRails.filter((pileId) => !inRow.includes(pileId));
  if (misplaced.length > 0 || strays.length > 0) {
    throw new Error(
      `Every pile in the row goes on exactly one rail: ${[...misplaced, ...strays].join(", ")}`,
    );
  }
}
