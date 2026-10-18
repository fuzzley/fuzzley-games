import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";
import { Adjacency } from "./adjacency";
import { BoardQuery } from "./board_query";

/** Says which cards in a zone a player may pick up. */
export type GrabRule =
  /** Nothing here can be picked up. */
  | { readonly kind: "none" }
  /** Only the card on top. */
  | { readonly kind: "top-only" }
  /** Any face-up card, and whatever is stacked on it, ordered or not. */
  | { readonly kind: "any-face-up" }
  /**
   * Any face-up card whose covering cards form an unbroken run by
   * {@link adjacent}.
   */
  | {
      readonly kind: "run";
      /** Whether `upper` may sit directly on `lower` within a run. */
      readonly adjacent: Adjacency;
    }
  /**
   * Only the card on top, and only while every pile in {@link coveredBy} is
   * empty, as a pyramid's card is free once the two below it are gone.
   */
  | {
      readonly kind: "uncovered";
      /** The ids of the piles whose cards lie over this one. */
      readonly coveredBy: readonly string[];
    };

/**
 * Returns whether `card` can be picked up out of `pile` under a grab rule.
 *
 * @param board The rest of the board, which an `uncovered` rule reads.
 */
export function canGrab(
  grab: GrabRule,
  card: PlayingCard,
  pile: ReadonlyCardPile<PlayingCard>,
  board: BoardQuery,
): boolean {
  switch (grab.kind) {
    case "none":
      return false;
    case "top-only":
      return pile.topCard === card;
    case "any-face-up":
      return card.faceUp;
    case "run":
      return card.faceUp && isRunFrom(pile, card, grab.adjacent);
    case "uncovered":
      return pile.topCard === card && isUncovered(grab.coveredBy, board);
  }
}

/**
 * Returns the cards a grab of `card` lifts out of `pile`, it and everything
 * stacked on it, bottom first, or null when the grab rule will not let go.
 *
 * @param board The rest of the board, which an `uncovered` rule reads.
 */
export function grabbedStack(
  grab: GrabRule,
  card: PlayingCard,
  pile: ReadonlyCardPile<PlayingCard>,
  board: BoardQuery,
): readonly PlayingCard[] | null {
  if (!canGrab(grab, card, pile, board)) return null;
  const cards = pile.getCards();
  const index = cards.indexOf(card);
  return index === -1 ? null : cards.slice(index);
}

/**
 * Returns whether the cards from `card` upwards are all face up and form an
 * unbroken run.
 */
function isRunFrom(
  pile: ReadonlyCardPile<PlayingCard>,
  card: PlayingCard,
  adjacent: Adjacency,
): boolean {
  const cards = pile.getCards();
  const start = cards.indexOf(card);
  if (start === -1) return false;

  for (let index = start; index < cards.length; index++) {
    const lower = itemAt(cards, index);
    const upper = cards[index + 1];
    if (!lower.faceUp) return false;
    if (upper && !adjacent(lower, upper)) return false;
  }
  return true;
}

/** Returns whether every pile in `coveredBy` is empty. */
export function isUncovered(
  coveredBy: readonly string[],
  board: BoardQuery,
): boolean {
  return coveredBy.every((pileId) => board.pile(pileId)?.isEmpty ?? true);
}
