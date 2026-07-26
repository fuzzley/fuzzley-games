import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveDragTarget,
  resolveDropTarget,
} from "@/game/render/scene/board/input/drop_target_resolver";
import {
  PileGeometry,
  Rect,
  Viewport,
} from "@/game/render/scene/board/view/board_view_state";
import { computeDropGeometries } from "@/game/render/scene/board/view/board_geometry";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("resolveDragTarget", () => {
  let game: SolitaireGame;
  const viewport: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };

  beforeEach(() => {
    game = new SolitaireGame();
    game.startNewGame();
    emptyBoard(game);
  });

  /** The drop rectangle the given pile occupies at this viewport. */
  function geometryOf(pileId: string): PileGeometry {
    return computeDropGeometries(game, viewport).find(
      (geometry) => geometry.pileId === pileId,
    )!;
  }

  it("returns the geometry of the pile the drag overlaps most", () => {
    const tableau1 = geometryOf("tableau-1");

    const target = resolveDragTarget(
      game,
      {
        cardIds: ["card-hearts-ace"],
        primary: { x: tableau1.x, y: tableau1.y },
      },
      viewport,
    );

    expect(target).toEqual(tableau1);
  });

  it("returns null when the drag overlaps no pile", () => {
    const target = resolveDragTarget(
      game,
      { cardIds: ["card-hearts-ace"], primary: { x: 9000, y: 9000 } },
      viewport,
    );

    expect(target).toBeNull();
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
      viewport,
    );

    expect(target?.pileId).toBe("tableau-1");
  });
});

describe("drop_target_resolver", () => {
  const geometries: PileGeometry[] = [
    { pileId: "tableau-0", x: 100, y: 300, width: 200, height: 300 },
    { pileId: "tableau-1", x: 400, y: 300, width: 200, height: 300 },
    { pileId: "foundation-0", x: 400, y: 50, width: 200, height: 300 },
  ];

  it("returns the pile ID with the maximum overlap area", () => {
    // Overlaps tableau-0 partially
    const dragRect: Rect = { x: 150, y: 350, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBe("tableau-0");
  });

  it("returns null if there is no overlap at all", () => {
    const dragRect: Rect = { x: 800, y: 800, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBeNull();
  });

  it("resolves overlap correctly when overlapping multiple piles", () => {
    // Positioned right between tableau-0 and tableau-1 but mostly on tableau-1
    const dragRect: Rect = { x: 350, y: 300, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBe("tableau-1");
  });
});
