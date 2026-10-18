import { describe, it, expect, beforeEach } from "vitest";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { measureTable } from "@/engine/render/layout/table_metrics";
import { FanFit, PileLayout } from "@/engine/render/layout/pile_layout";
import { Viewport } from "@/engine/render/layout/viewport";
import { pileArrangement } from "@/engine/tableau/view/pile_arrangement";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import {
  TABLEAU_PILE_LAYOUT,
  WASTE_PILE_ID,
} from "@test/support/fake_table/zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

const VIEWPORT: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };
const FIT: FanFit = { minFaceUpGap: 40, maxFaceUpGap: 110, minFaceDownGap: 10 };

describe("pileArrangement", () => {
  let game: FakeTableGame;

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    emptyBoard(game);
  });

  /** Returns how the pile arranges its cards on the fake grid, changed. */
  function arrangementOn(
    pileId: string,
    changes: Partial<TableLayoutSpec>,
  ): PileLayout {
    const metrics = measureTable(
      { ...FAKE_TABLE_LAYOUT, ...changes },
      VIEWPORT,
    );
    return pileArrangement(game, game.getPileById(pileId)!, metrics);
  }

  it("takes the zone's own arrangement when the grid says nothing", () => {
    expect(arrangementOn(game.tableaus[0].id, {})).toEqual(TABLEAU_PILE_LAYOUT);
  });

  it("takes the grid's override for the pile", () => {
    const arrangement = arrangementOn(WASTE_PILE_ID, {
      pileLayouts: {
        [WASTE_PILE_ID]: (own) =>
          own.kind === "spread" ? { ...own, direction: "down" } : own,
      },
    });

    expect(arrangement).toMatchObject({ kind: "spread", direction: "down" });
  });

  it("turns a sideways spread around on a mirrored grid", () => {
    expect(arrangementOn(WASTE_PILE_ID, { mirrored: true })).toMatchObject({
      kind: "spread",
      direction: "left",
    });
  });

  it("turns an overridden spread around on a mirrored grid too", () => {
    const arrangement = arrangementOn(WASTE_PILE_ID, {
      mirrored: true,
      pileLayouts: {
        [WASTE_PILE_ID]: (own) =>
          own.kind === "spread" ? { ...own, direction: "left" } : own,
      },
    });

    expect(arrangement).toMatchObject({ direction: "right" });
  });

  it("fits a column's fan to the room below it", () => {
    const column = game.tableaus[0];
    relocate(game, "card-spades-king", column);
    relocate(game, "card-hearts-queen", column);

    const arrangement = arrangementOn(column.id, { fanFit: FIT });

    expect(arrangement).toMatchObject({ kind: "fan-down", faceUpGap: 110 });
  });

  it("leaves a column's fan alone on a grid without a fit", () => {
    const column = game.tableaus[0];
    relocate(game, "card-spades-king", column);
    relocate(game, "card-hearts-queen", column);

    expect(arrangementOn(column.id, {})).toEqual(TABLEAU_PILE_LAYOUT);
  });
});
