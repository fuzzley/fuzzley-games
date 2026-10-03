import { describe, it, expect } from "vitest";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import {
  FakeTableGame,
  StockOverrideTableGame,
} from "@test/support/fake_table/game";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "@test/support/fake_table/zones";

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
