import { itemAt } from "@/engine/core/common/item_at";
import {
  ArrangedLayouts,
  PilePosition,
} from "@/engine/render/layout/board_layouts";
import {
  CARD_HEIGHT_PX,
  CARD_RENDER_HEIGHT_PX,
} from "@/engine/render/layout/card_metrics";
import { FanFit, PileLayoutOverride } from "@/engine/render/layout/pile_layout";
import {
  PileBackgroundOverride,
  SlotPlacement,
  TableLayoutSpec,
  designSize,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import {
  PHONE_FAN_FIT,
  ROOMY_FAN_FIT,
  TABLEAU_HOVER_EXPANSION_OFFSET,
} from "./pile_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "./zone_presets";

/**
 * Builds the grids a game's board lies on in every arrangement from a short
 * account of the board: its columns, the row of piles beside them, and what
 * goes on each rail when a phone is on its side.
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
   * rail is short of room, as it may a foundation's, a cell's or a reserve's,
   * whose top card is all a player needs to read. A foundation's ring then
   * moves to the top edge, the part of it that shows.
   */
  readonly overlapped?: boolean;
}

/** Describes a board in the terms its arranged grids are built from. */
export interface ArrangedBoard {
  /**
   * The grid for a larger screen, with the row above the columns. The grid
   * with the row below them takes its gaps, padding and height.
   */
  readonly roomy: TableLayoutSpec;
  /**
   * The columns, left to right: the piles that fan down and take the height.
   * Every grid keeps them in this order, in the grid columns the larger
   * screen's grid gives them, or side by side between a sideways phone's
   * rails.
   */
  readonly columns: readonly string[];
  /**
   * Piles in the columns' row that are not columns, such as Canfield's
   * reserve: laid out with the columns, but mirrored on their own, so they
   * follow the side pile to the other side.
   */
  readonly beside?: readonly string[];
  /** The other piles, in the row above the columns on a larger screen. */
  readonly row: readonly RowPile[];
  /**
   * The row on an upright phone, in lines from the columns outward, each pile
   * in the grid column it takes there; the row as the larger screen has it,
   * in one line, when omitted. A board whose row is wider than its columns
   * gives it in two, so the upright grid is only as wide as it must be; the
   * columns then sit side by side from its left edge.
   */
  readonly uprightLines?: readonly (readonly RowPile[])[];
  /**
   * The pile in the row the side setting places, such as the stock; a board
   * without one is never mirrored, and the setting is not offered.
   */
  readonly side?: string;
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
  /**
   * The tallest the larger screen's grid with the row below the columns may
   * grow to keep the longest column clear of the row, in design units; as tall
   * as the column needs when omitted. A taller grid draws smaller cards, and
   * past the cap only the longest columns reach the row, at their floors.
   */
  readonly roomyBottomMaxHeightPx?: number;
  /** How particular piles arrange their cards on every phone grid, by pile id. */
  readonly pileLayouts?: Readonly<Record<string, PileLayoutOverride>>;
}

/**
 * Returns the piles a larger screen's grid puts in one row, left to right,
 * with the column each sits in: the row of an {@link ArrangedBoard}, read off
 * the zones so a pile is placed in one place only.
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
export const PHONE_GAP = { x: 4, y: 10 };

/** Space at a phone grid's edges, in design units. */
const PHONE_PADDING = { x: 6, y: 8 };

/**
 * The least of a pile that shows when the pile below it on a rail overlaps
 * it, in design units: enough for the mobile deck's index.
 */
export const RAIL_MIN_STEP = 50;

/**
 * Returns the grids a board lies on in every arrangement: with its row of piles
 * above the columns or along the bottom on a larger screen and on an upright
 * phone, and on rails hung from the top or stood on the bottom of a phone on
 * its side.
 *
 * Every grid keeps the row in the order a larger screen has it, and the rails
 * as declared; the chooser mirrors a grid that leaves the side pile on the
 * other side from the one the player asked for.
 *
 * @throws Error when a pile in the row is on no rail, or on both, or in
 *   none of the upright lines, or in more than one, when the side pile is not
 *   in the row, or when a column or a pile beside them is not on the larger
 *   screen's grid.
 */
export function arrangedLayouts(board: ArrangedBoard): ArrangedLayouts {
  checkRails(board);
  checkLines(board);
  checkSide(board);
  const columnHeight = longestColumnHeight(board, PHONE_FAN_FIT);
  return {
    roomy: { top: board.roomy, bottom: roomyPilesBelow(board) },
    portrait: {
      top: upright(board, columnHeight, "top"),
      bottom: upright(board, columnHeight, "bottom"),
    },
    landscape: {
      top: pilesBeside(board, columnHeight, "top"),
      bottom: pilesBeside(board, columnHeight, "bottom"),
    },
    columns: board.columns,
    side: board.side,
  };
}

