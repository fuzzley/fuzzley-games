import { describe, it, expect, beforeEach } from "vitest";
import {
  getGameModel,
  resetGameModel,
} from "@/games/klondike/game_model_factory";
import { SolitaireGame } from "@/games/klondike/solitaire_game";

describe("getGameModel", () => {
  beforeEach(() => {
    resetGameModel();
  });

  it("returns a solitaire game", () => {
    expect(getGameModel()).toBeInstanceOf(SolitaireGame);
  });

  it("shares one instance between callers, whichever asks first", () => {
    const first = getGameModel();

    expect(getGameModel()).toBe(first);
  });

  it("hands back a board that has already been dealt", () => {
    const game = getGameModel();

    // Every consumer sees a playable game rather than an empty board, so none
    // of them has to know whether someone else has dealt yet.
    expect([
      game.stock.size,
      ...game.tableaus.map((pile) => pile.size),
    ]).toEqual([24, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("does not re-deal for a second caller", () => {
    const game = getGameModel();
    game.drawCardsFromStock();
    const wasteSize = game.waste.size;

    getGameModel();

    expect(game.waste.size).toBe(wasteSize);
  });
});

describe("resetGameModel", () => {
  it("makes the next call create a fresh game", () => {
    const first = getGameModel();

    resetGameModel();

    expect(getGameModel()).not.toBe(first);
  });
});
