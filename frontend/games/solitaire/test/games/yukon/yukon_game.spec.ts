import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import {
  DeckCardId,
  PlayingCard,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";
import { YukonGame } from "@/games/yukon/yukon_game";
import {
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  yukonZoneSpecs,
} from "@/games/yukon/yukon_zones";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A dealt game of the given variant.
 *
 * The shuffle is fixed rather than random so a failure is reproducible; which
 * permutation it produces never matters, because every test that cares about
 * particular cards clears the board and places them itself.
 */
function dealtGame(variant: YukonVariant = YukonVariant.YUKON): YukonGame {
  const game = new YukonGame(ALL_PLAYING_CARD_IDS, sequenceRandom([]), variant);
  game.startNewGame();
  return game;
}

/** A dealt game holding only the given cards, for short-deck behaviour. */
function shortDeckGame(cardIds: readonly DeckCardId[]): YukonGame {
  const game = new YukonGame(cardIds, sequenceRandom([]));
  game.startNewGame();
  return game;
}

/** How many cards each column shows, which is what the deal shape is about. */
function faceUpCounts(game: YukonGame): number[] {
  return game.tableaus.map(
    (tableau) => tableau.getCards().filter((card) => card.faceUp).length,
  );
}

/** The id of every card the deal put on the board, column by column. */
function dealtCardIds(game: YukonGame): string[] {
  return game.tableaus.flatMap((tableau) =>
    tableau.getCards().map((card) => card.id),
  );
}

describe("YukonGame", () => {
  let game: YukonGame;

  beforeEach(() => {
    game = dealtGame();
  });

  describe("the board", () => {
    it("has four foundations and seven columns", () => {
      expect([game.foundations.length, game.tableaus.length]).toEqual([
        FOUNDATION_COUNT,
        TABLEAU_COUNT,
      ]);
    });

    it("has no stock, because the whole deck is dealt at the start", () => {
      expect(game.pilesOfRole("stock")).toEqual([]);
    });

    it("has no waste either", () => {
      expect(game.pilesOfRole("waste")).toEqual([]);
    });
  });

  describe("the deal", () => {
    it("grows each column by one, from one card to eleven", () => {
      expect(game.tableaus.map((tableau) => tableau.size)).toEqual([
        1, 6, 7, 8, 9, 10, 11,
      ]);
    });

    it("shows five cards on every column but the first", () => {
      expect(faceUpCounts(game)).toEqual([1, 5, 5, 5, 5, 5, 5]);
    });

    it("puts all 52 cards on the board", () => {
      expect(dealtCardIds(game).length).toBe(52);
    });

    it("deals each card exactly once", () => {
      expect(new Set(dealtCardIds(game)).size).toBe(52);
    });

    it("replays the same deal on a restart", () => {
      const before = game.tableaus.map((tableau) =>
        tableau.getCards().map((card) => card.id),
      );

      game.restartGame();

      expect(
        game.tableaus.map((tableau) =>
          tableau.getCards().map((card) => card.id),
        ),
      ).toEqual(before);
    });

    it("deals as far as a short deck reaches and stops", () => {
      const short = shortDeckGame([
        { suit: Suit.SPADE, rank: Rank.ACE },
        { suit: Suit.SPADE, rank: Rank.TWO },
        { suit: Suit.SPADE, rank: Rank.THREE },
      ]);

      expect(short.tableaus.map((tableau) => tableau.size)).toEqual([
        1, 2, 0, 0, 0, 0, 0,
      ]);
    });
  });

  describe("lifting a buried card", () => {
    /**
     * A Nine of Spades with an unrelated Two resting on it, and a Ten of
     * Diamonds waiting on the next column. The Nine is buried under a card that
     * does not follow it in any sequence, which no other game here would let a
     * player touch.
     */
    function buriedOutOfSequence(): void {
      emptyBoard(game);
      relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-hearts-2", game.tableaus[0]);
      relocate(game, "card-diamonds-10", game.tableaus[1]);
    }

    it("moves a face-up card that is out of sequence, which is the whole game", () => {
      buriedOutOfSequence();
      const nine = game.getCardById("card-spades-9")!;

      expect(game.moveCardToPile(nine.id, game.tableaus[1].id)).toBe(true);
    });

    it("carries whatever is resting on it, ordered or not", () => {
      buriedOutOfSequence();
      const nine = game.getCardById("card-spades-9")!;

      game.moveCardToPile(nine.id, game.tableaus[1].id);

      expect(game.tableaus[1].getCards().map((card) => card.id)).toEqual([
        "card-diamonds-10",
        "card-spades-9",
        "card-hearts-2",
      ]);
    });

    it("offers the buried card to a drag", () => {
      buriedOutOfSequence();
      const nine = game.getCardById("card-spades-9")!;

      expect(game.isCardDraggable(nine)).toBe(true);
    });

    it("refuses to drag a face-down card", () => {
      emptyBoard(game);
      const buried = relocate(game, "card-clubs-4", game.tableaus[0], false);
      relocate(game, "card-spades-9", game.tableaus[0]);

      expect(game.isCardDraggable(buried)).toBe(false);
    });
  });

  describe("a Yukon column", () => {
    it("accepts a King onto an empty column", () => {
      emptyBoard(game);
      const king = relocate(game, "card-spades-king", game.tableaus[1]);

      expect(game.moveCardToPile(king.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses anything but a King onto an empty column", () => {
      emptyBoard(game);
      const queen = relocate(game, "card-spades-queen", game.tableaus[1]);

      expect(game.moveCardToPile(queen.id, game.tableaus[0].id)).toBe(false);
    });

    it("builds down in alternating colors", () => {
      emptyBoard(game);
      relocate(game, "card-diamonds-10", game.tableaus[0]);
      const nine = relocate(game, "card-spades-9", game.tableaus[1]);

      expect(game.moveCardToPile(nine.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses a card one lower in the same suit", () => {
      emptyBoard(game);
      relocate(game, "card-diamonds-10", game.tableaus[0]);
      const nine = relocate(game, "card-diamonds-9", game.tableaus[1]);

      expect(game.moveCardToPile(nine.id, game.tableaus[0].id)).toBe(false);
    });
  });

  describe("an Alaska column", () => {
    let alaska: YukonGame;

    beforeEach(() => {
      alaska = dealtGame(YukonVariant.ALASKA);
      emptyBoard(alaska);
    });

    it("accepts a King onto an empty column", () => {
      const king = relocate(alaska, "card-spades-king", alaska.tableaus[1]);

      expect(alaska.moveCardToPile(king.id, alaska.tableaus[0].id)).toBe(true);
    });

    it("refuses anything but a King onto an empty column", () => {
      const queen = relocate(alaska, "card-spades-queen", alaska.tableaus[1]);

      expect(alaska.moveCardToPile(queen.id, alaska.tableaus[0].id)).toBe(
        false,
      );
    });

    it("builds up in the same suit, which is what makes it Alaska", () => {
      relocate(alaska, "card-spades-9", alaska.tableaus[0]);
      const ten = relocate(alaska, "card-spades-10", alaska.tableaus[1]);

      expect(alaska.moveCardToPile(ten.id, alaska.tableaus[0].id)).toBe(true);
    });

    it("builds down in the same suit as well, which Russian Solitaire alone does", () => {
      relocate(alaska, "card-spades-10", alaska.tableaus[0]);
      const nine = relocate(alaska, "card-spades-9", alaska.tableaus[1]);

      expect(alaska.moveCardToPile(nine.id, alaska.tableaus[0].id)).toBe(true);
    });

    it("refuses a card one higher in another suit", () => {
      relocate(alaska, "card-spades-9", alaska.tableaus[0]);
      const ten = relocate(alaska, "card-hearts-10", alaska.tableaus[1]);

      expect(alaska.moveCardToPile(ten.id, alaska.tableaus[0].id)).toBe(false);
    });
  });

  describe("a Russian Solitaire column", () => {
    let russian: YukonGame;

    beforeEach(() => {
      russian = dealtGame(YukonVariant.RUSSIAN);
      emptyBoard(russian);
    });

    it("accepts a King onto an empty column", () => {
      const king = relocate(russian, "card-spades-king", russian.tableaus[1]);

      expect(russian.moveCardToPile(king.id, russian.tableaus[0].id)).toBe(
        true,
      );
    });

    it("refuses anything but a King onto an empty column", () => {
      const queen = relocate(russian, "card-spades-queen", russian.tableaus[1]);

      expect(russian.moveCardToPile(queen.id, russian.tableaus[0].id)).toBe(
        false,
      );
    });

    it("builds down in the same suit", () => {
      relocate(russian, "card-spades-10", russian.tableaus[0]);
      const nine = relocate(russian, "card-spades-9", russian.tableaus[1]);

      expect(russian.moveCardToPile(nine.id, russian.tableaus[0].id)).toBe(
        true,
      );
    });

    it("refuses a card one lower in the other color, which plain Yukon takes", () => {
      relocate(russian, "card-diamonds-10", russian.tableaus[0]);
      const nine = relocate(russian, "card-spades-9", russian.tableaus[1]);

      expect(russian.moveCardToPile(nine.id, russian.tableaus[0].id)).toBe(
        false,
      );
    });
  });

  describe("turning over an exposed card", () => {
    /**
     * A face-down Four under a Nine of Spades, with a Ten of Diamonds on the
     * next column for the Nine to move to.
     */
    function coveredFaceDownCard(): PlayingCard {
      emptyBoard(game);
      const buried = relocate(game, "card-clubs-4", game.tableaus[0], false);
      relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-diamonds-10", game.tableaus[1]);
      return buried;
    }

    it("turns up the card a move uncovered", () => {
      const buried = coveredFaceDownCard();

      game.moveCardToPile("card-spades-9", game.tableaus[1].id);

      expect(buried.faceUp).toBe(true);
    });

    it("turns it back down on undo", () => {
      const buried = coveredFaceDownCard();
      game.moveCardToPile("card-spades-9", game.tableaus[1].id);

      game.undo();

      expect(buried.faceUp).toBe(false);
    });

    it("earns nothing for the flip, because the family does not score", () => {
      coveredFaceDownCard();

      game.moveCardToPile("card-spades-9", game.tableaus[1].id);

      expect(game.state.score).toBe(0);
    });
  });

  describe("moves and undo", () => {
    it("counts a move", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(game.state.moves).toBe(1);
    });

    it("takes a whole stack back together", () => {
      emptyBoard(game);
      const nine = relocate(game, "card-spades-9", game.tableaus[0]);
      const two = relocate(game, "card-hearts-2", game.tableaus[0]);
      relocate(game, "card-diamonds-10", game.tableaus[1]);
      game.moveCardToPile(nine.id, game.tableaus[1].id);

      game.undo();

      expect(game.tableaus[0].getCards()).toEqual([nine, two]);
    });
  });

  describe("the foundations", () => {
    it("starts with an Ace", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      expect(game.moveCardToPile(ace.id, game.foundations[0].id)).toBe(true);
    });

    it("refuses a card that is not an Ace", () => {
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.tableaus[0]);

      expect(game.moveCardToPile(two.id, game.foundations[0].id)).toBe(false);
    });

    it("refuses a stack, however legal its bottom card is", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);
      relocate(game, "card-hearts-5", game.tableaus[0]);

      expect(game.moveCardToPile(ace.id, game.foundations[0].id)).toBe(false);
    });
  });

  describe("auto-move", () => {
    it("sends a card to a foundation", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.autoMoveCard(ace.id);

      expect(game.getPileContainingCard(ace.id)?.id).toBe(
        game.foundations[0].id,
      );
    });

    it("leaves a card a column would take exactly where it is", () => {
      emptyBoard(game);
      const nine = relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-diamonds-10", game.tableaus[1]);

      game.autoMoveCard(nine.id);

      expect(game.getPileContainingCard(nine.id)?.id).toBe(game.tableaus[0].id);
    });
  });

  describe("winning", () => {
    it("announces the win when the last card reaches a foundation", () => {
      // A one-card deck, so the game is won in a single move rather than 52.
      const short = shortDeckGame([{ suit: Suit.SPADE, rank: Rank.ACE }]);
      let won = false;
      short.on("game-won", () => {
        won = true;
      });

      short.moveCardToPile("card-spades-ace", short.foundations[0].id);

      expect(won).toBe(true);
    });

    it("does not announce a win with cards still on the board", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(won).toBe(false);
    });
  });

  describe("the zones", () => {
    /**
     * The board rebuilds its pile index whenever the zone array is a different
     * array, and asks for it once per card per frame. A fresh array each time
     * would rebuild that index forever.
     */
    it("hands back the same array for a variant it has already built", () => {
      expect(yukonZoneSpecs(YukonVariant.ALASKA)).toBe(
        yukonZoneSpecs(YukonVariant.ALASKA),
      );
    });

    it("builds a different set of zones for a different variant", () => {
      expect(yukonZoneSpecs(YukonVariant.ALASKA)).not.toBe(
        yukonZoneSpecs(YukonVariant.RUSSIAN),
      );
    });
  });
});
