import { FormFactor } from "./form_factor";
import { TableLayoutSpec } from "./table_layout";

/** Says where an upright phone puts the piles that are not columns. */
export type PhonePilePosition =
  /** Along the bottom, under the player's thumb. */
  | "bottom"
  /** Along the top, as on a larger screen. */
  | "top";

/** Says which hand the player plays with; a left one mirrors the board. */
export type Hand = "right" | "left";

/** Holds the player's choices about how a board is arranged. */
export interface BoardArrangement {
  /** Where an upright phone puts the piles that are not columns. */
  readonly phonePiles: PhonePilePosition;
  /** Which hand the player plays with. */
  readonly hand: Hand;
}

/** How a board is arranged until the player says otherwise. */
export const DEFAULT_BOARD_ARRANGEMENT: BoardArrangement = {
  phonePiles: "bottom",
  hand: "right",
};

/** Holds the grids a game lays its board out on on a phone. */
export interface PhoneLayouts {
  /** For a phone held upright, with the piles at the bottom or the top. */
  readonly portrait: {
    readonly [Position in PhonePilePosition]: TableLayoutSpec;
  };
  /** For a phone on its side. */
  readonly landscape: TableLayoutSpec;
  /**
   * The columns, left to right, which a mirror moves as one block but keeps
   * in order on every grid, since a player reads them left to right whichever
   * hand they play with.
   */
  readonly columns: readonly string[];
}

/** Holds every grid a game's board may lie on. */
export interface BoardLayouts {
  /** The grid for a screen with room to spare, and wherever no other applies. */
  readonly roomy: TableLayoutSpec;
  /**
   * The grids for a phone. A game without them lies on its roomy grid
   * everywhere, and is never mirrored.
   */
  readonly phone?: PhoneLayouts;
}

/** Stands for no columns kept in order, as a key into the mirror cache. */
const NO_COLUMNS: readonly string[] = [];

/**
 * Each grid's mirror images, by the columns they kept in order, kept so a frame
 * does not build one again.
 */
const mirrors = new WeakMap<
  TableLayoutSpec,
  WeakMap<readonly string[], TableLayoutSpec>
>();

/**
 * Returns a grid as it looks in a mirror: every slot in the column opposite,
 * its offset turned around, and its sideways spreads running the other way.
 *
 * @param columns Piles that move as one block, into the mirror image of the
 *   columns they span, but keep their order within it.
 */
export function mirrorTable(
  spec: TableLayoutSpec,
  columns: readonly string[] = NO_COLUMNS,
): TableLayoutSpec {
  const byColumns = mirrors.get(spec) ?? new WeakMap();
  mirrors.set(spec, byColumns);
  const known = byColumns.get(columns);
  if (known) return known;

  const kept = new Set(columns);
  const block = spec.slots
    .filter((slot) => kept.has(slot.pileId))
    .map((slot) => slot.column);
  const blockStart = Math.min(...block);
  const blockEnd = Math.max(...block);

  const mirrored: TableLayoutSpec = {
    ...spec,
    slots: spec.slots.map((slot) => ({
      ...slot,
      column: kept.has(slot.pileId)
        ? spec.columns - 1 - blockEnd + (slot.column - blockStart)
        : spec.columns - 1 - slot.column,
      // Subtracted from zero so an offset of nothing stays positive zero.
      offset: slot.offset && { x: 0 - slot.offset.x, y: slot.offset.y },
    })),
    mirrored: !spec.mirrored,
  };
  byColumns.set(columns, mirrored);
  return mirrored;
}

/**
 * Returns the grid a board lies on for a shape of screen and the player's
 * arrangement, mirrored for a left hand when the game has phone grids, with
 * its columns kept in order.
 */
export function chooseTableLayout(
  layouts: BoardLayouts,
  formFactor: FormFactor,
  arrangement: BoardArrangement,
): TableLayoutSpec {
  const phone = layouts.phone;
  if (!phone) return layouts.roomy;

  const grid =
    formFactor === "phone-portrait"
      ? phone.portrait[arrangement.phonePiles]
      : formFactor === "phone-landscape"
        ? phone.landscape
        : layouts.roomy;
  return arrangement.hand === "left" ? mirrorTable(grid, phone.columns) : grid;
}