/**
 * Returns the larger screen's grid with its rows the other way up: the columns
 * along the top, fanning to fit the room above the row of piles along the
 * bottom edge.
 *
 * It is taller than the grid with the piles above when the longest column
 * would not otherwise fit above them at its floors, since a column running
 * over the row would hide it, where above the row it only runs off the screen;
 * but no taller than the board's cap, which keeps its cards from shrinking
 * further for a column that is rarely dealt.
 */
function roomyPilesBelow(board: ArrangedBoard): TableLayoutSpec {
  const { roomy } = board;
  const needed =
    2 * roomy.padding.y +
    longestColumnHeight(board, ROOMY_FAN_FIT) +
    roomy.gap.y +
    CARD_HEIGHT_PX;
  return tableLayout({
    columns: roomy.columns,
    rows: 2,
    slots: [...columnSlotsAsRoomy(board, 0), ...rowAlongBottom(board)],
    gap: roomy.gap,
    padding: roomy.padding,
    designHeightPx: Math.max(
      designSize(roomy).height,
      Math.min(needed, board.roomyBottomMaxHeightPx ?? needed),
    ),
    fanFit: ROOMY_FAN_FIT,
    pileLayouts: roomy.pileLayouts,
    pileBackgrounds: roomy.pileBackgrounds,
  });
}

/**
 * Returns an upright phone's grid: the row of piles in its lines along the top
 * with the columns under them, or the columns along the top with the lines
 * along the bottom edge, the outermost line on the edge.
 */
function upright(
  board: ArrangedBoard,
  columnHeight: number,
  position: PilePosition,
): TableLayoutSpec {
  const lines = board.uprightLines ?? [board.row];
  const columnSlots = board.uprightLines
    ? columnRow(board).map((pileId, column) => ({ pileId, column, row: 0 }))
    : columnSlotsAsRoomy(board, 0);
  const width = board.uprightLines
    ? Math.max(
        columnSlots.length,
        ...lines.flat().map((pile) => Math.ceil(pile.column + 1)),
      )
    : board.roomy.columns;
  // Line k sits k lines out from the columns, counting from the edge it is
  // anchored to.
  const lineSlots = lines.flatMap((line, index) =>
    line.map(({ pileId, column }): SlotPlacement => ({
      pileId,
      column,
      row: lines.length - 1 - index,
      ...(position === "bottom" ? { anchor: "bottom" } : {}),
    })),
  );
  return phoneGrid({
    columns: width,
    rows: lines.length + 1,
    slots:
      position === "top"
        ? [
            ...lineSlots,
            ...columnSlots.map((slot) => ({ ...slot, row: lines.length })),
          ]
        : [...columnSlots, ...lineSlots],
    innerHeight: lines.length * (CARD_HEIGHT_PX + PHONE_GAP.y) + columnHeight,
    pileLayouts: board.pileLayouts,
  });
}

/** Places the row's piles along the bottom edge, each in its own column. */
function rowAlongBottom(board: ArrangedBoard): SlotPlacement[] {
  return board.row.map(({ pileId, column }) => ({
    pileId,
    column,
    row: 0,
    anchor: "bottom",
  }));
}

/**
 * Returns a grid with the columns between two rails, starting at the top, and
 * the row's piles stacked on the rails, hung from the top or stood on the
 * bottom edge.
 */
