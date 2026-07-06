import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardViewApplier } from "@/game/render/scene/board/view/board_view_applier";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { BoardViewState } from "@/game/render/scene/board/view/board_view_state";
import { asSprite, createMockSprite } from "@test/support/phaser_mocks";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.geomPhaserMock();
});

describe("BoardViewApplier", () => {
  let boardScene: BoardScene;
  let applier: BoardViewApplier;
  let mockGraphics: {
    clear: ReturnType<typeof vi.fn>;
    lineStyle: ReturnType<typeof vi.fn>;
    strokeRoundedRect: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    strokePath: ReturnType<typeof vi.fn>;
    setDepth: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGraphics = {
      clear: vi.fn(),
      lineStyle: vi.fn(),
      strokeRoundedRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      strokePath: vi.fn(),
      setDepth: vi.fn(),
    };

    const add = {
      graphics: vi.fn().mockReturnValue(mockGraphics),
    };

    const input = {
      setDraggable: vi.fn(),
    };

    boardScene = {
      add,
      input,
      cardVisualsMap: new Map(),
      stockPile: { sprite: createMockSprite() },
      tableauPiles: Array.from({ length: 7 }, () => ({ sprite: createMockSprite() })),
      foundationPiles: Array.from({ length: 4 }, () => ({ sprite: createMockSprite() })),
    } as unknown as BoardScene;

    applier = new BoardViewApplier(boardScene);
  });

  it("snaps backgrounds immediately", () => {
    const vs: BoardViewState = {
      backgrounds: [
        { pileId: "stock", x: 100, y: 200, scale: 0.8, depth: 5, cursor: "pointer" },
      ],
      cards: [],
      highlight: null,
    };

    const sprite = boardScene.stockPile.sprite!;
    sprite.input = { cursor: "default" };

    applier.apply(vs, 16);

    expect(sprite.x).toBe(100);
    expect(sprite.y).toBe(200);
    expect(sprite.scale).toBe(0.8);
    expect(sprite.depth).toBe(5);
    expect(sprite.input?.cursor).toBe("pointer");
  });

  it("snaps cards when snap flag is true", () => {
    const cardSprite = createMockSprite({ x: 50, y: 50 });
    boardScene.cardVisualsMap.set("card-1", { sprite: asSprite(cardSprite) } as any);

    const vs: BoardViewState = {
      backgrounds: [],
      cards: [
        {
          cardId: "card-1",
          x: 100,
          y: 200,
          scale: 1.0,
          depth: 10,
          frame: "card-1-frame",
          cursor: "pointer",
          draggable: true,
          snap: true,
        },
      ],
      highlight: null,
    };

    applier.apply(vs, 16);

    expect(cardSprite.x).toBe(100);
    expect(cardSprite.y).toBe(200);
    expect(cardSprite.scale).toBe(1.0);
    expect(cardSprite.depth).toBe(10);
    expect(boardScene.input.setDraggable).toHaveBeenCalledWith(asSprite(cardSprite), true);
  });

  it("eases cards when snap flag is false", () => {
    const cardSprite = createMockSprite({ x: 0, y: 0 });
    boardScene.cardVisualsMap.set("card-1", { sprite: asSprite(cardSprite) } as any);

    const vs: BoardViewState = {
      backgrounds: [],
      cards: [
        {
          cardId: "card-1",
          x: 100,
          y: 100,
          scale: 1.0,
          depth: 10,
          frame: "card-1-frame",
          cursor: "pointer",
          draggable: true,
          snap: false,
        },
      ],
      highlight: null,
    };

    // Delta ~16ms (1 frame at 60fps), tau = 90ms
    // k = 1 - exp(-16/90) = ~0.1628
    // target x = 100, starting x = 0
    // new x = 0 + 100 * 0.1628 = ~16.28
    applier.apply(vs, 16);

    expect(cardSprite.x).toBeGreaterThan(15);
    expect(cardSprite.x).toBeLessThan(18);
    expect(cardSprite.y).toBeGreaterThan(15);
    expect(cardSprite.y).toBeLessThan(18);

    // Call it again to see it settle further
    const currentX = cardSprite.x;
    applier.apply(vs, 16);
    expect(cardSprite.x).toBeGreaterThan(currentX);

    // snap immediately on delta <= 0
    applier.apply(vs, 0);
    expect(cardSprite.x).toBe(100);
  });

  it("draws highlighting for full vs openBottom highlights", () => {
    const vs: BoardViewState = {
      backgrounds: [],
      cards: [],
      highlight: {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        scale: 1.0,
        openBottom: false,
      },
    };

    applier.apply(vs, 16);
    expect(mockGraphics.strokeRoundedRect).toHaveBeenCalledWith(10, 20, 100, 150, 12);

    const vsOpen: BoardViewState = {
      backgrounds: [],
      cards: [],
      highlight: {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        scale: 1.0,
        openBottom: true,
      },
    };

    applier.apply(vsOpen, 16);
    expect(mockGraphics.beginPath).toHaveBeenCalled();
    expect(mockGraphics.strokePath).toHaveBeenCalled();
  });
});
