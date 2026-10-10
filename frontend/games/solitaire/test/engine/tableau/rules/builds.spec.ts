import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { BoardQuery } from "@/engine/tableau/rules/board_query";
import { PlacementContext } from "@/engine/tableau/rules/placement";
import {
  ascendingAnySuit,
  ascendingSameSuit,
  ascendingSameSuitWrapping,
  baseRankFoundation,
  baseRankOf,
  descendingAlternatingColor,
  descendingAlternatingColorWrapping,
  descendingAnySuit,
  descendingAnySuitWrapping,
  descendingDifferentSuit,
  descendingSameColor,
  descendingSameSuit,
  descendingSameSuitWrapping,
  suitFoundation,
} from "@/engine/tableau/rules/builds";
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

const blackQueen = () =>
  makePlayingCard({ suit: Suit.CLUB, rank: Rank.QUEEN, id: "cq" });

const spadeQueen = () =>
  makePlayingCard({ suit: Suit.SPADE, rank: Rank.QUEEN, id: "sq" });

/** Returns a card of the given suit and rank, with an id naming both. */
function card(suit: Suit, rank: Rank): PlayingCard {
  return makePlayingCard({ suit, rank, id: `${suit}-${rank}`, faceUp: true });
}

/** Returns a board whose foundations are the given piles. */
function boardOfFoundations(
  ...foundations: CardPile<PlayingCard>[]
): BoardQuery {
  return {
    pile: () => undefined,
    pilesByRole: (role) => (role === "foundation" ? foundations : []),
    emptyCount: () => 0,
  };
}

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

describe("descendingSameColor", () => {
  it("accepts the next card down in the other suit of the same color", () => {
    const context = contextOf(blackQueen(), pileWith("tableau", blackKing()));

    expect(descendingSameColor(context)).toBe(true);
  });

  it("rejects the other color, which the Klondike rule would take", () => {
    const context = contextOf(redQueen(), pileWith("tableau", blackKing()));

    expect(descendingSameColor(context)).toBe(false);
  });

  it("rejects an empty pile, which byEmptiness is expected to have handled", () => {
    expect(descendingSameColor(contextOf(blackQueen(), pileWith("t")))).toBe(
      false,
    );
  });
});

describe("descendingDifferentSuit", () => {
  it("accepts the next card down in another suit of the same color", () => {
    const context = contextOf(blackQueen(), pileWith("tableau", blackKing()));

    expect(descendingDifferentSuit(context)).toBe(true);
  });

  it("accepts the next card down in the other color", () => {
    const context = contextOf(redQueen(), pileWith("tableau", blackKing()));

    expect(descendingDifferentSuit(context)).toBe(true);
  });

  it("rejects the same suit, which is the one suit it refuses", () => {
    const context = contextOf(spadeQueen(), pileWith("tableau", blackKing()));

    expect(descendingDifferentSuit(context)).toBe(false);
  });

  it("rejects an empty pile, which byEmptiness is expected to have handled", () => {
    expect(descendingDifferentSuit(contextOf(redQueen(), pileWith("t")))).toBe(
      false,
    );
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

describe("ascendingSameSuitWrapping", () => {
  it("builds up in suit", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.NINE));

    const accepted = ascendingSameSuitWrapping(
      contextOf(card(Suit.HEART, Rank.TEN), pile),
    );

    expect(accepted).toBe(true);
  });

  it("puts an Ace on a King of its suit", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.KING));

    const accepted = ascendingSameSuitWrapping(
      contextOf(card(Suit.HEART, Rank.ACE), pile),
    );

    expect(accepted).toBe(true);
  });

  it("refuses another suit", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.KING));

    const accepted = ascendingSameSuitWrapping(
      contextOf(card(Suit.SPADE, Rank.ACE), pile),
    );

    expect(accepted).toBe(false);
  });
});

describe("ascendingAnySuit", () => {
  it("builds up regardless of suit", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.NINE));

    const accepted = ascendingAnySuit(
      contextOf(card(Suit.CLUB, Rank.TEN), pile),
    );

    expect(accepted).toBe(true);
  });

  it("puts nothing on a King", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.KING));

    const accepted = ascendingAnySuit(
      contextOf(card(Suit.HEART, Rank.ACE), pile),
    );

    expect(accepted).toBe(false);
  });
});

describe("descending wrapping builds", () => {
  it("puts a King of the same suit on an Ace", () => {
    const pile = pileWith("tableau", card(Suit.HEART, Rank.ACE));

    const accepted = descendingSameSuitWrapping(
      contextOf(card(Suit.HEART, Rank.KING), pile),
    );

    expect(accepted).toBe(true);
  });

  it("puts a King of the other colour on an Ace", () => {
    const pile = pileWith("tableau", card(Suit.HEART, Rank.ACE));

    const accepted = descendingAlternatingColorWrapping(
      contextOf(card(Suit.SPADE, Rank.KING), pile),
    );

    expect(accepted).toBe(true);
  });

  it("refuses a King of the same colour on an Ace", () => {
    const pile = pileWith("tableau", card(Suit.HEART, Rank.ACE));

    const accepted = descendingAlternatingColorWrapping(
      contextOf(card(Suit.DIAMOND, Rank.KING), pile),
    );

    expect(accepted).toBe(false);
  });

  it("puts a King of any suit on an Ace", () => {
    const pile = pileWith("tableau", card(Suit.HEART, Rank.ACE));

    const accepted = descendingAnySuitWrapping(
      contextOf(card(Suit.HEART, Rank.KING), pile),
    );

    expect(accepted).toBe(true);
  });
});

describe("baseRankOf", () => {
  it("reads the bottom card of the first foundation holding any", () => {
    const board = boardOfFoundations(
      pileWith("foundation"),
      pileWith(
        "foundation",
        card(Suit.HEART, Rank.SEVEN),
        card(Suit.HEART, Rank.EIGHT),
      ),
    );

    expect(baseRankOf(board, "foundation")).toBe(Rank.SEVEN);
  });

  it("has no answer while every foundation is empty", () => {
    const board = boardOfFoundations(pileWith("foundation"));

    expect(baseRankOf(board, "foundation")).toBeUndefined();
  });
});

describe("baseRankFoundation", () => {
  const rule = baseRankFoundation("foundation");

  /** Asks the rule about a card landing on an empty foundation. */
  function startsEmptyWith(placed: PlayingCard, board: BoardQuery): boolean {
    return rule(contextOf(placed, pileWith("foundation"), { board }));
  }

  it("starts an empty foundation with the base rank", () => {
    const board = boardOfFoundations(
      pileWith("foundation", card(Suit.HEART, Rank.SEVEN)),
    );

    expect(startsEmptyWith(card(Suit.CLUB, Rank.SEVEN), board)).toBe(true);
  });

  it("refuses any other rank on an empty foundation", () => {
    const board = boardOfFoundations(
      pileWith("foundation", card(Suit.HEART, Rank.SEVEN)),
    );

    expect(startsEmptyWith(card(Suit.CLUB, Rank.ACE), board)).toBe(false);
  });

  it("lets any card start the first foundation", () => {
    const board = boardOfFoundations(pileWith("foundation"));

    expect(startsEmptyWith(card(Suit.CLUB, Rank.FIVE), board)).toBe(true);
  });

  it("builds up in suit past the King to the Ace", () => {
    const pile = pileWith("foundation", card(Suit.HEART, Rank.KING));

    const accepted = rule(
      contextOf(card(Suit.HEART, Rank.ACE), pile, {
        board: boardOfFoundations(pile),
      }),
    );

    expect(accepted).toBe(true);
  });
});
