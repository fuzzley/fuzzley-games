import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import {
  BoardQuery,
  PlacementContext,
  PlacementRule,
  all,
  any,
  anyCard,
  ascendingSameSuit,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  descendingAnySuit,
  descendingSameSuit,
  hasRank,
  isOrderedPair,
  isRed,
  isSameSuitRun,
  maxStackSize,
  never,
  singleCardOnly,
  suitFoundation,
} from "@/engine/tableau/rules";
import { makePlayingCard } from "@test/support/card_builder";

function pileWith(
  role: string,
  ...cards: PlayingCard[]
): CardPile<PlayingCard> {
  const pile = new CardPile<PlayingCard>("pile", role);
  for (const card of cards) pile.addCard(card);
  return pile;
}

/** A board with the stated number of empty piles in each role. */
function boardWith(empties: Record<string, number> = {}): BoardQuery {
  return {
    pile: () => undefined,
    pilesByRole: () => [],
    emptyCount: (role) => empties[role] ?? 0,
  };
}

function contextOf(
  card: PlayingCard,
  targetPile: CardPile<PlayingCard>,
  options: { stackSize?: number; board?: BoardQuery } = {},
): PlacementContext {
  const stackSize = options.stackSize ?? 1;
  return {
    card,
    movingStack: [
      card,
      ...Array.from({ length: stackSize - 1 }, () => makePlayingCard()),
    ],
    sourcePile: pileWith("tableau"),
    targetPile,
    board: options.board ?? boardWith(),
  };
}

const blackKing = () =>
  makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING, id: "sk" });
const redQueen = () =>
  makePlayingCard({ suit: Suit.HEART, rank: Rank.QUEEN, id: "hq" });
const blackQueen = () =>
  makePlayingCard({ suit: Suit.CLUB, rank: Rank.QUEEN, id: "cq" });

describe("combinators", () => {
  const yes: PlacementRule = () => true;
  const no: PlacementRule = () => false;
  const context = () => contextOf(blackKing(), pileWith("tableau"));

  it("never accepts nothing", () => {
    expect(never(context())).toBe(false);
  });

  it("anyCard accepts anything", () => {
    expect(anyCard(context())).toBe(true);
  });

  it("all holds when every rule holds", () => {
    expect(all(yes, yes)(context())).toBe(true);
  });

  it("all fails when one rule fails", () => {
    expect(all(yes, no)(context())).toBe(false);
  });

  it("all holds vacuously with no rules", () => {
    expect(all()(context())).toBe(true);
  });

  it("any holds when one rule holds", () => {
    expect(any(no, yes)(context())).toBe(true);
  });

  it("any fails when every rule fails", () => {
    expect(any(no, no)(context())).toBe(false);
  });

  it("byEmptiness uses the empty rule on an empty pile", () => {
    const rule = byEmptiness(yes, no);

    expect(rule(contextOf(blackKing(), pileWith("tableau")))).toBe(true);
  });

  it("byEmptiness uses the occupied rule on an occupied pile", () => {
    const rule = byEmptiness(no, yes);

    expect(rule(contextOf(redQueen(), pileWith("tableau", blackKing())))).toBe(
      true,
    );
  });

  it("cardIs tests the moved card", () => {
    const rule = cardIs(hasRank(Rank.KING));

    expect(rule(contextOf(blackKing(), pileWith("tableau")))).toBe(true);
  });

  it("singleCardOnly rejects a stack of two", () => {
    const context = contextOf(blackKing(), pileWith("tableau"), {
      stackSize: 2,
    });

    expect(singleCardOnly(context)).toBe(false);
  });

  it("singleCardOnly accepts a lone card", () => {
    expect(singleCardOnly(contextOf(blackKing(), pileWith("tableau")))).toBe(
      true,
    );
  });
});

describe("maxStackSize", () => {
  // FreeCell's supermove limit, the rule that made board context necessary.
  const supermove = maxStackSize(
    (context) =>
      (context.board.emptyCount("cell") + 1) *
      2 ** context.board.emptyCount("tableau"),
  );

  it("allows a stack the free cells can carry", () => {
    const context = contextOf(blackKing(), pileWith("tableau"), {
      stackSize: 5,
      board: boardWith({ cell: 4, tableau: 0 }),
    });

    expect(supermove(context)).toBe(true);
  });

  it("refuses the same stack when the cells are full", () => {
    const context = contextOf(blackKing(), pileWith("tableau"), {
      stackSize: 5,
      board: boardWith({ cell: 0, tableau: 0 }),
    });

    expect(supermove(context)).toBe(false);
  });

  it("doubles the allowance for each empty column", () => {
    const context = contextOf(blackKing(), pileWith("tableau"), {
      stackSize: 4,
      board: boardWith({ cell: 1, tableau: 1 }),
    });

    expect(supermove(context)).toBe(true);
  });
});

