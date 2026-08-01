import { describe, it, expect, beforeEach } from "vitest";
import { deckCardIds } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  DeckCardId,
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { ScorpionGame } from "@/games/scorpion/scorpion_game";
import {
  FOUNDATION_COUNT,
  ScorpionRole,
  TABLEAU_COUNT,
} from "@/games/scorpion/scorpion_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** One suit of thirteen cards: a short deck, and one run from being won. */
const ONE_SUIT = deckCardIds({
  suits: [Suit.SPADE],
  ranks: ALL_RANKS,
  copies: 1,
});

/**
 * A dealt game with a fixed shuffle, so every deal in this file is the same one.
 *
 * @param cardIds The deck to deal. Defaults to a standard 52.
 */
function dealtGame(cardIds?: ReadonlyArray<DeckCardId>): ScorpionGame {
  const game = new ScorpionGame(cardIds, sequenceRandom([]));
  game.startNewGame();
  return game;
}

/** The instance id of a card in this single-deck game. */
function id(suit: Suit, rank: Rank): string {
  return playingCardInstanceId({ suit, rank });
}

/** Which side up each card of a column is sitting, bottom-first. */
function faceUpFlags(game: ScorpionGame, column: number): boolean[] {
  return game.tableaus[column].getCards().map((card) => card.faceUp);
}

/**
 * Stacks King down to Two of `suit` face up on `column`, leaving the Ace out so
 * a single move can finish the run.
 */
function stackKingToTwo(
  game: ScorpionGame,
  column: number,
  suit = Suit.SPADE,
): void {
  for (const rank of [...ALL_RANKS].reverse().slice(0, 12)) {
    relocate(game, id(suit, rank), game.tableaus[column]);
  }
}

/**
 * Finishes a spade run on column 0 by moving its Ace there with a heart Nine
 * already resting on the Ace, so the run ends up one card below the top. Leaves
 * a heart Ten on column 2 for the Nine to move on to.
 */
function buryRunUnderNine(game: ScorpionGame): void {
  emptyBoard(game);
  stackKingToTwo(game, 0);
  const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);
  relocate(game, id(Suit.HEART, Rank.NINE), game.tableaus[1]);
  relocate(game, id(Suit.HEART, Rank.TEN), game.tableaus[2]);
  game.moveCardToPile(ace.id, game.tableaus[0].id);
}

