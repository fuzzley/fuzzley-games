import { PlayingCard, Rank } from "@/engine/core/card/playing_card";

/**
 * Returns a column with its Kings moved to the bottom, the cards otherwise in
 * the order they were dealt.
 *
 * For a game whose columns never take a King: one dealt on top would bury the
 * cards beneath it for the whole game.
 *
 * @param column The column's cards, bottom first.
 */
export function sinkKings(column: readonly PlayingCard[]): PlayingCard[] {
  const kings = column.filter((card) => card.rank === Rank.KING);
  const rest = column.filter((card) => card.rank !== Rank.KING);
  return [...kings, ...rest];
}
