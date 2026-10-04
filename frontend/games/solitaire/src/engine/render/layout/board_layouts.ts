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

/** Each grid's mirror image, kept so a frame does not build it again. */
const mirrors = new WeakMap<TableLayoutSpec, TableLayoutSpec>();

/**
 * Returns a grid as it looks in a mirror: every slot in the column opposite,
 * its offset turned around, and its sideways spreads running the other way.
 */
export function mirrorTable(spec: TableLayoutSpec): TableLayoutSpec {
  const known = mirrors.get(spec);
  if (known) return known;

  const mirrored: TableLayoutSpec = {
    ...spec,
    slots: spec.slots.map((slot) => ({
      ...slot,
      column: spec.columns - 1 - slot.column,
      // Subtracted from zero so an offset of nothing stays positive zero.
      offset: slot.offset && { x: 0 - slot.offset.x, y: slot.offset.y },
    })),
    mirrored: !spec.mirrored,
  };
  mirrors.set(spec, mirrored);
  return mirrored;
}

/**
 * Returns the grid a board lies on for a shape of screen and the player's
 * arrangement, mirrored for a left hand when the game has phone grids.
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
  return arrangement.hand === "left" ? mirrorTable(grid) : grid;
}
