import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { BoardQuery } from "@/engine/tableau/rules/board_query";
import {
  PlacementContext,
  PlacementRule,
  all,
  any,
  anyCard,
  byEmptiness,
  cardIs,
  hasRank,
  maxStackSize,
  never,
  singleCardOnly,
} from "@/engine/tableau/rules/placement";
import { makePlayingCard } from "@test/support/card_builder";

function pileWith(
  role: string,
  ...cards: PlayingCard[]
): CardPile<PlayingCard> {
  const pile = new CardPile<PlayingCard>("pile", role);
  for (const card of cards) pile.addCard(card);
  return pile;
}

/** Returns a board with the stated number of empty piles in each role. */
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
  // FreeCell's supermove limit, which needs to see the whole board.
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
