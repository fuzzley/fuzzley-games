import { FormFactor } from "./form_factor";

/** Says where a board puts the piles that are not columns. */
export type PilePosition =
  /** Above the columns, as on a larger screen. */
  | "top"
  /** Along the bottom edge, under the player's thumb. */
  | "bottom";

/**
 * Says which side of the board the stock sits on, or in a game without one
 * the pile that stands in for it, such as the free cells.
 */
export type StockSide = "left" | "right";

/**
 * Stands for a choice, or for Auto, which leaves it to the shape of the
 * screen.
 */
export type OrAuto<Choice extends string> = Choice | "auto";

/** Holds the player's choices about how a board is arranged. */
export interface BoardArrangement {
  /** Where the piles that are not columns go. */
  readonly piles: OrAuto<PilePosition>;
  /** Which side of the board the stock sits on. */
  readonly stockSide: OrAuto<StockSide>;
}

/** Holds the arrangement a board is laid out in, with Auto decided. */
export interface ResolvedArrangement {
  /** Where the piles that are not columns go. */
  readonly piles: PilePosition;
  /** Which side of the board the stock sits on. */
  readonly stockSide: StockSide;
}

/** How a board is arranged until the player says otherwise: left to Auto. */
export const DEFAULT_BOARD_ARRANGEMENT: BoardArrangement = {
  piles: "auto",
  stockSide: "auto",
};

/**
 * What Auto picks on each shape of screen: the piles and the stock under a
 * right thumb on a phone, and where they have always been on a larger screen.
 */
export const AUTO_ARRANGEMENTS: Readonly<
  Record<FormFactor, ResolvedArrangement>
> = {
  roomy: { piles: "top", stockSide: "left" },
  "phone-portrait": { piles: "bottom", stockSide: "right" },
  "phone-landscape": { piles: "bottom", stockSide: "right" },
};

/**
 * Returns the arrangement a board is laid out in on a shape of screen, with
 * whatever the player left to Auto decided by it.
 */
export function resolveArrangement(
  arrangement: BoardArrangement,
  formFactor: FormFactor,
): ResolvedArrangement {
  const auto = AUTO_ARRANGEMENTS[formFactor];
  return {
    piles: arrangement.piles === "auto" ? auto.piles : arrangement.piles,
    stockSide:
      arrangement.stockSide === "auto" ? auto.stockSide : arrangement.stockSide,
  };
}
