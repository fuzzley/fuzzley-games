import { describe, it, expect, beforeEach } from "vitest";
import { SpiderGame } from "@/games/spider/spider_game";
import {
  SPIDER_ONE_SUIT,
  SpiderSuitCount,
  spiderDeck,
} from "@/games/spider/spider_deal";
import {
  FOUNDATION_COUNT,
  SpiderRole,
  TABLEAU_COUNT,
} from "@/games/spider/spider_zones";
import { deckCardIds } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  PlayingCard,
  Rank,
  Suit,
  playingCardFaceKey,
} from "@/engine/core/card/playing_card";

/** Empties the whole board so a test can build an exact position. */
function clearBoard(game: SpiderGame): void {
  for (const pile of game.piles) {
    pile.clear();
  }
}

/** Moves the card with the given id onto `pile`, face up unless stated. */
function place(
  game: SpiderGame,
  cardId: string,
  pile: { addCard(card: PlayingCard): void },
  faceUp = true,
): PlayingCard {
  const card = game.getCardById(cardId)!;
  game.getPileContainingCard(cardId)?.removeCard(card);
  card.faceUp = faceUp;
  pile.addCard(card);
  return card;
}

/** The instance id of a card, choosing which of the two decks it comes from. */
function id(suit: Suit, rank: Rank, deckIndex = 0): string {
  const face = playingCardFaceKey({ suit, rank });
  return deckIndex === 0 ? face : `${face}#${deckIndex}`;
}

/** Builds a complete King-to-Ace run of one suit on the given column. */
function buildCompleteRun(
  game: SpiderGame,
  column: number,
  suit = Suit.SPADE,
): void {
  for (const rank of [...ALL_RANKS].reverse()) {
    place(game, id(suit, rank), game.tableaus[column]);
  }
}

