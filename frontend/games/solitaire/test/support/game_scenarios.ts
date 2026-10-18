import { CardPile, ReadonlyCardPile } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";

/*
 * The one sanctioned way for a spec to arrange a position: empty the board,
 * then relocate the cards it needs. A game hands its piles out read-only, and
 * these helpers are the only code outside the engine that reaches past that,
 * so a change to how the engine moves cards only has to reach them.
 */

/**
 * Exposes as much of any dealt game as building an exact position needs.
 *
 * Helpers that need a particular game belong beside that game's specs.
 */
export interface DealtBoard {
  readonly piles: readonly ReadonlyCardPile<PlayingCard>[];
  getCardById(cardId: string): PlayingCard | undefined;
  getPileById(pileId: string): ReadonlyCardPile<PlayingCard> | undefined;
  getPileContainingCard(
    cardId: string,
  ): ReadonlyCardPile<PlayingCard> | undefined;
}

/** Returns the changeable pile behind one a game handed out read-only. */
function writable(pile: ReadonlyCardPile<PlayingCard>): CardPile<PlayingCard> {
  if (!(pile instanceof CardPile)) {
    throw new Error(`The pile "${pile.id}" cannot be arranged.`);
  }
  // instanceof narrows a generic class to CardPile<any>; the pile came from a
  // game of PlayingCards.
  return pile as CardPile<PlayingCard>;
}

/** Empties every pile on the board so a test can build an exact position. */
export function emptyBoard(game: DealtBoard): void {
  game.piles.forEach((pile) => writable(pile).clear());
}

/**
 * Empties one pile, leaving its cards off the board, so a test can build an
 * exact position there.
 */
export function clearPile(pile: ReadonlyCardPile<PlayingCard>): void {
  writable(pile).clear();
}

/** Takes a card off whatever pile holds it, leaving it on no pile at all. */
export function takeOffBoard(game: DealtBoard, cardId: string): void {
  const card = game.getCardById(cardId);
  const pile = game.getPileContainingCard(cardId);
  if (card && pile) writable(pile).removeCard(card);
}

/**
 * Moves a card from whatever pile holds it onto the target pile, given as a
 * pile or its id, and returns it.
 *
 * The game must already be dealt, so the card exists.
 */
export function relocate(
  game: DealtBoard,
  cardId: string,
  target: ReadonlyCardPile<PlayingCard> | string,
  faceUp = true,
): PlayingCard {
  const card = game.getCardById(cardId);
  if (!card) throw new Error(`The game has no card "${cardId}".`);
  const targetPile =
    typeof target === "string" ? game.getPileById(target) : target;
  if (!targetPile) {
    throw new Error(`The game has no pile "${target as string}".`);
  }

  const source = game.getPileContainingCard(cardId);
  if (source) writable(source).removeCard(card);
  card.faceUp = faceUp;
  writable(targetPile).addCard(card);
  return card;
}

const RANKS_BY_CODE: Readonly<Record<string, Rank>> = {
  A: Rank.ACE,
  "2": Rank.TWO,
  "3": Rank.THREE,
  "4": Rank.FOUR,
  "5": Rank.FIVE,
  "6": Rank.SIX,
  "7": Rank.SEVEN,
  "8": Rank.EIGHT,
  "9": Rank.NINE,
  "10": Rank.TEN,
  T: Rank.TEN,
  J: Rank.JACK,
  Q: Rank.QUEEN,
  K: Rank.KING,
};

const SUITS_BY_CODE: Readonly<Record<string, Suit>> = {
  S: Suit.SPADE,
  H: Suit.HEART,
  D: Suit.DIAMOND,
  C: Suit.CLUB,
};

/**
 * Returns the id of the card a short code names: rank then suit, as in `QH`,
 * `10D` or `TD`, with `#1` after it for the second deck's copy.
 *
 * @throws Error for a code that names no card.
 */
export function cardId(code: string): string {
  const match = /^(10|[2-9AJQKT])([SHDC])(?:#(\d+))?$/.exec(code);
  const rank = match ? RANKS_BY_CODE[match[1]] : undefined;
  const suit = match ? SUITS_BY_CODE[match[2]] : undefined;
  if (rank === undefined || suit === undefined) {
    throw new Error(`"${code}" names no card.`);
  }
  return playingCardInstanceId({
    suit,
    rank,
    deckIndex: Number(match?.[3] ?? 0),
  });
}
