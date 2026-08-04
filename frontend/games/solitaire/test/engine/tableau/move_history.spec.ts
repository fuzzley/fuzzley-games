import { describe, it, expect, beforeEach } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { AppliedMove } from "@/engine/tableau/move";
import { HistoryBoard, MoveHistory } from "@/engine/tableau/move_history";
import { makePlayingCard } from "@test/support/card_builder";

/**
 * The history exercised on its own, which is the point of it having been split
 * out of {@link TableGame}: undo used to be reachable only by dealing a real
 * game and playing it, so a test of "does a consequence come back before its
 * cause" had to be written as a test of Spider.
 */
class TestBoard implements HistoryBoard {
  readonly from = new CardPile<PlayingCard>("from", "column");
  readonly to = new CardPile<PlayingCard>("to", "column");

  get piles(): readonly CardPile<PlayingCard>[] {
    return [this.from, this.to];
  }

  private readonly cards = new Map<string, PlayingCard>();

  /** Adds a face-up card to the source pile and returns it. */
  deal(rank: Rank): PlayingCard {
    const card = makePlayingCard({
      suit: Suit.SPADE,
      rank,
      faceUp: true,
      id: `card-${rank}`,
    });
    this.cards.set(card.id, card);
    this.from.addCard(card);
    return card;
  }

  getPileById(pileId: string): CardPile<PlayingCard> | undefined {
    return this.piles.find((pile) => pile.id === pileId);
  }

  getCardById(cardId: string): PlayingCard | undefined {
    return this.cards.get(cardId);
  }

  /** Moves a card across, as a game's own move path would. */
  relocate(card: PlayingCard): void {
    this.from.removeCard(card);
    this.to.addCard(card);
  }
}

/** An applied move that carried one card from `from` to `to`. */
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
    history = new MoveHistory(board);
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
   * A consequence has to be undone before its cause: a Spider run that left for
   * a foundation comes back before the move that completed it, or it would be
   * put back onto a column that has not yet received the card beneath it.
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

  it("drops everything when cleared", () => {
    const card = board.deal(Rank.KING);
    board.relocate(card);
    history.record(moved(card.id));

    history.clear();

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
