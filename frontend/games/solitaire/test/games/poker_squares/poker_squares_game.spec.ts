import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PokerSquaresGame } from "@/games/poker_squares/poker_squares_game";
import { PokerSquaresScoring } from "@/games/poker_squares/poker_squares_rules";
import { squarePileId } from "@/games/poker_squares/poker_squares_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    scoring?: PokerSquaresScoring;
  } = {},
): PokerSquaresGame {
  const game = new PokerSquaresGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Returns the square at a row and column. */
function square(game: PokerSquaresGame, row: number, column: number) {
  return game.getPileById(squarePileId(row, column))!;
}

describe("PokerSquaresGame deal", () => {
  it("turns the first card into the hand and leaves the rest in the stock", () => {
    const game = newGame();

    expect([
      game.hand.size,
      game.hand.topCard?.faceUp,
      game.stock.size,
    ]).toEqual([1, true, 51]);
  });
});

describe("PokerSquaresGame placing", () => {
  let game: PokerSquaresGame;

  beforeEach(() => {
    game = newGame();
  });

  it("places the hand's card in an empty square and turns up the next", () => {
    const placed = game.hand.topCard!;
    const next = game.stock.topCard;

    game.moveCardToPile(placed.id, square(game, 2, 2).id);

    expect([square(game, 2, 2).topCard, game.hand.topCard]).toEqual([
      placed,
      next,
    ]);
  });

  it("refuses a second card in a square", () => {
    game.moveCardToPile(game.hand.topCard!.id, square(game, 0, 0).id);

    const moved = game.moveCardToPile(
      game.hand.topCard!.id,
      square(game, 0, 0).id,
    );

    expect(moved).toBe(false);
  });

  it("never moves a placed card", () => {
    const placed = game.hand.topCard!;
    game.moveCardToPile(placed.id, square(game, 0, 0).id);

    const moved = game.moveCardToPile(placed.id, square(game, 4, 4).id);

    expect(moved).toBe(false);
  });

  it("takes a placement and its draw back in one undo", () => {
    const placed = game.hand.topCard!;
    game.moveCardToPile(placed.id, square(game, 0, 0).id);

    game.undo();

    expect([
      game.hand.topCard,
      game.stock.size,
      square(game, 0, 0).size,
    ]).toEqual([placed, 51, 0]);
  });
});

describe("PokerSquaresGame scoring", () => {
  let game: PokerSquaresGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("scores a pair in a row as soon as it is made", () => {
    relocate(game, "card-hearts-9", square(game, 0, 0));
    relocate(game, "card-clubs-9", game.hand);

    game.moveCardToPile("card-clubs-9", square(game, 0, 3).id);

    expect(game.state.score).toBe(2);
  });

  it("scores rows and columns alike", () => {
    relocate(game, "card-hearts-9", square(game, 0, 0));
    relocate(game, "card-clubs-9", game.hand);

    game.moveCardToPile("card-clubs-9", square(game, 3, 0).id);

    expect(game.state.score).toBe(2);
  });

  it("scores by the English system when chosen", () => {
    const english = newGame({ scoring: PokerSquaresScoring.ENGLISH });
    emptyBoard(english);
    relocate(english, "card-hearts-9", square(english, 0, 0));
    relocate(english, "card-clubs-9", english.hand);

    english.moveCardToPile("card-clubs-9", square(english, 0, 1).id);

    expect(english.state.score).toBe(1);
  });

  it("takes the score back with the placement", () => {
    relocate(game, "card-hearts-9", square(game, 0, 0));
    relocate(game, "card-clubs-9", game.hand);
    game.moveCardToPile("card-clubs-9", square(game, 0, 3).id);

    game.undo();

    expect(game.state.score).toBe(0);
  });
});

describe("PokerSquaresGame win condition", () => {
  /** The ranks of the grid's columns, each four of a kind in the top rows. */
  const COLUMN_RANKS = ["2", "5", "7", "9", "jack"];

  /** The last row, all but its final square, then the card for that square. */
  const LAST_ROW = ["card-spades-3", "card-hearts-4", "card-clubs-6"];

  /**
   * Fills the top four rows with a flush each, so every column holds four of
   * a kind, and the last row up to `filled` squares, the next card in hand.
   */
  function flushGrid(
    scoring: PokerSquaresScoring,
    filled: number,
  ): PokerSquaresGame {
    const game = newGame({ scoring });
    emptyBoard(game);
    ["spades", "hearts", "diamonds", "clubs"].forEach((suit, row) => {
      COLUMN_RANKS.forEach((rank, column) => {
        relocate(game, `card-${suit}-${rank}`, square(game, row, column));
      });
    });
    const lastRow = [...LAST_ROW, "card-diamonds-8", "card-diamonds-king"];
    lastRow.slice(0, filled).forEach((card, column) => {
      relocate(game, card, square(game, 4, column));
    });
    relocate(game, lastRow[filled], game.hand);
    return game;
  }

  it("is won once the grid is full with a winning score", () => {
    const game = flushGrid(PokerSquaresScoring.AMERICAN, 4);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-diamonds-king", square(game, 4, 4).id);

    expect(won).toBe(true);
  });

  it("is not won while a square is empty, however high the score", () => {
    const game = flushGrid(PokerSquaresScoring.ENGLISH, 3);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-diamonds-8", square(game, 4, 3).id);

    expect([won, game.state.score >= 70]).toEqual([false, true]);
  });

  it("is not won when the full grid scores too little", () => {
    const game = newGame();
    emptyBoard(game);
    // Each square takes the first card sharing no rank with its row or
    // column and no suit with the square to its left: no pairs, no flushes.
    const unused = [...game.cardIds];
    const placed: (string | undefined)[] = [];
    const cardAt = (row: number, column: number) =>
      game.getCardById(placed[row * 5 + column] ?? "");
    for (let index = 0; index < 25; index++) {
      const row = Math.floor(index / 5);
      const column = index % 5;
      const neighbours = [0, 1, 2, 3, 4].flatMap((n) => [
        cardAt(row, n),
        cardAt(n, column),
      ]);
      const choice = unused.find((id) => {
        const card = game.getCardById(id)!;
        return (
          neighbours.every((other) => other?.rank !== card.rank) &&
          cardAt(row, column - 1)?.suit !== card.suit &&
          cardAt(row - 1, column)?.suit !== card.suit
        );
      })!;
      unused.splice(unused.indexOf(choice), 1);
      placed.push(choice);
    }
    placed.slice(0, 24).forEach((id, index) => {
      relocate(game, id!, game.squares[index]);
    });
    relocate(game, placed[24]!, game.hand);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(placed[24]!, game.squares[24].id);

    expect([won, game.squares.every((sq) => !sq.isEmpty)]).toEqual([
      false,
      true,
    ]);
  });
});