function pilesBeside(
  board: ArrangedBoard,
  columnHeight: number,
  position: PilePosition,
): TableLayoutSpec {
  const { left, right } = board.rails;
  const first = left.length > 0 ? 1 : 0;
  const between = columnRow(board);
  const columns = between.length + first + (right.length > 0 ? 1 : 0);
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
  const leftSlots = railSlots(left, 0, innerHeight, position);
  const rightSlots = railSlots(right, columns - 1, innerHeight, position);
  return phoneGrid({
    columns,
    rows: 1,
    slots: [
      ...leftSlots,
      ...between.map((pileId, index) => ({
        pileId,
        column: first + index,
        row: 0,
      })),
      ...rightSlots,
    ],
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

/** Describes a phone grid laid out by hand, for {@link phoneLayout}. */
export interface HandLaidPhoneGrid {
  readonly columns: number;
  readonly rows: number;
  readonly slots: readonly SlotPlacement[];
  /**
   * The height the grid keeps on screen inside its padding, in design units;
   * its rows' own height when omitted.
   */
  readonly innerHeight?: number;
}

/**
 * Returns a phone grid for a board laid out by hand rather than built from an
 * {@link ArrangedBoard}, as a board without columns to fan is, with the gaps,
 * padding and fans every phone grid shares.
 */
export function phoneLayout(grid: HandLaidPhoneGrid): TableLayoutSpec {
  return phoneGrid({
    ...grid,
    innerHeight:
      grid.innerHeight ??
      grid.rows * CARD_HEIGHT_PX + Math.max(0, grid.rows - 1) * PHONE_GAP.y,
  });
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

/**
 * Places the columns, and the piles beside them, in one grid row, each in the
 * grid column the larger screen's grid gives it.
 */
function columnSlotsAsRoomy(
  board: ArrangedBoard,
  row: number,
): SlotPlacement[] {
  return columnRow(board).map((pileId) => ({
    pileId,
    column: roomyColumnOf(board, pileId),
    row,
  }));
}

/**
 * Returns the columns and the piles beside them, left to right as the larger
 * screen's grid has them.
 */
function columnRow(board: ArrangedBoard): string[] {
  return [...board.columns, ...(board.beside ?? [])].sort(
    (a, b) => roomyColumnOf(board, a) - roomyColumnOf(board, b),
  );
}

/**
 * Returns the grid column the larger screen's grid puts a pile in.
 *
 * @throws Error when that grid does not place the pile.
 */
function roomyColumnOf(board: ArrangedBoard, pileId: string): number {
  const slot = board.roomy.slots.find((placed) => placed.pileId === pileId);
  if (!slot) {
    throw new Error(`The larger screen's grid does not place ${pileId}`);
  }
  return slot.column;
}

/** Returns how tall the longest column stands with every fan at its floor. */
function longestColumnHeight(board: ArrangedBoard, fit: FanFit): number {
  return fannedColumnHeight(board.longestColumn, fit);
}

/**
 * Returns how tall a column of hidden and face-up cards stands with every fan
 * at its floor, with room for a hovered card to open.
 */
export function fannedColumnHeight(
  column: { readonly faceDown: number; readonly faceUp: number },
  fit: FanFit,
): number {
  return (
    CARD_HEIGHT_PX +
    column.faceDown * fit.minFaceDownGap +
    Math.max(0, column.faceUp - 1) * fit.minFaceUpGap +
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
 * the piles that allow it evenly when the rail would not otherwise fit, and
 * stands the stack on the bottom edge when the piles go at the bottom.
 */
function railSlots(
  rail: readonly RailPile[],
  column: number,
  innerHeight: number,
  position: PilePosition,
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
  const tops = rail.map((pile) => {
    const top = y;
    const full = reachOf(pile) + PHONE_GAP.y;
    y += pile.overlapped ? Math.min(full, overlapStep) : full;
    return top;
  });
  if (position === "top") {
    return rail.map((pile, index) => ({
      pileId: pile.pileId,
      column,
      row: 0,
      offset: { x: 0, y: itemAt(tops, index) },
    }));
  }

  // A pile on the bottom edge is raised by the rest of the stack's height.
  const raise = last ? (tops.at(-1) ?? 0) + reachOf(last) - CARD_HEIGHT_PX : 0;
  return rail.map((pile, index) => ({
    pileId: pile.pileId,
    column,
    row: 0,
    anchor: "bottom",
    offset: { x: 0, y: itemAt(tops, index) - raise },
  }));
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
function checkRails(board: ArrangedBoard): void {
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

/** Throws unless every pile in the row is in exactly one upright line, if any. */
function checkLines(board: ArrangedBoard): void {
  if (!board.uprightLines) return;
  const inLines = board.uprightLines.flat().map((pile) => pile.pileId);
  const inRow = board.row.map((pile) => pile.pileId);
  const misplaced = inRow.filter(
    (pileId) => inLines.filter((lined) => lined === pileId).length !== 1,
  );
  const strays = inLines.filter((pileId) => !inRow.includes(pileId));
  if (misplaced.length > 0 || strays.length > 0) {
    throw new Error(
      `Every pile in the row goes in exactly one upright line: ${[...misplaced, ...strays].join(", ")}`,
    );
  }
}

/** Throws unless the side pile, if there is one, is a pile in the row. */
function checkSide(board: ArrangedBoard): void {
  const { side } = board;
  if (side !== undefined && !board.row.some((pile) => pile.pileId === side)) {
    throw new Error(`The side pile is not a pile in the row: ${side}`);
  }
}