describe("ScorpionGame", () => {
  let game: ScorpionGame;

  beforeEach(() => {
    game = dealtGame();
  });

  describe("the board", () => {
    it("has seven columns", () => {
      expect(game.tableaus.length).toBe(TABLEAU_COUNT);
    });

    it("has four foundations, one per run a full game completes", () => {
      expect(game.foundations.length).toBe(FOUNDATION_COUNT);
    });

    it("has no waste, because nothing is ever drawn", () => {
      expect(game.pilesOfRole("waste")).toEqual([]);
    });
  });

  describe("the deal", () => {
    it("gives every column seven cards", () => {
      expect(game.tableaus.map((t) => t.size)).toEqual([7, 7, 7, 7, 7, 7, 7]);
    });

    it("buries the first three cards of each of the first four columns", () => {
      const hidden = [0, 1, 2, 3].map((column) => faceUpFlags(game, column));

      expect(hidden).toEqual([
        [false, false, false, true, true, true, true],
        [false, false, false, true, true, true, true],
        [false, false, false, true, true, true, true],
        [false, false, false, true, true, true, true],
      ]);
    });

    it("deals the last three columns entirely face up", () => {
      const open = [4, 5, 6].map((column) => faceUpFlags(game, column));

      expect(open).toEqual([
        [true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true],
      ]);
    });

    it("leaves the last three cards on the stock", () => {
      expect(game.stock.size).toBe(3);
    });

    it("puts all fifty-two distinct cards on the board", () => {
      const onBoard = game.piles
        .flatMap((pile) => pile.getCards())
        .map((card) => card.id);

      expect(new Set(onBoard).size).toBe(52);
    });

    it("runs out gracefully on a deck too short to fill the board", () => {
      const short = dealtGame(ONE_SUIT);

      expect(short.tableaus.map((t) => t.size)).toEqual([7, 6, 0, 0, 0, 0, 0]);
    });

    it("leaves the stock empty when the deal used up the deck", () => {
      const short = dealtGame(ONE_SUIT);

      expect(short.stock.isEmpty).toBe(true);
    });

    it("deals the same board again on restart", () => {
      const before = game.tableaus.map((t) => t.getCards().map((c) => c.id));

      game.restartGame();

      expect(game.tableaus.map((t) => t.getCards().map((c) => c.id))).toEqual(
        before,
      );
    });
  });

  describe("lifting a card", () => {
    it("lets go of a face-up card with a jumble resting on it", () => {
      emptyBoard(game);
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
      );
      relocate(game, id(Suit.HEART, Rank.TWO), game.tableaus[0]);
      relocate(game, id(Suit.CLUB, Rank.FIVE), game.tableaus[0]);

      expect(game.isCardDraggable(eight)).toBe(true);
    });

    it("carries the whole jumble to the target", () => {
      emptyBoard(game);
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
      );
      relocate(game, id(Suit.HEART, Rank.TWO), game.tableaus[0]);
      relocate(game, id(Suit.CLUB, Rank.FIVE), game.tableaus[0]);
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[1]);

      game.moveCardToPile(eight.id, game.tableaus[1].id);

      expect(game.tableaus[1].getCards().map((c) => c.id)).toEqual([
        id(Suit.SPADE, Rank.NINE),
        id(Suit.SPADE, Rank.EIGHT),
        id(Suit.HEART, Rank.TWO),
        id(Suit.CLUB, Rank.FIVE),
      ]);
    });

    it("keeps a face-down card where it is", () => {
      emptyBoard(game);
      const buried = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
        false,
      );

      expect(game.isCardDraggable(buried)).toBe(false);
    });

    it("turns up the card a move uncovered", () => {
      emptyBoard(game);
      const buried = relocate(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
      );
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[1]);

      game.moveCardToPile(eight.id, game.tableaus[1].id);

      expect(buried.faceUp).toBe(true);
    });
  });

  describe("building a column", () => {
    it("accepts the next card down in the same suit", () => {
      emptyBoard(game);
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[0]);
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[1],
      );

      expect(game.moveCardToPile(eight.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses the next card down in another suit", () => {
      emptyBoard(game);
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[0]);
      const eight = relocate(
        game,
        id(Suit.HEART, Rank.EIGHT),
        game.tableaus[1],
      );

      expect(game.moveCardToPile(eight.id, game.tableaus[0].id)).toBe(false);
    });

    it("refuses anything but a King onto an empty column", () => {
      emptyBoard(game);
      const queen = relocate(
        game,
        id(Suit.SPADE, Rank.QUEEN),
        game.tableaus[1],
      );

      expect(game.moveCardToPile(queen.id, game.tableaus[0].id)).toBe(false);
    });

    it("accepts a King onto an empty column", () => {
      emptyBoard(game);
      const king = relocate(game, id(Suit.SPADE, Rank.KING), game.tableaus[1]);

      expect(game.moveCardToPile(king.id, game.tableaus[0].id)).toBe(true);
    });
  });

  describe("dealing the stock", () => {
    it("puts one card on each of the first three columns", () => {
      game.dealStock();

      expect(game.tableaus.map((t) => t.size)).toEqual([8, 8, 8, 7, 7, 7, 7]);
    });

    it("empties the stock in a single press", () => {
      game.dealStock();

      expect(game.stock.isEmpty).toBe(true);
    });

    it("deals them face up", () => {
      game.dealStock();

      expect([0, 1, 2].map((c) => game.tableaus[c].topCard!.faceUp)).toEqual([
        true,
        true,
        true,
      ]);
    });

    it("counts as a single move", () => {
      game.dealStock();

      expect(game.state.moves).toBe(1);
    });

    it("returns all three cards to the stock on one undo", () => {
      game.dealStock();

      game.undo();

      expect(game.stock.size).toBe(3);
    });

    it("takes all three columns back on that same undo", () => {
      game.dealStock();

      game.undo();

      expect(game.tableaus.map((t) => t.size)).toEqual([7, 7, 7, 7, 7, 7, 7]);
    });

    it("turns the dealt cards back down", () => {
      game.dealStock();

      game.undo();

      expect(game.stock.getCards().every((card) => !card.faceUp)).toBe(true);
    });

    /**
     * The one place copying Spider would be wrong: Spider refuses to deal while
     * a column is empty, because a card dealt there is unrecoverable. Scorpion
     * has no such rule.
     */
    it("deals happily while a column is empty", () => {
      game.tableaus[6].clear();

      expect(game.dealStock()).toBe(true);
    });

    it("refuses to deal once the stock is spent", () => {
      game.dealStock();

      expect(game.dealStock()).toBe(false);
    });
  });

  describe("completing a run", () => {
    it("sends a finished King-to-Ace run to a foundation", () => {
      emptyBoard(game);
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.foundations[0].size).toBe(13);
    });

    it("clears the column it came from", () => {
      emptyBoard(game);
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.tableaus[0].isEmpty).toBe(true);
    });

    it("leaves a King-to-Two run alone until its Ace arrives", () => {
      emptyBoard(game);
      stackKingToTwo(game, 0);
      relocate(game, id(Suit.HEART, Rank.TEN), game.tableaus[1]);
      const nine = relocate(game, id(Suit.HEART, Rank.NINE), game.tableaus[2]);

      game.moveCardToPile(nine.id, game.tableaus[1].id);

      expect(game.foundations[0].isEmpty).toBe(true);
    });

    it("turns over the card the run's departure exposed", () => {
      emptyBoard(game);
      const buried = relocate(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(buried.faceUp).toBe(true);
    });

    it("is taken back with the move that finished it, by one undo", () => {
      emptyBoard(game);
      relocate(game, id(Suit.CLUB, Rank.FOUR), game.tableaus[0], false);
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);
      game.moveCardToPile(ace.id, game.tableaus[0].id);

      game.undo();

      expect([
        game.foundations[0].size,
        game.tableaus[0].size,
        game.getPileContainingCard(ace.id)?.id,
      ]).toEqual([0, 13, game.tableaus[1].id]);
    });

    it("re-hides the card its departure exposed, on that same undo", () => {
      emptyBoard(game);
      const buried = relocate(
        game,
        id(Suit.CLUB, Rank.FOUR),
        game.tableaus[0],
        false,
      );
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);
      game.moveCardToPile(ace.id, game.tableaus[0].id);

      game.undo();

      expect(buried.faceUp).toBe(false);
    });

    it("scores nothing, because Scorpion is played against the deal", () => {
      emptyBoard(game);
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(game.state.score).toBe(0);
    });
  });

  /**
   * The Yukon grab rule lets a player lift an Ace that already has a card
   * resting on it and drop the pair onto the Two, finishing a run that is not at
   * the top of its column. Only the top thirteen cards are inspected, so the run
   * stays where it is — which is how the game is conventionally played, and
   * corrects itself the moment the covering card moves away.
   */
  describe("a run buried under a later card", () => {
    it("is not collected while the covering card sits on it", () => {
      buryRunUnderNine(game);

      expect(game.foundations[0].isEmpty).toBe(true);
    });

    it("stays in its column, run and cover together", () => {
      buryRunUnderNine(game);

      expect(game.tableaus[0].size).toBe(14);
    });

    it("is collected as soon as the covering card moves away", () => {
      buryRunUnderNine(game);

      game.moveCardToPile(id(Suit.HEART, Rank.NINE), game.tableaus[2].id);

      expect(game.foundations[0].size).toBe(13);
    });

    it("leaves the column empty once the run has gone", () => {
      buryRunUnderNine(game);

      game.moveCardToPile(id(Suit.HEART, Rank.NINE), game.tableaus[2].id);

      expect(game.tableaus[0].isEmpty).toBe(true);
    });
  });

  describe("winning", () => {
    it("announces the win once every card has reached a foundation", () => {
      const short = dealtGame(ONE_SUIT);
      let won = false;
      short.on("game-won", () => {
        won = true;
      });
      emptyBoard(short);
      stackKingToTwo(short, 0);
      const ace = relocate(short, id(Suit.SPADE, Rank.ACE), short.tableaus[1]);

      short.moveCardToPile(ace.id, short.tableaus[0].id);

      expect(won).toBe(true);
    });

    it("stays quiet while runs are still out", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      emptyBoard(game);
      stackKingToTwo(game, 0);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[1]);

      game.moveCardToPile(ace.id, game.tableaus[0].id);

      expect(won).toBe(false);
    });
  });

  describe("auto-move", () => {
    it("sends a card to the column that will take it", () => {
      emptyBoard(game);
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[3]);
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
      );

      game.autoMoveCard(eight.id);

      expect(game.getPileContainingCard(eight.id)?.id).toBe(
        game.tableaus[3].id,
      );
    });

    it("never sends a card to a foundation, which is not a destination", () => {
      emptyBoard(game);
      const ace = relocate(game, id(Suit.SPADE, Rank.ACE), game.tableaus[0]);
      relocate(game, id(Suit.SPADE, Rank.TWO), game.tableaus[1]);

      game.autoMoveCard(ace.id);

      expect(game.getPileContainingCard(ace.id)?.role).toBe(
        ScorpionRole.TABLEAU,
      );
    });
  });
});
