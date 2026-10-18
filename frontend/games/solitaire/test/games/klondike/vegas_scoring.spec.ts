import { describe, it, expect } from "vitest";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { DrawCount } from "@/games/klondike/klondike_rules";
import { VegasScoringPolicy } from "@/games/klondike/scoring_policy";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

/** Deals a game scored the Vegas way, in the given draw mode. */
function vegasGame(drawCount: DrawCount = 3): KlondikeGame {
  const game = new KlondikeGame({
    drawCount,
    scoring: new VegasScoringPolicy(),
  });
  game.startNewGame();
  return game;
}

/** Leaves one card in the waste and nothing in the stock, ready to recycle. */
function readyToRecycle(game: KlondikeGame): void {
  emptyBoard(game);
  relocate(game, "card-clubs-ace", game.waste);
}

/** Presses the stock until it has recycled `count` times. */
function recycle(game: KlondikeGame, count: number): void {
  for (let done = 0; done < count; done++) {
    game.drawCardsFromStock(); // recycles the waste
    game.drawCardsFromStock(); // draws it back out
  }
}

describe("Vegas scoring in a Klondike game", () => {
  it("starts a fresh deal $52 down", () => {
    const game = vegasGame();

    expect(game.state.score).toBe(-52);
  });

  it("starts a restarted deal $52 down again", () => {
    const game = vegasGame();
    // Paid back $5, so the restart has something to undo.
    const ace = relocate(game, "card-clubs-ace", game.tableaus[0]);
    game.moveCardToPile(ace.id, game.foundations[0].id);

    game.restartGame();

    expect(game.state.score).toBe(-52);
  });

  it("pays $5 for a card on a foundation, staying below zero", () => {
    const game = vegasGame();
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0]);

    game.moveCardToPile("card-hearts-ace", game.foundations[0].id);

    expect(game.state.score).toBe(-47);
  });

  it("charges $5 for taking a card back off a foundation", () => {
    const game = vegasGame();
    emptyBoard(game);
    relocate(game, "card-spades-king", game.tableaus[0]);
    relocate(game, "card-hearts-queen", game.foundations[0]);

    game.moveCardToPile("card-hearts-queen", game.tableaus[0].id);

    expect(game.state.score).toBe(-57);
  });

  it("pays nothing for turning a card over", () => {
    const game = vegasGame();
    emptyBoard(game);
    relocate(game, "card-clubs-2", game.tableaus[0], false);
    relocate(game, "card-hearts-ace", game.tableaus[0]);

    game.moveCardToPile("card-hearts-ace", game.foundations[0].id);

    expect([game.tableaus[0].topCard?.faceUp, game.state.score]).toEqual([
      true,
      -47,
    ]);
  });

  it("puts a score below zero back exactly on undo", () => {
    const game = vegasGame();
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    game.moveCardToPile("card-hearts-ace", game.foundations[0].id);

    game.undo();

    expect(game.state.score).toBe(-52);
  });

  it("allows two recycles in Draw 3, for three passes", () => {
    const game = vegasGame(3);
    readyToRecycle(game);
    recycle(game, 2);

    game.drawCardsFromStock();

    expect([game.stock.size, game.waste.size]).toEqual([0, 1]);
  });

  it("allows no recycle in Draw 1, for a single pass", () => {
    const game = vegasGame(1);
    readyToRecycle(game);

    game.drawCardsFromStock();

    expect([game.stock.size, game.waste.size, game.state.moves]).toEqual([
      0, 1, 0,
    ]);
  });

  it("counts the recycles left down to none", () => {
    const game = vegasGame(3);
    readyToRecycle(game);

    recycle(game, 1);

    expect(game.recyclesRemaining).toBe(1);
  });

  it("gives a recycle back when it is undone", () => {
    const game = vegasGame(3);
    readyToRecycle(game);
    game.drawCardsFromStock();

    game.undo();

    expect(game.recyclesRemaining).toBe(2);
  });
});

describe("the Vegas stock's placeholder", () => {
  it("shows a filled pip for each recycle left", () => {
    const game = vegasGame(3);
    readyToRecycle(game);

    expect(game.pileBackgroundKey(game.stock)).toBe(
      "card-placeholder-full-border-reset-2-of-2",
    );
  });

  it("hollows a pip when a recycle is spent", () => {
    const game = vegasGame(3);
    readyToRecycle(game);

    recycle(game, 1);

    expect(game.pileBackgroundKey(game.stock)).toBe(
      "card-placeholder-full-border-reset-1-of-2",
    );
  });

  it("shows the plain outline once every recycle is spent", () => {
    const game = vegasGame(3);
    readyToRecycle(game);

    recycle(game, 2);

    expect(game.pileBackgroundKey(game.stock)).toBe(
      "card-placeholder-full-border",
    );
  });

  it("cannot be pressed once every recycle is spent", () => {
    const game = vegasGame(3);
    readyToRecycle(game);

    recycle(game, 2);

    expect(game.isEmptySlotActionable(game.stock)).toBe(false);
  });

  it("shows the plain outline in Draw 1, which never recycles", () => {
    const game = vegasGame(1);
    readyToRecycle(game);

    expect(game.pileBackgroundKey(game.stock)).toBe(
      "card-placeholder-full-border",
    );
  });
});

describe("the standard scoring a Klondike game keeps", () => {
  it("still floors the score at zero", () => {
    const game = new KlondikeGame();
    game.startNewGame();
    emptyBoard(game);
    relocate(game, "card-spades-king", game.tableaus[0]);
    relocate(game, "card-hearts-queen", game.foundations[0]);

    game.moveCardToPile("card-hearts-queen", game.tableaus[0].id);

    expect(game.state.score).toBe(0);
  });

  it("puts a floored score back where it was on undo", () => {
    const game = new KlondikeGame();
    game.startNewGame();
    emptyBoard(game);
    relocate(game, "card-spades-king", game.tableaus[0]);
    relocate(game, "card-hearts-queen", game.foundations[0]);
    game.moveCardToPile("card-hearts-queen", game.tableaus[0].id);

    game.undo();

    expect(game.state.score).toBe(0);
  });

  it("keeps the recycle arrow, with no pips, however often it recycles", () => {
    const game = new KlondikeGame();
    game.startNewGame();
    readyToRecycle(game);

    recycle(game, 5);

    expect(game.pileBackgroundKey(game.stock)).toBe(
      "card-placeholder-full-border-reset",
    );
  });
});