describe("SpiderGame", () => {
  let game: SpiderGame;

  beforeEach(() => {
    game = new SpiderGame();
    game.startNewGame();
  });

  describe("suit count", () => {
    it("plays 104 cards whichever variant is chosen", () => {
      const counts = [1, 2, 4].map((suits) => {
        const variant = new SpiderGame(
          deckCardIds(spiderDeck(suits as SpiderSuitCount)),
        );
        variant.startNewGame();
        return variant.cardsInPlay;
      });

      expect(counts).toEqual([104, 104, 104]);
    });

    it("uses one suit for the gentle variant", () => {
      const variant = new SpiderGame(deckCardIds(spiderDeck(1)));
      variant.startNewGame();

      const suits = new Set(
        variant.piles.flatMap((pile) => pile.getCards()).map((c) => c.suit),
      );
      expect(suits.size).toBe(1);
    });

    it("uses two suits for the middle variant", () => {
      const variant = new SpiderGame(deckCardIds(spiderDeck(2)));
      variant.startNewGame();

      const suits = new Set(
        variant.piles.flatMap((pile) => pile.getCards()).map((c) => c.suit),
      );
      expect(suits.size).toBe(2);
    });

    it("makes eight copies of each card in the one-suit variant", () => {
      const variant = new SpiderGame(deckCardIds(spiderDeck(1)));
      variant.startNewGame();

      const perFace = new Map<string, number>();
      for (const card of variant.piles.flatMap((p) => p.getCards())) {
        perFace.set(card.faceKey, (perFace.get(card.faceKey) ?? 0) + 1);
      }
      expect([...new Set(perFace.values())]).toEqual([8]);
    });

    /**
     * The board used to compute its card list from a deck specification of its
     * own, which disagreed with the game the moment a variant was chosen: it
     * looked for hearts in a game dealing only spades and threw part way
     * through making sprites.
     */
    it("names every card it holds, so a board can make a sprite for each", () => {
      const variant = new SpiderGame(deckCardIds(spiderDeck(1)));
      variant.startNewGame();

      const onBoard = variant.piles
        .flatMap((pile) => pile.getCards())
        .map((card) => card.id);
      expect([...variant.cardIds].sort()).toEqual([...onBoard].sort());
    });
  });

  describe("two decks", () => {
    it("plays with 104 cards", () => {
      expect(game.cardsInPlay).toBe(104);
    });

    it("holds two of every face", () => {
      const queen = playingCardFaceKey({ suit: Suit.HEART, rank: Rank.QUEEN });

      expect([
        game.getCardById(queen),
        game.getCardById(`${queen}#1`),
      ]).not.toContain(undefined);
    });

    it("gives the two copies distinct identities", () => {
      const first = game.getCardById(id(Suit.HEART, Rank.QUEEN, 0))!;
      const second = game.getCardById(id(Suit.HEART, Rank.QUEEN, 1))!;

      expect(first).not.toBe(second);
    });

    it("draws both copies from one face", () => {
      const first = game.getCardById(id(Suit.HEART, Rank.QUEEN, 0))!;
      const second = game.getCardById(id(Suit.HEART, Rank.QUEEN, 1))!;

      expect(second.faceKey).toBe(first.faceKey);
    });

    it("keeps the two copies in separate piles when they are", () => {
      clearBoard(game);
      const first = place(
        game,
        id(Suit.HEART, Rank.QUEEN, 0),
        game.tableaus[0],
      );
      const second = place(
        game,
        id(Suit.HEART, Rank.QUEEN, 1),
        game.tableaus[1],
      );

      expect([
        game.getPileContainingCard(first.id)?.id,
        game.getPileContainingCard(second.id)?.id,
      ]).toEqual([game.tableaus[0].id, game.tableaus[1].id]);
    });
  });

  describe("the board", () => {
    it("has ten columns", () => {
      expect(game.tableaus.length).toBe(TABLEAU_COUNT);
    });

    it("has eight foundations, one per run a full game completes", () => {
      expect(game.foundations.length).toBe(FOUNDATION_COUNT);
    });

    it("has no waste", () => {
      expect(game.pilesOfRole("waste")).toEqual([]);
    });
  });

  describe("the deal", () => {
    it("puts 54 cards on the board", () => {
      const dealt = game.tableaus.reduce((total, t) => total + t.size, 0);

      expect(dealt).toBe(54);
    });

    it("gives the first four columns six cards and the rest five", () => {
      expect(game.tableaus.map((t) => t.size)).toEqual([
        6, 6, 6, 6, 5, 5, 5, 5, 5, 5,
      ]);
    });

    it("leaves the other fifty on the stock", () => {
      expect(game.stock.size).toBe(50);
    });

    it("turns only the top card of each column face up", () => {
      const faceUp = game.tableaus.map((t) =>
        t.getCards().map((c) => c.faceUp),
      );

      expect(faceUp.every((column) => column.at(-1) === true)).toBe(true);
    });

    it("leaves the rest of each column face down", () => {
      const buried = game.tableaus.flatMap((t) => t.getCards().slice(0, -1));

      expect(buried.every((card) => !card.faceUp)).toBe(true);
    });
  });

  describe("building a column", () => {
    it("accepts a descending card of a different suit", () => {
      clearBoard(game);
      place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      const heartSeven = place(
        game,
        id(Suit.HEART, Rank.SEVEN),
        game.tableaus[1],
      );

      expect(game.moveCardToPile(heartSeven.id, game.tableaus[0].id)).toBe(
        true,
      );
    });

    it("refuses a card that does not descend", () => {
      clearBoard(game);
      place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      const two = place(game, id(Suit.HEART, Rank.TWO), game.tableaus[1]);

      expect(game.moveCardToPile(two.id, game.tableaus[0].id)).toBe(false);
    });

    it("accepts any card onto an empty column", () => {
      clearBoard(game);
      const two = place(game, id(Suit.HEART, Rank.TWO), game.tableaus[1]);

      expect(game.moveCardToPile(two.id, game.tableaus[0].id)).toBe(true);
    });
  });

  describe("lifting a run", () => {
    it("lifts a same-suit descending run", () => {
      clearBoard(game);
      const eight = place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      place(game, id(Suit.SPADE, Rank.SEVEN), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.NINE), game.tableaus[1]);

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(true);
    });

    it("refuses a mixed-suit run, even though the column accepted it", () => {
      clearBoard(game);
      const eight = place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      // A heart seven sits legally on a spade eight, and still cannot be
      // carried with it. That is the whole difficulty of Spider.
      place(game, id(Suit.HEART, Rank.SEVEN), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.NINE), game.tableaus[1]);

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("still lifts the top card of a mixed column, which leads a run of one", () => {
      clearBoard(game);
      place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      const seven = place(game, id(Suit.HEART, Rank.SEVEN), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.EIGHT), game.tableaus[1]);

      expect(game.moveCardToPile(seven.id, game.tableaus[1].id)).toBe(true);
    });
  });

  describe("dealing a row", () => {
    it("puts one card on every column", () => {
      const before = game.tableaus.map((t) => t.size);

      game.dealRow();

      expect(game.tableaus.map((t) => t.size)).toEqual(
        before.map((size) => size + 1),
      );
    });

    it("takes ten cards off the stock", () => {
      game.dealRow();

      expect(game.stock.size).toBe(40);
    });

    it("deals them face up", () => {
      game.dealRow();

      expect(game.tableaus.every((t) => t.topCard!.faceUp)).toBe(true);
    });

    it("counts as a single move", () => {
      game.dealRow();

      expect(game.state.moves).toBe(1);
    });

    it("refuses to deal onto an empty column", () => {
      game.tableaus[0].clear();

      expect(game.dealRow()).toBe(false);
    });

    it("refuses to deal from an empty stock", () => {
      game.stock.clear();

      expect(game.dealRow()).toBe(false);
    });

    it("is taken back by a single undo, all ten cards", () => {
      const before = game.tableaus.map((t) => t.size);
      game.dealRow();

      game.undo();

      expect(game.tableaus.map((t) => t.size)).toEqual(before);
    });

    it("returns all ten cards to the stock", () => {
      game.dealRow();

      game.undo();

      expect(game.stock.size).toBe(50);
    });

    it("turns the dealt cards back down", () => {
      game.dealRow();
      const dealt = game.stock.getCards().slice(-10);

      game.undo();

      expect(
        game.stock
          .getCards()
          .slice(-10)
          .every((c) => !c.faceUp),
      ).toBe(true);
      expect(dealt.length).toBe(10);
    });
  });

  describe("completing a run", () => {
    it("sends a finished King-to-Ace run to a foundation", () => {
      clearBoard(game);
      // Everything but the Ace, with the Ace waiting on another column.
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        place(game, id(Suit.SPADE, rank), game.tableaus[0]);
      }
      const ace = place(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.foundations[0].size).toBe(13);
    });

    it("clears the column it came from", () => {
      clearBoard(game);
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        place(game, id(Suit.SPADE, rank), game.tableaus[0]);
      }
      const ace = place(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.tableaus[0].isEmpty).toBe(true);
    });

    it("leaves a mixed-suit sequence alone", () => {
      clearBoard(game);
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        place(game, id(Suit.SPADE, rank), game.tableaus[0]);
      }
      // A heart Ace completes the sequence by rank but not by suit.
      const ace = place(game, id(Suit.HEART, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.foundations[0].isEmpty).toBe(true);
    });

    it("is taken back with the move that completed it, by one undo", () => {
      clearBoard(game);
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        place(game, id(Suit.SPADE, rank), game.tableaus[0]);
      }
      const ace = place(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);
      game.moveCardToPile(ace.id, game.tableaus[0].id);

      game.undo();

      expect([
        game.foundations[0].size,
        game.tableaus[0].size,
        game.getPileContainingCard(ace.id)?.id,
      ]).toEqual([0, 12, game.tableaus[1].id]);
    });

    it("turns a card the collection exposed back down on undo", () => {
      clearBoard(game);
      const buried = place(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        place(game, id(Suit.SPADE, rank), game.tableaus[0]);
      }
      const ace = place(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);
      game.moveCardToPile(ace.id, game.tableaus[0].id);
      expect(buried.faceUp).toBe(true);

      game.undo();

      expect(buried.faceUp).toBe(false);
    });
  });

  describe("turning over an exposed card", () => {
    it("turns up the card a move uncovered", () => {
      clearBoard(game);
      const buried = place(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      const eight = place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.NINE), game.tableaus[1]);

      game.moveCardToPile(eight.id, game.tableaus[1].id);

      expect(buried.faceUp).toBe(true);
    });

    it("turns it back down on undo", () => {
      clearBoard(game);
      const buried = place(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      const eight = place(game, id(Suit.SPADE, Rank.EIGHT), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.NINE), game.tableaus[1]);
      game.moveCardToPile(eight.id, game.tableaus[1].id);

      game.undo();

      expect(buried.faceUp).toBe(false);
    });
  });

  describe("winning", () => {
    it("announces the win once all eight runs are collected", () => {
      const oneSuit = new SpiderGame(deckCardIds(SPIDER_ONE_SUIT));
      oneSuit.startNewGame();
      let won = false;
      oneSuit.on("game-won", () => {
        won = true;
      });
      clearBoard(oneSuit);

      // Seven runs already collected, and the eighth one move from done.
      for (let deck = 0; deck < 7; deck++) {
        for (const rank of [...ALL_RANKS].reverse()) {
          const card = oneSuit.getCardById(
            deck === 0
              ? playingCardFaceKey({ suit: Suit.SPADE, rank })
              : `${playingCardFaceKey({ suit: Suit.SPADE, rank })}#${deck}`,
          )!;
          card.faceUp = true;
          oneSuit.foundations[deck].addCard(card);
        }
      }
      for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
        const card = oneSuit.getCardById(
          `${playingCardFaceKey({ suit: Suit.SPADE, rank })}#7`,
        )!;
        card.faceUp = true;
        oneSuit.tableaus[0].addCard(card);
      }
      const lastAce = oneSuit.getCardById(
        `${playingCardFaceKey({ suit: Suit.SPADE, rank: Rank.ACE })}#7`,
      )!;
      lastAce.faceUp = true;
      oneSuit.tableaus[1].addCard(lastAce);

      oneSuit.moveCardToPile(lastAce.id, oneSuit.tableaus[0].id);

      expect(won).toBe(true);
    });

    it("does not announce a win with runs still out", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      clearBoard(game);
      buildCompleteRun(game, 0);

      game.dealRow();

      expect(won).toBe(false);
    });
  });

  describe("auto-move", () => {
    it("never sends a card to a foundation, which is not a destination", () => {
      clearBoard(game);
      const ace = place(game, id(Suit.SPADE, Rank.ACE), game.tableaus[0]);
      place(game, id(Suit.HEART, Rank.TWO), game.tableaus[1]);

      game.autoMoveCard(ace.id);

      expect(game.getPileContainingCard(ace.id)?.role).toBe(SpiderRole.TABLEAU);
    });
  });
});
