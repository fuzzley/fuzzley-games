import { PileRole } from "@/engine/core/card/card_pile";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { PlacementRule } from "@/engine/tableau/rules";
import { FaceVisibility, GrabRule, ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt, zoneRow } from "@/engine/tableau/zone_builder";
import { cellPileId, foundationPileId, tableauPileId } from "./pile_ids";
import { BURIED_COLUMN_LAYOUT, STACKED_PILE_LAYOUT } from "./pile_layouts";

/**
 * The rows of piles a solitaire board is built from.
 *
 * A board is cells, foundations, columns and at most one stock and waste, and
 * each of those looks the same whichever game is being dealt: a foundation is
 * always a squarely stacked, always-up pile you may lift the top card from,
 * behind a circled placeholder. Thirteen games wrote that out in full, so the
 * placeholder artwork alone appeared thirteen times.
 *
 * What genuinely differs between games — which rule accepts a card, what may be
 * lifted, how many piles there are and where they sit — stays a parameter.
 */

/** The placeholder drawn behind an empty pile that is not a foundation. */
export const PLAIN_PLACEHOLDER = "card-placeholder";

/** The circled placeholder that marks a foundation. */
export const FOUNDATION_PLACEHOLDER = "card-placeholder-full-border-circle";

/** The placeholder carrying a recycle arrow, for a stock that comes round again. */
export const RECYCLING_STOCK_PLACEHOLDER = "card-placeholder-full-border-reset";

/** Where a row of piles sits, and how many of it there are. */
interface RowPlacement {
  /** How many piles to build. */
  readonly count: number;
  /** The column the first pile sits in; the rest follow consecutively. */
  readonly column: number;
  /** The grid row they sit in. */
  readonly row: number;
}

/** How to build a row of suit foundations. */
export interface FoundationRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
  /**
   * What may be lifted back off. Defaults to the top card.
   *
   * Set to `{ kind: "none" }` by the games whose foundations are a destination
   * only: a Spider or Simple Simon run arrives by completing itself, and taking
   * it back apart is not a move.
   */
  readonly grab?: GrabRule;
  /** Whether a card may be dragged back off. Defaults to true. */
  readonly draggable?: boolean;
}

/**
 * A row of suit foundations: the piles a game is won onto.
 *
 * Always face up, always behind the circled placeholder that tells it apart
 * from a column at a glance.
 */
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

/** How to build a row of holding cells. */
export interface CellRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
}

/**
 * A row of holding cells: FreeCell's reserve, and Eight Off's and Seahaven's.
 *
 * The capacity of one is the whole point of a cell, and stating it here is what
 * stops a game from declaring a cell that quietly holds two.
 */
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

/** How to build a row of tableau columns. */
export interface ColumnRowOptions extends RowPlacement {
  /** The part these piles play. */
  readonly role: PileRole;
  /** What may be placed here. */
  readonly accept: PlacementRule | null;
  /** What may be lifted out of them. */
  readonly grab: GrabRule;
  /**
   * How the cards are arranged. Defaults to the two-gap fan, which is right
   * whenever any card is dealt face down.
   */
  readonly layout?: PileLayout;
  /**
   * Which side the cards show. Defaults to deferring to the card, which is
   * right whenever the deal buries any of them.
   */
  readonly face?: FaceVisibility;
}

/** A row of tableau columns: the part of the board a game is actually played on. */
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

/** How to build the stock. */
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
   * The placeholder artwork drawn behind the empty slot.
   *
   * Stated rather than derived from whether the stock recycles, because the
   * boards do not currently agree: Spider, Spiderette and Easthaven wear the
   * recycle arrow without recycling, while Scorpion and Forty Thieves use the
   * plain slot for the same "deals once and is finished" stock. Deriving it
   * would quietly restyle three boards.
   */
  readonly backgroundKey: string;
  /**
   * Whether pressing the empty slot does something — Klondike's recycle.
   *
   * Purely the cursor and hover border; the press itself is handled by the
   * game's gesture map.
   */
  readonly emptyIsActionable?: boolean;
}

/**
 * The stock: the pile a game draws from.
 *
 * Grabbable but not draggable, which is the distinction that lets a press draw
 * a card while a drag refuses to pick one up.
 */
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

/** How to build the waste. */
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

/**
 * The waste: where drawn cards land.
 *
 * Deliberately without a placeholder — the waste fans over bare table rather
 * than sitting in a marked slot, because an empty waste is not somewhere a card
 * can be put.
 */
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
