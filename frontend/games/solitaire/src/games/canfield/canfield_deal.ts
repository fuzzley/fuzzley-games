import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullCards } from "../common/pull_cards";
import { CanfieldVariantRules } from "./canfield_rules";

/** How many cards the reserve is dealt. */
export const RESERVE_SIZE = 13;

/** Holds the piles a Canfield deal fills. */
export interface CanfieldPiles {
  readonly stock: CardPile<PlayingCard>;
  readonly reserve: CardPile<PlayingCard>;
  readonly foundations: readonly CardPile<PlayingCard>[];
  readonly tableaus: readonly CardPile<PlayingCard>[];
}

/**
 * Deals a board under a variant's rules.
 *
 * Storehouse lays the Twos on the foundations first; every other game turns
 * the card after the reserve onto the first foundation, which sets the rank
 * all four start on. Then thirteen cards go to the reserve, face down but for
 * the top (or all face up in Superior Canfield), one face up to each column,
 * and the rest face down to the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealCanfieldLayout(
  rules: CanfieldVariantRules,
  deck: PlayingCard[],
  piles: CanfieldPiles,
): void {
  if (rules.twosStartFoundations) {
    const twos = pullCards(deck, (card) => card.rank === Rank.TWO);
    for (const [index, two] of twos.entries()) {
      two.faceUp = true;
      piles.foundations[index]?.addCard(two);
    }
  }

  for (let dealt = 0; dealt < RESERVE_SIZE; dealt++) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = rules.reserveFaceUp;
    piles.reserve.addCard(card);
  }
  const top = piles.reserve.topCard;
  if (top) top.faceUp = true;

  if (!rules.twosStartFoundations) {
    const base = deck.pop();
    if (base) {
      base.faceUp = true;
      piles.foundations[0]?.addCard(base);
    }
  }

  for (const tableau of piles.tableaus) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    tableau.addCard(card);
  }

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    piles.stock.addCard(card);
    card = deck.pop();
  }
}