describe("isRed", () => {
  it("is true for hearts", () => {
    expect(isRed(makePlayingCard({ suit: Suit.HEART }))).toBe(true);
  });

  it("is false for spades", () => {
    expect(isRed(makePlayingCard({ suit: Suit.SPADE }))).toBe(false);
  });
});

describe("descendingAlternatingColor", () => {
  it("accepts a red queen onto a black king", () => {
    const context = contextOf(redQueen(), pileWith("tableau", blackKing()));

    expect(descendingAlternatingColor(context)).toBe(true);
  });

  it("rejects a same-color card", () => {
    const context = contextOf(blackQueen(), pileWith("tableau", blackKing()));

    expect(descendingAlternatingColor(context)).toBe(false);
  });

  it("rejects an empty pile, which byEmptiness is expected to have handled", () => {
    expect(
      descendingAlternatingColor(contextOf(redQueen(), pileWith("t"))),
    ).toBe(false);
  });
});

describe("descendingAnySuit", () => {
  it("accepts a same-color descending card, unlike the Klondike rule", () => {
    const context = contextOf(blackQueen(), pileWith("tableau", blackKing()));

    expect(descendingAnySuit(context)).toBe(true);
  });

  it("still rejects a non-descending card", () => {
    const context = contextOf(blackKing(), pileWith("tableau", blackQueen()));

    expect(descendingAnySuit(context)).toBe(false);
  });
});

const spadeQueen = () =>
  makePlayingCard({ suit: Suit.SPADE, rank: Rank.QUEEN, id: "sq" });

describe("descendingSameSuit", () => {
  it("accepts the next card down in the same suit", () => {
    const context = contextOf(spadeQueen(), pileWith("tableau", blackKing()));

    expect(descendingSameSuit(context)).toBe(true);
  });

  it("rejects the same color in a different suit, unlike the Spider rule", () => {
    const context = contextOf(blackQueen(), pileWith("tableau", blackKing()));

    expect(descendingSameSuit(context)).toBe(false);
  });

  it("rejects a same-suit card that is not one lower", () => {
    const jack = makePlayingCard({
      suit: Suit.SPADE,
      rank: Rank.JACK,
      id: "sj",
    });

    expect(
      descendingSameSuit(contextOf(jack, pileWith("t", blackKing()))),
    ).toBe(false);
  });

  it("rejects building below an Ace, which has nothing under it", () => {
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(
      descendingSameSuit(contextOf(spadeQueen(), pileWith("t", ace))),
    ).toBe(false);
  });

  it("rejects an empty pile, which byEmptiness is expected to have handled", () => {
    expect(descendingSameSuit(contextOf(spadeQueen(), pileWith("t")))).toBe(
      false,
    );
  });
});

describe("isOrderedPair", () => {
  it("accepts one rank down in the other color", () => {
    expect(isOrderedPair(blackKing(), redQueen())).toBe(true);
  });

  it("rejects the same color", () => {
    expect(isOrderedPair(blackKing(), blackQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const redJack = makePlayingCard({
      suit: Suit.HEART,
      rank: Rank.JACK,
      id: "hj",
    });

    expect(isOrderedPair(blackKing(), redJack)).toBe(false);
  });
});

describe("isSameSuitRun", () => {
  it("accepts one rank down in the same suit", () => {
    expect(isSameSuitRun(blackKing(), spadeQueen())).toBe(true);
  });

  it("rejects the same color in a different suit", () => {
    expect(isSameSuitRun(blackKing(), blackQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const spadeJack = makePlayingCard({
      suit: Suit.SPADE,
      rank: Rank.JACK,
      id: "sj",
    });

    expect(isSameSuitRun(blackKing(), spadeJack)).toBe(false);
  });

  it("rejects anything under an Ace", () => {
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(isSameSuitRun(ace, spadeQueen())).toBe(false);
  });
});

describe("ascendingSameSuit", () => {
  it("accepts the next card up in the same suit", () => {
    const two = makePlayingCard({ suit: Suit.SPADE, rank: Rank.TWO, id: "s2" });
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(ascendingSameSuit(contextOf(two, pileWith("f", ace)))).toBe(true);
  });

  it("rejects a different suit", () => {
    const two = makePlayingCard({ suit: Suit.HEART, rank: Rank.TWO, id: "h2" });
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(ascendingSameSuit(contextOf(two, pileWith("f", ace)))).toBe(false);
  });
});

describe("suitFoundation", () => {
  it("starts on an Ace", () => {
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(suitFoundation(contextOf(ace, pileWith("foundation")))).toBe(true);
  });

  it("refuses to start on anything else", () => {
    expect(suitFoundation(contextOf(blackKing(), pileWith("foundation")))).toBe(
      false,
    );
  });

  it("refuses more than one card at a time", () => {
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });
    const context = contextOf(ace, pileWith("foundation"), { stackSize: 2 });

    expect(suitFoundation(context)).toBe(false);
  });
});
