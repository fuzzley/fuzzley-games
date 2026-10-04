import { PileRole } from "@/engine/core/card/card_pile";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { PlacementRule } from "@/engine/tableau/rules";
import { PileMarker } from "@/engine/tableau/table_game";
import { FaceVisibility, GrabRule, ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt, zoneRow } from "@/engine/tableau/zone_builder";
import { cellPileId, foundationPileId, tableauPileId } from "./pile_ids";
import { BURIED_COLUMN_LAYOUT, STACKED_PILE_LAYOUT } from "./pile_layouts";

/**
 * Builds the piles a solitaire board is made of: cells, foundations, columns,
 * a stock and a waste.
 */

/** The placeholder drawn behind an empty pile that is not a foundation. */
export const PLAIN_PLACEHOLDER = "card-placeholder";

/** The circled placeholder that marks a foundation. */
export const FOUNDATION_PLACEHOLDER = "card-placeholder-full-border-circle";

/** The placeholder with a recycle arrow, for a stock that comes round again. */
export const RECYCLING_STOCK_PLACEHOLDER = "card-placeholder-full-border-reset";

/** The unmarked placeholder, for a stock that deals only once. */
export const CLOSED_STOCK_PLACEHOLDER = "card-placeholder-full-border";

/**
 * How many uses the pip artwork can count: a stock or marker allowing one of
 * these many recycles or redeals can show a pip for each.
 */
export const PIP_COUNTS: readonly number[] = [2, 3];

/**
 * Returns the recycle arrow with a pip for each of `allowed` uses, filled for
 * each of the `remaining` ones, or the plain recycle arrow when no pip artwork
 * counts that many.
 */
export function recyclePipsPlaceholder(
  remaining: number,
  allowed: number,
): string {
  if (!PIP_COUNTS.includes(allowed) || remaining < 1 || remaining > allowed) {
    return RECYCLING_STOCK_PLACEHOLDER;
  }
  return `${RECYCLING_STOCK_PLACEHOLDER}-${remaining}-of-${allowed}`;
}

/** Describes a marker that counts the uses left of something limited. */
export interface RecycleMarkerOptions {
  /** Whether pressing the slot does, or will once it is empty, do anything. */
  readonly usable: boolean;
  /** How many uses are left. */
  readonly remaining: number;
  /** How many uses the game allows, which may be Infinity. */
  readonly allowed: number;
}

/**
 * Returns the marker for a stock or a redeal slot: the closed outline once it
 * has nothing left to do, a pip for each use left when the uses are counted,
 * and the recycle arrow when they are not.
 */
export function recycleMarker(options: RecycleMarkerOptions): PileMarker {
  const { usable, remaining, allowed } = options;
  if (!usable) return { artwork: CLOSED_STOCK_PLACEHOLDER, actionable: false };
  return {
    artwork: Number.isFinite(allowed)
      ? recyclePipsPlaceholder(remaining, allowed)
      : RECYCLING_STOCK_PLACEHOLDER,
    actionable: true,
  };
}

/** Places a row of piles and says how many there are. */
interface RowPlacement {
  /** How many piles to build. */
  readonly count: number;
  /** The column the first pile sits in; the rest follow consecutively. */
  readonly column: number;
  /** The grid row they sit in. */
  readonly row: number;
}

/** Configures a row of suit foundations. */
export interface FoundationRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
  /** What may be lifted back off; the top card by default. */
  readonly grab?: GrabRule;
  /** Whether a card may be dragged back off; true by default. */
  readonly draggable?: boolean;
}

/** Builds a row of suit foundations, the piles a game is won onto. */
export function foundationRow(options: FoundationRowOptions): ZoneSpec[] {
  const { count, column, row, role, accept, grab, draggable } = options;
  return zoneRow({
    count,
    column,
    row,
    role,
    accept,
    id: foundationPileId,
    layout: STACKED_PILE_LAYOUT,
    grab: grab ?? { kind: "top-only" },
    draggable: draggable ?? true,
    face: "always-up",
    backgroundKey: FOUNDATION_PLACEHOLDER,
  });
}

/** Configures a row of holding cells. */
export interface CellRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
}

/** Builds a row of holding cells, each of which holds one card. */
export function cellRow(options: CellRowOptions): ZoneSpec[] {
  const { count, column, row, role, accept } = options;
  return zoneRow({
    count,
    column,
    row,
    role,
    accept,
    id: cellPileId,
    layout: STACKED_PILE_LAYOUT,
    capacity: 1,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    backgroundKey: PLAIN_PLACEHOLDER,
  });
}

/** Configures a row of tableau columns. */
export interface ColumnRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
  /** What may be lifted out of them. */
  readonly grab: GrabRule;
  /** How the cards are arranged; the fan for buried cards by default. */
  readonly layout?: PileLayout;
  /** Which side the cards show; whichever side each card says by default. */
  readonly face?: FaceVisibility;
}

/** Builds a row of tableau columns, where most of a game is played. */
export function columnRow(options: ColumnRowOptions): ZoneSpec[] {
  const { count, column, row, role, accept, grab, layout, face } = options;
  return zoneRow({
    count,
    column,
    row,
    role,
    accept,
    grab,
    id: tableauPileId,
    layout: layout ?? BURIED_COLUMN_LAYOUT,
    draggable: true,
    face: face ?? "card",
    backgroundKey: PLAIN_PLACEHOLDER,
  });
}

/** Configures the stock. */
export interface StockZoneOptions {
  /** The stable id of the pile. */
  readonly id: string;
  /** The part it plays. */
  readonly role: PileRole;
  /** What may be placed here, which for a stock is normally nothing. */
  readonly accept: PlacementRule | null;
  /** The column it sits in. */
  readonly column: number;
  /** The grid row it sits in. */
  readonly row: number;
  /**
   * The placeholder drawn behind the empty slot:
   * {@link RECYCLING_STOCK_PLACEHOLDER} or {@link CLOSED_STOCK_PLACEHOLDER}.
   */
  readonly backgroundKey: string;
  /**
   * Whether pressing the empty slot does something, which sets only its cursor
   * and hover border; the gesture map handles the press.
   */
  readonly emptyIsActionable?: boolean;
}

/** Builds the stock, whose top card can be pressed to draw but not dragged. */
export function stockZone(options: StockZoneOptions): ZoneSpec {
  const { id, role, accept, column, row, backgroundKey, emptyIsActionable } =
    options;
  return zoneAt({
    id,
    role,
    accept,
    column,
    row,
    backgroundKey,
    emptyIsActionable,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: false,
    face: "always-down",
  });
}

/** Configures the waste. */
export interface WasteZoneOptions {
  /** The stable id of the pile. */
  readonly id: string;
  /** The part it plays. */
  readonly role: PileRole;
  /** What may be placed here, which for a waste is normally nothing. */
  readonly accept: PlacementRule | null;
  /** How the drawn cards are fanned. */
  readonly layout: PileLayout;
  /** The column it sits in. */
  readonly column: number;
  /** The grid row it sits in. */
  readonly row: number;
}

/** Builds the waste, where drawn cards fan out over bare table. */
export function wasteZone(options: WasteZoneOptions): ZoneSpec {
  const { id, role, accept, layout, column, row } = options;
  return zoneAt({
    id,
    role,
    accept,
    layout,
    column,
    row,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
  });
}
