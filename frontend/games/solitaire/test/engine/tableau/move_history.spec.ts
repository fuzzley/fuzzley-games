import { describe, it, expect, beforeEach } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { AppliedMove } from "@/engine/tableau/move";
import { MoveHistory } from "@/engine/tableau/move_history";
import { anyCard } from "@/engine/tableau/rules";
import { Tabletop } from "@/engine/tableau/tabletop";
import { ZoneSpec } from "@/engine/tableau/zone";

/** Returns a pile's zone: any card goes, and nothing is drawn. */
function zone(id: string): ZoneSpec {
  return {
    id,
    role: "column",
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
  };
}

/** Gives a history two real piles to move cards between, without any game. */
class TestBoard {
  private readonly registry = new CardRegistry();

  /** The table the history puts actions back on. */
  readonly tabletop = new Tabletop([zone("from"), zone("to")], this.registry);

  /** The pile cards start in. */
  get from(): CardPile<PlayingCard> {
    return this.tabletop.requirePile("from");
  }

  /** The pile cards are relocated to. */
  get to(): CardPile<PlayingCard> {
    return this.tabletop.requirePile("to");
  }

  /** Adds a face-up card to the source pile and returns it. */
  deal(rank: Rank): PlayingCard {
    const card = this.registry.getOrCreate({ suit: Suit.SPADE, rank });
    this.tabletop.place(card, this.from, true);
    return card;
  }

  /** Moves a card across, as a game's own move path would. */
  relocate(card: PlayingCard): void {
    this.tabletop.relocate([card], this.to);
  }
}

/** Returns an applied move that carried one card from `from` to `to`. */
function moved(cardId: string, overrides: Partial<AppliedMove> = {}) {
  return {
    kind: "move" as const,
    transfers: [
      {
        cardIds: [cardId],
        fromPileId: "from",
        toPileId: "to",
        faceUpBefore: true,
      },
    ],
    scoreDelta: 0,
    flippedCardIds: [],
    ...overrides,
  };
}

describe("MoveHistory", () => {
  let board: TestBoard;
  let history: MoveHistory;

  beforeEach(() => {
    board = new TestBoard();
    history = new MoveHistory(board.tabletop);
  });

  it("has nothing to take back to begin with", () => {
    expect([history.canUndo, history.depth]).toEqual([false, 0]);
  });

  it("counts the actions it has recorded", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);

    history.record(moved(card.id));

    expect([history.canUndo, history.depth]).toEqual([true, 1]);
  });

  it("puts a relocated card back where it came from", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id));

    history.takeBack();

    expect([board.from.size, board.to.size]).toEqual([1, 0]);
  });

  it("turns an exposed card back down", () => {
    const buried = board.deal(Rank.QUEEN);
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id, { flippedCardIds: [buried.id] }));

    history.takeBack();

    expect(buried.faceUp).toBe(false);
  });

  /*
   * A consequence is undone before its cause, or a completed run would go back
   * onto a column still missing the card beneath it.
   */
  it("reverses an action's transfers last one first", () => {
    const first = board.deal(Rank.KING);
    const second = board.deal(Rank.QUEEN);
    board.relocate(first);
    board.relocate(second);
    history.record({
      kind: "move",
      transfers: [
        {
          cardIds: [first.id],
          fromPileId: "from",
          toPileId: "to",
          faceUpBefore: true,
        },
        {
          cardIds: [second.id],
          fromPileId: "from",
          toPileId: "to",
          faceUpBefore: true,
        },
      ],
      scoreDelta: 0,
      flippedCardIds: [],
    });

    history.takeBack();

    // The second transfer is reversed first, so its card lands back on the
    // source pile before the first transfer's does.
    expect(board.from.getCards().map((card) => card.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("reports nothing to take back once the history is spent", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id));
    history.takeBack();

    expect(history.takeBack()).toBeNull();
  });

  it("counts the actions of each kind it holds", () => {
    const card = board.deal(Rank.KING);
    history.record(moved(card.id, { kind: "draw" }));
    history.record(moved(card.id, { kind: "draw" }));
    history.record(moved(card.id, { kind: "recycle" }));

    expect([history.count("draw"), history.count("recycle")]).toEqual([2, 1]);
  });

  it("takes an action out of its count when it is taken back", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id, { kind: "recycle" }));

    history.takeBack();

    expect(history.count("recycle")).toBe(0);
  });

  it("counts a loaded history afresh", () => {
    const card = board.deal(Rank.KING);
    history.record(moved(card.id, { kind: "draw" }));

    history.load([moved(card.id, { kind: "recycle" })]);

    expect([history.count("draw"), history.count("recycle")]).toEqual([0, 1]);
  });

  it("drops everything when loaded with nothing", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id));

    history.load([]);

    expect([history.canUndo, history.depth]).toEqual([false, 0]);
  });

  it("tells a follower which cards an action relocated", () => {
    const relocated: string[][] = [];
    history.onCardsRelocated((cardIds) => relocated.push([...cardIds]));
    const card = board.deal(Rank.KING);
    board.relocate(card);

    history.record(moved(card.id));

    expect(relocated).toEqual([[card.id]]);
  });

  it("stops telling a follower that has unsubscribed", () => {
    const relocated: string[][] = [];
    const unsubscribe = history.onCardsRelocated((cardIds) =>
      relocated.push([...cardIds]),
    );
    const card = board.deal(Rank.KING);
    board.relocate(card);

    unsubscribe();
    history.record(moved(card.id));

    expect(relocated).toEqual([]);
  });
});
