import { describe, it, expect } from "vitest";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import {
  pileBackgroundFrame,
  pileBackgrounds,
} from "@/engine/tableau/view/pile_backgrounds";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";
import {
  FakeTableGame,
  StockOverrideTableGame,
} from "@test/support/fake_table/game";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "@test/support/fake_table/zones";

/** The fake board's grid, drawing the stock's closed outline as a ring. */
const SWAPPING_GRID: TableLayoutSpec = {
  ...FAKE_TABLE_LAYOUT,
  pileBackgrounds: {
    [STOCK_PILE_ID]: (artwork) =>
      artwork === "card-placeholder-full-border"
        ? "card-placeholder-full-border-circle"
        : artwork,
  },
};

describe("pileBackgrounds", () => {
  it("lists every pile whose zone declares a placeholder", () => {
    const game = new FakeTableGame();

    const pileIds = pileBackgrounds(game).map(
      (background) => background.pileId,
    );

    expect(pileIds).toEqual(
      game.piles
        .filter((pile) => game.zoneFor(pile.id)?.backgroundKey)
        .map((pile) => pile.id),
    );
  });

  it("leaves out a pile drawn over bare table", () => {
    const pileIds = pileBackgrounds(new FakeTableGame()).map(
      (background) => background.pileId,
    );

    expect(pileIds).not.toContain(WASTE_PILE_ID);
  });

  it("draws each placeholder from its zone's artwork", () => {
    const game = new FakeTableGame();

    const stock = pileBackgrounds(game).find(
      (background) => background.pileId === STOCK_PILE_ID,
    );

    expect(stock?.frame).toBe(game.zoneFor(STOCK_PILE_ID)?.backgroundKey);
  });

  it("starts a placeholder on the artwork its game shows", () => {
    const game = new StockOverrideTableGame();
    game.stockBackgroundKey = "card-placeholder-full-border";

    const stock = pileBackgrounds(game).find(
      (background) => background.pileId === STOCK_PILE_ID,
    );

    expect(stock?.frame).toBe("card-placeholder-full-border");
  });

  it("listens for presses on a slot that can be pressed later", () => {
    const game = new StockOverrideTableGame();
    game.stockActionable = false;

    const stock = pileBackgrounds(game).find(
      (background) => background.pileId === STOCK_PILE_ID,
    );

    expect(stock?.actionable).toBe(true);
  });

  it("marks only the placeholders whose empty slot does something", () => {
    const actionable = pileBackgrounds(new FakeTableGame())
      .filter((background) => background.actionable)
      .map((background) => background.pileId);

    expect(actionable).toEqual([STOCK_PILE_ID]);
  });
});

describe("pileBackgroundFrame", () => {
  /** Returns the pile with an id in a game. */
  function pileOf(game: FakeTableGame, pileId: string) {
    return game.piles.find((pile) => pile.id === pileId)!;
  }

  it("draws the artwork the game asks for on a grid that swaps none", () => {
    const game = new FakeTableGame();

    const frame = pileBackgroundFrame(
      game,
      pileOf(game, STOCK_PILE_ID),
      FAKE_TABLE_LAYOUT,
    );

    expect(frame).toBe(game.zoneFor(STOCK_PILE_ID)?.backgroundKey);
  });

  it("draws the grid's artwork in place of the game's", () => {
    const game = new StockOverrideTableGame();
    game.stockBackgroundKey = "card-placeholder-full-border";

    const frame = pileBackgroundFrame(
      game,
      pileOf(game, STOCK_PILE_ID),
      SWAPPING_GRID,
    );

    expect(frame).toBe("card-placeholder-full-border-circle");
  });

  it("leaves artwork the grid does not swap alone", () => {
    const game = new StockOverrideTableGame();
    game.stockBackgroundKey = "card-placeholder-full-border-reset";

    const frame = pileBackgroundFrame(
      game,
      pileOf(game, STOCK_PILE_ID),
      SWAPPING_GRID,
    );

    expect(frame).toBe("card-placeholder-full-border-reset");
  });

  it("gives a pile drawn over bare table no placeholder on any grid", () => {
    const game = new FakeTableGame();

    const frame = pileBackgroundFrame(
      game,
      pileOf(game, WASTE_PILE_ID),
      SWAPPING_GRID,
    );

    expect(frame).toBeUndefined();
  });
});
