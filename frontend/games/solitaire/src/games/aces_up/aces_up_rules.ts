import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  cardIs,
  hasRank,
  never,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in an Aces Up game. */
export const AcesUpRole = {
  /** The face-down cards still to be dealt, four at a time. */
  STOCK: "stock",
  /** One of the four columns cards are dealt onto. */
  TABLEAU: "tableau",
  /** Where the beaten cards go. */
  DISCARD: "discard",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts an Aces Up pile can play. */
export type AcesUpRole = (typeof AcesUpRole)[keyof typeof AcesUpRole];

/**
 * What may fill an empty column.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const AcesUpSpaces = {
  /** The usual game: the top card of any other column. */
  ANY_CARD: 0,
  /** The harder game: only an Ace. */
  ACES_ONLY: 1,
} as const;

/** Names one of the rules for filling an empty column. */
export type AcesUpSpaces = (typeof AcesUpSpaces)[keyof typeof AcesUpSpaces];

/** The empty-column rule dealt when nothing says otherwise. */
export const DEFAULT_ACES_UP_SPACES: AcesUpSpaces = AcesUpSpaces.ANY_CARD;

/** Returns a card's rank counting the Ace as fourteen, above the King. */
export function acesHighValue(card: PlayingCard): number {
  return card.rank === Rank.ACE ? Rank.KING + 1 : card.rank;
}

/**
 * The discard: takes a column's top card while another column shows a higher
 * card of the same suit, which an Ace never meets.
 */
export const ACES_UP_DISCARD_RULE: PlacementRule = all(
  singleCardOnly,
  (context) =>
    context.sourcePile.role === AcesUpRole.TABLEAU &&
    context.board
      .pilesByRole(AcesUpRole.TABLEAU)
      .some((pile) => isBeatenBy(context.card, pile.topCard)),
);

/** Returns whether `card` is outranked by `other` in its own suit. */
function isBeatenBy(
  card: PlayingCard,
  other: PlayingCard | undefined,
): boolean {
  return (
    other !== undefined &&
    other !== card &&
    other.suit === card.suit &&
    acesHighValue(other) > acesHighValue(card)
  );
}

/**
 * Returns the rule for a column: an empty one takes a single card, which the
 * harder game restricts to an Ace, and an occupied one takes nothing.
 */
export function acesUpTableauRule(spaces: AcesUpSpaces): PlacementRule {
  const whenEmpty =
    spaces === AcesUpSpaces.ACES_ONLY ? cardIs(hasRank(Rank.ACE)) : anyCard;
  return byEmptiness(all(singleCardOnly, whenEmpty), never);
}
