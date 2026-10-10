import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { runColumn } from "@/engine/tableau/rules/run_column";
import { BoardQuery } from "@/engine/tableau/rules/board_query";
import {
  PlacementRule,
  cardIs,
  hasRank,
  never,
} from "@/engine/tableau/rules/placement";
import { isSameSuitRun } from "@/engine/tableau/rules/adjacency";
import { makePlayingCard } from "@test/support/card_builder";

/** A board with no other piles on it, for the rules that never read one. */
const EMPTY_BOARD: BoardQuery = {
  pile: () => undefined,
  pilesByRole: () => [],
  emptyCount: () => 0,
};

function pileWith(...cards: PlayingCard[]): CardPile<PlayingCard> {
  const pile = new CardPile<PlayingCard>("pile", "tableau");
  for (const card of cards) pile.addCard(card);
  return pile;
}

/** Returns a card of the given suit and rank, face up unless stated. */
function card(
  suit: Suit,
  rank: Rank,
  faceUp = true,
  id = `${suit}-${rank}`,
): PlayingCard {
  return makePlayingCard({ suit, rank, faceUp, id });
}

describe("runColumn", () => {
  /** A column built down in suit, taking only a King when empty. */
  const column = runColumn({
    adjacent: isSameSuitRun,
    whenEmpty: cardIs(hasRank(Rank.KING)),
  });

  /** Asks whether `rule` lets `movingStack` land on `target`. */
  function lands(
    rule: PlacementRule,
    target: CardPile<PlayingCard>,
    movingStack: PlayingCard[],
  ): boolean {
    return rule({
      card: movingStack[0],
      movingStack,
      sourcePile: pileWith(),
      targetPile: target,
      board: EMPTY_BOARD,
    });
  }

  it("lands a card that sits on the top card by the adjacency", () => {
    const target = pileWith(card(Suit.SPADE, Rank.NINE));

    expect(lands(column.accept, target, [card(Suit.SPADE, Rank.EIGHT)])).toBe(
      true,
    );
  });

  it("refuses a card the adjacency does not allow", () => {
    const target = pileWith(card(Suit.SPADE, Rank.NINE));

    expect(lands(column.accept, target, [card(Suit.HEART, Rank.EIGHT)])).toBe(
      false,
    );
  });

  it("asks the empty-column rule of an empty column", () => {
    expect(
      lands(column.accept, pileWith(), [card(Suit.SPADE, Rank.QUEEN)]),
    ).toBe(false);
  });

  it("lifts runs by the same adjacency it lands them by", () => {
    expect(column.grab).toEqual({ kind: "run", adjacent: isSameSuitRun });
  });

  it("refuses a stack longer than the limit allows", () => {
    const capped = runColumn({
      adjacent: isSameSuitRun,
      whenEmpty: never,
      maxStack: () => 1,
    });
    const target = pileWith(card(Suit.SPADE, Rank.TEN));

    expect(
      lands(capped.accept, target, [
        card(Suit.SPADE, Rank.NINE),
        card(Suit.SPADE, Rank.EIGHT),
      ]),
    ).toBe(false);
  });
});
