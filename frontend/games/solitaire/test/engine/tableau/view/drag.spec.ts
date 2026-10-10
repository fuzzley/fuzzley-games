import { describe, it, expect, beforeEach } from "vitest";
import { computeDropGeometries } from "@/engine/render/layout/drop_geometry";
import { measureFakeTable } from "@test/support/fake_table/board";
import { resolveDragTarget, stackFromCard } from "@/engine/tableau/view/drag";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
} from "@/engine/render/layout/card_metrics";
import { PileGeometry, Viewport } from "@/engine/render/view/table_view_state";
import { FakeTableGame } from "@test/support/fake_table/game";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("resolveDragTarget", () => {
  let game: FakeTableGame;
  const viewport: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    emptyBoard(game);
  });

  /** Returns the drop rectangle the given pile occupies at this viewport. */
  function geometryOf(pileId: string): PileGeometry {
    const metrics = measureFakeTable(viewport);
    return computeDropGeometries(
      game.dropTargetPiles.map((pile) => ({
        pile,
        layout: game.zoneFor(pile.id)!.layout,
      })),
      metrics.origins,
      { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX },
      metrics.scale,
    ).find((geometry) => geometry.pileId === pileId)!;
  }

  it("returns the geometry of the pile the drag overlaps most", () => {
    const tableau1 = geometryOf("tableau-1");

    const target = resolveDragTarget(
      game,
      {
        cardIds: ["card-hearts-ace"],
        primary: { x: tableau1.x, y: tableau1.y },
      },
      measureFakeTable(viewport),
    );

    expect(target).toEqual(tableau1);
  });

  it("returns null when the drag overlaps no pile", () => {
    const target = resolveDragTarget(
      game,
      { cardIds: ["card-hearts-ace"], primary: { x: 9000, y: 9000 } },
      measureFakeTable(viewport),
    );

    expect(target).toBeNull();
  });

  it("prefers a pile that takes the stack over one it overlaps more", () => {
    relocate(game, "card-spades-king", game.tableaus[0], true);
    relocate(game, "card-hearts-queen", game.waste, true);
    const tableau0 = geometryOf("tableau-0");
    const tableau1 = geometryOf("tableau-1");

    // Mostly over the empty column, which takes only a King, and well over
    // the King too.
    const target = resolveDragTarget(
      game,
      {
        cardIds: ["card-hearts-queen"],
        primary: {
          x: tableau1.x - (tableau1.x - tableau0.x) * 0.4,
          y: tableau1.y,
        },
      },
      measureFakeTable(viewport),
    );

    expect(target?.pileId).toBe("tableau-0");
  });

  it("keeps to the pile it overlaps most when a taker is barely touched", () => {
    relocate(game, "card-spades-king", game.tableaus[0], true);
    relocate(game, "card-hearts-queen", game.waste, true);
    const tableau0 = geometryOf("tableau-0");
    const tableau1 = geometryOf("tableau-1");

    // A sliver over the King, the rest over the empty column.
    const target = resolveDragTarget(
      game,
      {
        cardIds: ["card-hearts-queen"],
        primary: {
          x: tableau1.x - (tableau1.x - tableau0.x) * 0.2,
          y: tableau1.y,
        },
      },
      measureFakeTable(viewport),
    );

    expect(target?.pileId).toBe("tableau-1");
  });

  it("follows a tableau's rectangle as it grows with its fanned cards", () => {
    relocate(game, "card-spades-king", game.tableaus[1], true);
    relocate(game, "card-hearts-queen", game.tableaus[1], true);
    const tableau1 = geometryOf("tableau-1");

    // Low enough to miss the top card entirely, still on the fanned column.
    const target = resolveDragTarget(
      game,
      {
        cardIds: ["card-clubs-jack"],
        primary: { x: tableau1.x, y: tableau1.y + tableau1.height - 20 },
      },
      measureFakeTable(viewport),
    );

    expect(target?.pileId).toBe("tableau-1");
  });
});

describe("stackFromCard", () => {
  let game: FakeTableGame;

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    emptyBoard(game);
  });

  it("picks up a card and everything resting on it, bottom first", () => {
    const column = game.tableaus[0];
    relocate(game, "card-spades-9", column);
    relocate(game, "card-hearts-8", column);
    relocate(game, "card-clubs-7", column);

    expect(stackFromCard(game)("card-hearts-8")).toEqual([
      "card-hearts-8",
      "card-clubs-7",
    ]);
  });

  it("picks up nothing its zone will not let go of", () => {
    relocate(game, "card-spades-9", game.waste);
    relocate(game, "card-hearts-8", game.waste);

    expect(stackFromCard(game)("card-spades-9")).toEqual([]);
  });

  it("picks up nothing for a card on no pile", () => {
    expect(stackFromCard(game)("card-spades-9")).toEqual([]);
  });
});
