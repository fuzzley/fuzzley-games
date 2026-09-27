import { describe, it, expect } from "vitest";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import { FakeTableGame } from "@test/support/fake_table/game";
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

  it("marks only the placeholders whose empty slot does something", () => {
    const actionable = pileBackgrounds(new FakeTableGame())
      .filter((background) => background.actionable)
      .map((background) => background.pileId);

    expect(actionable).toEqual([STOCK_PILE_ID]);
  });
});
