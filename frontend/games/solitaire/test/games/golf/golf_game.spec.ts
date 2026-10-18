import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { GolfGame } from "@/games/golf/golf_game";
import { golfGestures } from "@/games/golf/golf_gestures";
import { CARDS_PER_COLUMN } from "@/games/golf/golf_deal";
import { GolfVariant } from "@/games/golf/golf_rules";
import { TABLEAU_COUNT } from "@/games/golf/golf_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: GolfVariant;
  } = {},
): GolfGame {
  const game = new GolfGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Empties the board and starts the foundation with the given card. */
function foundationOn(game: GolfGame, cardId: string): void {
  emptyBoard(game);
  relocate(game, cardId, game.foundation);
}

describe("GolfGame deal", () => {
  let game: GolfGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals seven face-up columns of five", () => {
    const columns = game.tableaus.map((pile) =>
      pile.getCards().filter((card) => card.faceUp),
    );

    expect(columns.map((cards) => cards.length)).toEqual(
      Array<number>(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
    );
  });

  it("starts the foundation with one face-up card", () => {
    expect([game.foundation.size, game.foundation.topCard?.faceUp]).toEqual([
      1,
      true,
    ]);
  });

  it("leaves sixteen face-down cards in the stock", () => {
    const faceDown = game.stock.getCards().filter((card) => !card.faceUp);

    expect(faceDown.length).toBe(16);
  });
});

describe("GolfGame foundation", () => {
  let game: GolfGame;

  beforeEach(() => {
    game = newGame();
  });

  it("takes a card one rank higher in any suit", () => {
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-8", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("takes a card one rank lower in any suit", () => {
    foundationOn(game, "card-spades-7");
    relocate(game, "card-clubs-6", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-6", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("refuses a card two ranks away", () => {
    foundationOn(game, "card-spades-7");
    relocate(game, "card-clubs-9", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-9", game.foundation.id);

    expect(moved).toBe(false);
  });

  it("takes nothing on a King", () => {
    foundationOn(game, "card-spades-king");
    relocate(game, "card-clubs-queen", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-queen", game.foundation.id);

    expect(moved).toBe(false);
  });

  it("keeps the King and the Ace apart", () => {
    foundationOn(game, "card-spades-ace");
    relocate(game, "card-clubs-king", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-king", game.foundation.id);

    expect(moved).toBe(false);
  });

  it("refuses a card buried in a column", () => {
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-8", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.foundation.id);

    expect(moved).toBe(false);
  });
});

describe("GolfGame variants", () => {
  it("puts a Queen on a King when Queens on Kings is chosen", () => {
    const game = newGame({ variant: GolfVariant.QUEENS_ON_KINGS });
    foundationOn(game, "card-spades-king");
    relocate(game, "card-clubs-queen", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-queen", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("still keeps the Ace off a King when Queens on Kings is chosen", () => {
    const game = newGame({ variant: GolfVariant.QUEENS_ON_KINGS });
    foundationOn(game, "card-spades-king");
    relocate(game, "card-clubs-ace", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-ace", game.foundation.id);

    expect(moved).toBe(false);
  });

  it("puts an Ace on a King in Putt Putt", () => {
    const game = newGame({ variant: GolfVariant.PUTT_PUTT });
    foundationOn(game, "card-spades-king");
    relocate(game, "card-clubs-ace", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-ace", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("puts a King on an Ace in Putt Putt", () => {
    const game = newGame({ variant: GolfVariant.PUTT_PUTT });
    foundationOn(game, "card-spades-ace");
    relocate(game, "card-clubs-king", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-king", game.foundation.id);

    expect(moved).toBe(true);
  });
});

describe("GolfGame stock", () => {
  it("turns its top card onto the foundation", () => {
    const game = newGame();
    const top = game.stock.topCard;

    game.drawCard();

    expect(game.foundation.topCard).toBe(top);
  });

  it("turns the card face up, and undo turns it back", () => {
    const game = newGame();
    const top = game.stock.topCard!;
    game.drawCard();

    game.undo();

    expect([game.stock.topCard, top.faceUp]).toEqual([top, false]);
  });

  it("refuses to draw once it is empty", () => {
    const game = newGame();
    emptyBoard(game);

    expect(game.drawCard()).toBe(false);
  });
});

describe("golfGestures", () => {
  it("plays a column's top card on a single press", () => {
    const game = newGame();
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-8", game.tableaus[0]);
    const handle = golfGestures(game);

    handle({ kind: "activate", cardId: "card-hearts-8" });

    expect(game.foundation.topCard?.id).toBe("card-hearts-8");
  });

  it("turns the stock on a single press", () => {
    const game = newGame();
    const handle = golfGestures(game);

    handle({ kind: "activate", cardId: game.stock.topCard!.id });

    expect(game.stock.size).toBe(15);
  });

  it("does nothing more on a double press", () => {
    const game = newGame();
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-8", game.tableaus[0]);
    const handle = golfGestures(game);

    handle({ kind: "activate-secondary", cardId: "card-hearts-8" });

    expect(game.foundation.topCard?.id).toBe("card-spades-7");
  });
});

describe("GolfGame win condition", () => {
  it("is won once the columns are clear, with cards left in the stock", () => {
    const game = newGame();
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-2", game.stock, false);
    relocate(game, "card-hearts-8", game.tableaus[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-hearts-8", game.foundation.id);

    expect(won).toBe(true);
  });

  it("is not won while a column holds a card", () => {
    const game = newGame();
    foundationOn(game, "card-spades-7");
    relocate(game, "card-hearts-8", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[1]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-hearts-8", game.foundation.id);

    expect(won).toBe(false);
  });
});
