import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardLayoutManager } from "@/game/render/scene/board/layout/board_layout_manager";
import { Visual } from "@/game/render/visual/visual";
import { CardPile } from "@/game/model/card/card_pile";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { asSprite, createMockSprite } from "@test/support/phaser_mocks";

describe("BoardLayoutManager", () => {
  describe("createInitialLayout", () => {
    let scene: {
      stockPile: Visual;
      wastePile: Visual;
      foundationPiles: Visual[];
      tableauPiles: Visual[];
    };

    beforeEach(() => {
      scene = {
        stockPile: new Visual(new CardPile()),
        wastePile: new Visual(new CardPile()),
        foundationPiles: Array.from(
          { length: 4 },
          () => new Visual(new CardPile()),
        ),
        tableauPiles: Array.from(
          { length: 7 },
          () => new Visual(new CardPile()),
        ),
      };
      new BoardLayoutManager(
        scene as unknown as BoardScene,
      ).createInitialLayout();
    });

    it("places the stock and waste piles on the top row", () => {
      expect(scene.stockPile.position).toEqual({ x: 40, y: 113 });
      expect(scene.wastePile.position).toEqual({ x: 291, y: 113 });
    });

    it("places the four foundations across the top row", () => {
      const positions = scene.foundationPiles.map((p) => p.position);
      expect(positions).toEqual([
        { x: 793, y: 113 },
        { x: 1044, y: 113 },
        { x: 1295, y: 113 },
        { x: 1546, y: 113 },
      ]);
    });

    it("places the seven tableaus across the bottom row", () => {
      const positions = scene.tableauPiles.map((p) => p.position);
      expect(positions).toEqual([
        { x: 40, y: 466 },
        { x: 291, y: 466 },
        { x: 542, y: 466 },
        { x: 793, y: 466 },
        { x: 1044, y: 466 },
        { x: 1295, y: 466 },
        { x: 1546, y: 466 },
      ]);
    });
  });

  describe("updateVisualLayout", () => {
    /** Builds a mock pile visual with the given absolute position and cards. */
    function pile(
      position: { x: number; y: number },
      playingCardVisuals: {
        position: { x: number; y: number };
        sprite?: unknown;
      }[],
    ) {
      return { layoutPile: vi.fn(), position, playingCardVisuals };
    }

    it("places each card sprite at its pile position plus its relative offset", () => {
      const stockSprite = createMockSprite();
      const foundationSprite = createMockSprite();
      const tableauSprite = createMockSprite();
      const scene = {
        stockPile: pile({ x: 10, y: 20 }, [
          { position: { x: 5, y: 5 }, sprite: asSprite(stockSprite) },
          { position: { x: 6, y: 6 } },
        ]),
        wastePile: pile({ x: 30, y: 40 }, []),
        foundationPiles: [
          pile({ x: 50, y: 60 }, [
            { position: { x: 2, y: 2 }, sprite: asSprite(foundationSprite) },
          ]),
        ],
        tableauPiles: [
          pile({ x: 70, y: 80 }, [
            { position: { x: 3, y: 3 }, sprite: asSprite(tableauSprite) },
          ]),
        ],
      };

      new BoardLayoutManager(
        scene as unknown as BoardScene,
      ).updateVisualLayout();

      expect({
        x: stockSprite.x,
        y: stockSprite.y,
        depth: stockSprite.depth,
      }).toEqual({ x: 15, y: 25, depth: 0 });
      expect({
        x: foundationSprite.x,
        y: foundationSprite.y,
        depth: foundationSprite.depth,
      }).toEqual({ x: 52, y: 62, depth: 0 });
      expect({
        x: tableauSprite.x,
        y: tableauSprite.y,
        depth: tableauSprite.depth,
      }).toEqual({ x: 73, y: 83, depth: 0 });
    });

    it("scales positions and sprites down when the viewport is smaller than the default", () => {
      const stockSprite = createMockSprite();
      const scene = {
        scale: { width: 903.5, height: 512 },
        stockPile: pile({ x: 0, y: 0 }, [
          { position: { x: 10, y: 20 }, sprite: asSprite(stockSprite) },
        ]),
        wastePile: pile({ x: 0, y: 0 }, []),
        foundationPiles: [],
        tableauPiles: [],
      };
      const layoutManager = new BoardLayoutManager(
        scene as unknown as BoardScene,
      );

      layoutManager.createInitialLayout();
      layoutManager.updateVisualLayout();

      expect(scene.stockPile.position).toEqual({ x: 20, y: 93 });
      expect({
        x: stockSprite.x,
        y: stockSprite.y,
        scale: stockSprite.scale,
      }).toEqual({ x: 25, y: 103, scale: 0.5 });
    });
  });

  describe("getScaleFactor", () => {
    function scaleFactorFor(scale?: { width: number; height: number }): number {
      const scene = { scale } as unknown as BoardScene;
      return new BoardLayoutManager(scene).getScaleFactor();
    }

    it("defaults to 1.0 when the viewport scale is missing", () => {
      expect(scaleFactorFor(undefined)).toBe(1.0);
    });

    it("caps at 1.0 when the viewport is larger than the default", () => {
      expect(scaleFactorFor({ width: 3000, height: 2000 })).toBe(1.0);
    });

    it("defaults to 1.0 when the computed scale is not positive", () => {
      expect(scaleFactorFor({ width: -10, height: -20 })).toBe(1.0);
    });
  });
});
