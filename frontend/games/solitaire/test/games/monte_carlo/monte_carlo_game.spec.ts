import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { MonteCarloGame } from "@/games/monte_carlo/monte_carlo_game";
import { monteCarloGestures } from "@/games/monte_carlo/monte_carlo_gestures";
import { MonteCarloVariant } from "@/games/monte_carlo/monte_carlo_rules";
import { STOCK_PILE_ID } from "@/games/monte_carlo/monte_carlo_zones";
import {
  CLOSED_STOCK_PLACEHOLDER,
  RECYCLING_STOCK_PLACEHOLDER,
} from "@/games/common/zone_presets";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: MonteCarloVariant;
  } = {},
): MonteCarloGame {
  const game = new MonteCarloGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Returns the cell at the given row and column of the grid. */
function cellAt(game: MonteCarloGame, row: number, column: number) {
  return game.cells[row * 5 + column];
}

/** Returns the id of the card in each cell, row by row, or null for a gap. */
function grid(game: MonteCarloGame): (string | null)[] {
  return game.cells.map((cell) => cell.topCard?.id ?? null);
}

describe("MonteCarloGame deal", () => {
  it("fills the grid face up and leaves 27 cards in the stock", () => {
    const game = newGame();

    const faceUp = game.cells.filter((cell) => cell.topCard?.faceUp).length;

    expect([faceUp, game.stock.size]).toEqual([25, 27]);
  });
});

describe("MonteCarloGame pairing", () => {
  let game: MonteCarloGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("discards two touching cards of the same rank", () => {
    relocate(game, "card-hearts-9", cellAt(game, 1, 1));
    relocate(game, "card-clubs-9", cellAt(game, 1, 2));

    game.moveCardToPile("card-clubs-9", cellAt(game, 1, 1).id);

    expect(game.discard.size).toBe(2);
  });

  it("pairs cards touching corner to corner", () => {
    relocate(game, "card-hearts-9", cellAt(game, 1, 1));
    relocate(game, "card-clubs-9", cellAt(game, 2, 2));

    const moved = game.moveCardToPile("card-clubs-9", cellAt(game, 1, 1).id);

    expect(moved).toBe(true);
  });

  it("refuses a pair that does not touch", () => {
    relocate(game, "card-hearts-9", cellAt(game, 1, 1));
    relocate(game, "card-clubs-9", cellAt(game, 1, 3));

    const moved = game.moveCardToPile("card-clubs-9", cellAt(game, 1, 1).id);

    expect(moved).toBe(false);
  });

  it("refuses two touching cards of different ranks", () => {
    relocate(game, "card-hearts-9", cellAt(game, 1, 1));
    relocate(game, "card-clubs-8", cellAt(game, 1, 2));

    const moved = game.moveCardToPile("card-clubs-8", cellAt(game, 1, 1).id);

    expect(moved).toBe(false);
  });

  it("does not wrap a row's end onto the next row's start", () => {
    relocate(game, "card-hearts-9", cellAt(game, 0, 4));
    relocate(game, "card-clubs-9", cellAt(game, 1, 0));

    const moved = game.moveCardToPile("card-clubs-9", cellAt(game, 0, 4).id);

    expect(moved).toBe(false);
  });

  it("takes nothing straight onto the discard", () => {
    relocate(game, "card-hearts-king", cellAt(game, 0, 0));

    const moved = game.moveCardToPile("card-hearts-king", game.discard.id);

    expect(moved).toBe(false);
  });
});

describe("MonteCarloGame Thirteens", () => {
  let game: MonteCarloGame;

  beforeEach(() => {
    game = newGame({ variant: MonteCarloVariant.THIRTEENS });
    emptyBoard(game);
  });

  it("pairs touching cards that add up to thirteen", () => {
    relocate(game, "card-hearts-queen", cellAt(game, 0, 0));
    relocate(game, "card-clubs-ace", cellAt(game, 0, 1));

    const moved = game.moveCardToPile("card-clubs-ace", cellAt(game, 0, 0).id);

    expect(moved).toBe(true);
  });

  it("refuses two cards of the same rank", () => {
    relocate(game, "card-hearts-9", cellAt(game, 0, 0));
    relocate(game, "card-clubs-9", cellAt(game, 0, 1));

    const moved = game.moveCardToPile("card-clubs-9", cellAt(game, 0, 0).id);

    expect(moved).toBe(false);
  });

  it("sends a King to the discard on its own", () => {
    relocate(game, "card-hearts-king", cellAt(game, 2, 2));

    game.autoMoveCard("card-hearts-king");

    expect(game.discard.topCard?.id).toBe("card-hearts-king");
  });
});

describe("MonteCarloGame consolidation", () => {
  let game: MonteCarloGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("closes the gaps in reading order and fills the end from the stock", () => {
    relocate(game, "card-hearts-2", cellAt(game, 0, 1));
    relocate(game, "card-hearts-3", cellAt(game, 0, 3));
    relocate(game, "card-hearts-4", game.stock, false);

    game.consolidate();

    expect(grid(game).slice(0, 4)).toEqual([
      "card-hearts-2",
      "card-hearts-3",
      "card-hearts-4",
      null,
    ]);
  });

  it("deals the stock face up", () => {
    relocate(game, "card-hearts-4", game.stock, false);

    game.consolidate();

    expect(game.cells[0]?.topCard?.faceUp).toBe(true);
  });

  it("is taken back by one undo", () => {
    relocate(game, "card-hearts-2", cellAt(game, 0, 1));
    relocate(game, "card-hearts-3", cellAt(game, 0, 3));
    relocate(game, "card-hearts-4", game.stock, false);
    const before = grid(game);
    game.consolidate();

    game.undo();

    expect([grid(game), game.stock.topCard?.faceUp]).toEqual([before, false]);
  });

  it("has nothing to do while the grid is full", () => {
    const full = newGame();

    expect(full.consolidate()).toBe(false);
  });

  it("has nothing to do when the cards are already closed up", () => {
    relocate(game, "card-hearts-2", cellAt(game, 0, 0));

    expect(game.canConsolidate).toBe(false);
  });

  it("shows the recycle arrow while it would do something", () => {
    relocate(game, "card-hearts-2", cellAt(game, 0, 1));

    expect(game.pileBackgroundKey(game.stock)).toBe(
      RECYCLING_STOCK_PLACEHOLDER,
    );
  });

  it("shows the plain outline once it would do nothing", () => {
    expect(game.pileBackgroundKey(game.stock)).toBe(CLOSED_STOCK_PLACEHOLDER);
  });

  it("consolidates on a press of the empty stock's slot", () => {
    relocate(game, "card-hearts-2", cellAt(game, 0, 1));
    const handle = monteCarloGestures(game);

    handle({ kind: "activate-pile", pileId: STOCK_PILE_ID });

    expect(grid(game)[0]).toBe("card-hearts-2");
  });

  it("consolidates on a press of the stock", () => {
    relocate(game, "card-hearts-4", game.stock, false);
    const handle = monteCarloGestures(game);

    handle({ kind: "activate", cardId: "card-hearts-4" });

    expect(grid(game)[0]).toBe("card-hearts-4");
  });
});

describe("MonteCarloGame win condition", () => {
  it("is won once every card is discarded", () => {
    const nines = ALL_PLAYING_CARD_IDS.filter(
      (card) =>
        card.rank === Rank.NINE &&
        (card.suit === Suit.HEART || card.suit === Suit.CLUB),
    );
    const game = newGame({ cardIds: nines });
    emptyBoard(game);
    relocate(game, "card-hearts-9", cellAt(game, 0, 0));
    relocate(game, "card-clubs-9", cellAt(game, 0, 1));
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-9", cellAt(game, 0, 0).id);

    expect(won).toBe(true);
  });
});
