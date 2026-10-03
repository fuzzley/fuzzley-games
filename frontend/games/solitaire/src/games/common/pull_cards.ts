import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Removes every card matching `predicate` from a deck about to be dealt, and
 * returns them in the order the deal would have reached them.
 *
 * For a deal that places some cards before the rest, such as Aces that start
 * on the foundations.
 *
 * @param deck The cards to deal, drained from the end, which this shortens.
 */
export function pullCards(
  deck: PlayingCard[],
  predicate: (card: PlayingCard) => boolean,
): PlayingCard[] {
  const pulled: PlayingCard[] = [];
  for (let index = deck.length - 1; index >= 0; index--) {
    const card = deck[index];
    if (card && predicate(card)) {
      pulled.push(card);
      deck.splice(index, 1);
    }
  }
  return pulled;
}
