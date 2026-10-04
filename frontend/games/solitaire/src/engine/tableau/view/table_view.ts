import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { BoardQuery } from "../rules";
import { ZoneSpec } from "../zone";

/** Exposes the read-only parts of a table game that drawing it requires. */
export interface TableView {
  /** Every pile on the board, bottom of the draw order first. */
  readonly piles: readonly ReadonlyCardPile<PlayingCard>[];

  /** Every pile a dragged stack may be dropped onto. */
  readonly dropTargetPiles: readonly ReadonlyCardPile<PlayingCard>[];

  /** The board as the rules read it, which some grab rules consult. */
  readonly board: BoardQuery;

  /** Returns the zone describing a pile, or undefined for an unknown id. */
  zoneFor(pileId: string): ZoneSpec | undefined;

  /** Returns the card with the given id, or undefined. */
  getCardById(cardId: string): PlayingCard | undefined;

  /** Returns the pile with the given id, or undefined. */
  getPileById(pileId: string): ReadonlyCardPile<PlayingCard> | undefined;

  /** Returns the pile currently holding the given card, or undefined. */
  getPileContainingCard(
    cardId: string,
  ): ReadonlyCardPile<PlayingCard> | undefined;

  /** Returns whether the card can be picked up out of the pile holding it. */
  isCardInteractableInPile(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
  ): boolean;

  /** Returns whether the card can be dragged out of the pile holding it. */
  isCardDraggableInPile(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
  ): boolean;

  /** Returns whether the card and its stack may legally move to a pile. */
  canMoveCardToPile(cardId: string, targetPileId: string): boolean;

  /**
   * Returns the artwork the pile's placeholder shows now, or undefined for a
   * pile drawn over bare table.
   *
   * The artwork may change during a game, but whether a pile has any may not:
   * the board makes a placeholder only for the piles that have one when it is
   * built.
   */
  pileBackgroundKey(pile: ReadonlyCardPile<PlayingCard>): string | undefined;

  /**
   * Returns whether pressing the pile's empty slot does something now, which
   * it never does while the pile holds cards.
   */
  isEmptySlotActionable(pile: ReadonlyCardPile<PlayingCard>): boolean;
}
