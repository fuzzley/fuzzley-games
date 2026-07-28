import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import { PhaserTableRenderer } from "@/engine/render/phaser/phaser_table_renderer";
import { PhaserSprites } from "@/engine/render/phaser/phaser_sprites";
import {
  TableViewState,
  CardView,
  HighlightView,
} from "@/engine/render/view/table_view_state";
import { HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE } from "@/engine/render/layout/board_geometry";
import { STOCK_PILE_ID } from "@/games/klondike/klondike_zones";
import {
  asSprite,
  createMockGraphics,
  createMockSprite,
  MockGraphics,
  MockSprite,
} from "@test/support/phaser_mocks";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.geomPhaserMock();
});

/** The distance a hover expansion nudges a card at a layout scale of 1. */
const HOVER_NUDGE_PX = HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE;

describe("PhaserTableRenderer", () => {
  let applier: PhaserTableRenderer;
  /** Every graphics object the applier has asked the scene for, in order. */
  let borders: MockGraphics[];
  /** The board's draggability setter, so tests can assert what it was told. */
  let setDraggable: Mock;
  /** The card sprites the applier can find, keyed by card id. */
  let cardSprites: Map<string, MockSprite>;
  /** The pile background sprites the applier can find, keyed by pile id. */
  let pileBackgrounds: Map<string, MockSprite>;

  beforeEach(() => {
    borders = [];
    setDraggable = vi.fn();
    cardSprites = new Map();
    pileBackgrounds = new Map([[STOCK_PILE_ID, createMockSprite()]]);

    // The applier only needs to find sprites and add graphics, so the whole
    // seam is satisfied by two maps — no Phaser scene stand-in required.
    const sprites: PhaserSprites = {
      cardSprite: (cardId) => {
        const sprite = cardSprites.get(cardId);
        return sprite ? asSprite(sprite) : undefined;
      },
      pileBackgroundSprite: (pileId) => {
        const sprite = pileBackgrounds.get(pileId);
        return sprite ? asSprite(sprite) : undefined;
      },
      addGraphics: () => {
        const graphics = createMockGraphics();
        borders.push(graphics);
        return graphics as unknown as Phaser.GameObjects.Graphics;
      },
      setDraggable,
    };

    applier = new PhaserTableRenderer(sprites);
  });

  /** Registers a card sprite the applier can find, and returns the mock. */
  function registerCard(cardId: string, x = 0, y = 0): MockSprite {
    const sprite = createMockSprite({ x, y });
    cardSprites.set(cardId, sprite);
    return sprite;
  }

  /** A card view with the fields this suite does not care about filled in. */
  function cardView(
    overrides: Partial<CardView> & { cardId: string },
  ): CardView {
    return {
      x: 0,
      y: 0,
      scale: 1,
      depth: 1,
      frame: "frame",
      cursor: "pointer",
      draggable: true,
      snap: false,
      ...overrides,
    };
  }

  /** A highlight view sized 100x150 at scale 1, anchored as given. */
  function highlightView(
    anchor: HighlightView["anchor"],
    overrides: Partial<HighlightView> = {},
  ): HighlightView {
    return {
      anchor,
      width: 100,
      height: 150,
      scale: 1,
      depth: 2000,
      openBottom: false,
      ...overrides,
    };
  }

  it("snaps backgrounds immediately", () => {
    const viewState: TableViewState = {
      backgrounds: [
        {
          pileId: STOCK_PILE_ID,
          x: 100,
          y: 200,
          scale: 0.8,
          depth: 5,
          cursor: "pointer",
        },
      ],
      cards: [],
      highlights: [],
    };

    const sprite = pileBackgrounds.get(STOCK_PILE_ID)!;
    // Pile backgrounds are interactive in the real scene, which is what gives
    // them the `input.cursor` the applier writes to.
    sprite.setInteractive();

    applier.apply(viewState, 16);

    expect(sprite.x).toBe(100);
    expect(sprite.y).toBe(200);
    expect(sprite.scale).toBe(0.8);
    expect(sprite.depth).toBe(5);
    expect(sprite.input?.cursor).toBe("pointer");
  });

  it("snaps cards when snap flag is true", () => {
    const cardSprite = registerCard("card-1", 50, 50);

    const viewState: TableViewState = {
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
      highlights: [],
    };

    applier.apply(viewState, 16);

    expect(cardSprite.x).toBe(100);
    expect(cardSprite.y).toBe(200);
    expect(cardSprite.scale).toBe(1.0);
    expect(cardSprite.depth).toBe(10);
    expect(setDraggable).toHaveBeenCalledWith(asSprite(cardSprite), true);
  });

  it("eases cards when snap flag is false", () => {
    const cardSprite = registerCard("card-1", 0, 0);

    const viewState: TableViewState = {
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
      highlights: [],
    };

    // Delta ~16ms (1 frame at 60fps), tau = 90ms
    // k = 1 - exp(-16/90) = ~0.1628
    // target x = 100, starting x = 0
    // new x = 0 + 100 * 0.1628 = ~16.28
    applier.apply(viewState, 16);

    expect(cardSprite.x).toBeGreaterThan(15);
    expect(cardSprite.x).toBeLessThan(18);
    expect(cardSprite.y).toBeGreaterThan(15);
    expect(cardSprite.y).toBeLessThan(18);

    // Call it again to see it settle further
    const currentX = cardSprite.x;
    applier.apply(viewState, 16);
    expect(cardSprite.x).toBeGreaterThan(currentX);

    // snap immediately on delta <= 0
    applier.apply(viewState, 0);
    expect(cardSprite.x).toBe(100);
  });

  describe("travelling cards", () => {
    it("reports a card that has not reached its target", () => {
      registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400 })],
        highlights: [],
      };

      applier.apply(viewState, 16);

      expect(applier.areCardsTravelling(["card-1"])).toBe(true);
    });

    it("reports a card that has arrived as landed", () => {
      registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400 })],
        highlights: [],
      };
      applier.apply(viewState, 16); // in flight

      applier.apply(viewState, 0); // delta 0 lands the card

      expect(applier.areCardsTravelling(["card-1"])).toBe(false);
    });

    it("reports a stack as travelling while any of it is still moving", () => {
      registerCard("landed", 400, 400);
      registerCard("moving", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [
          cardView({ cardId: "landed", x: 400, y: 400 }),
          cardView({ cardId: "moving", x: 400, y: 445 }),
        ],
        highlights: [],
      };

      applier.apply(viewState, 16);

      expect(applier.areCardsTravelling(["landed", "moving"])).toBe(true);
    });
  });

  describe("highlight borders", () => {
    it("strokes a closed border in its own space and moves it to the anchor", () => {
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [highlightView({ kind: "point", x: 10, y: 20 })],
      };

      applier.apply(viewState, 16);

      // The path is drawn at the origin so following an anchor only costs a
      // setPosition, never a redraw.
      expect(borders[0].strokeRoundedRect).toHaveBeenCalledWith(
        0,
        0,
        100,
        150,
        12,
      );
      expect([borders[0].x, borders[0].y]).toEqual([10, 20]);
    });

    it("strokes an open path for an openBottom border", () => {
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [
          highlightView({ kind: "point", x: 10, y: 20 }, { openBottom: true }),
        ],
      };

      applier.apply(viewState, 16);

      expect(borders[0].strokeRoundedRect).not.toHaveBeenCalled();
      expect(borders[0].strokePath).toHaveBeenCalled();
    });

    it("gives each border the depth its highlight asks for", () => {
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [
          highlightView({ kind: "point", x: 10, y: 20 }, { depth: 999 }),
          highlightView({ kind: "point", x: 30, y: 40 }, { depth: 2000 }),
        ],
      };

      applier.apply(viewState, 16);

      expect(borders.map((border) => border.depth)).toEqual([999, 2000]);
    });

    it("places a card border at the sprite rather than at the layout target", () => {
      const sprite = registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400, snap: true })],
        highlights: [highlightView({ kind: "card", cardId: "card-1" })],
      };

      applier.apply(viewState, 16);

      // Snapped, so the sprite is already at the target and the border is on it.
      expect([borders[0].x, borders[0].y]).toEqual([sprite.x, sprite.y]);
    });

    it("hides a card border while the card is still crossing the board", () => {
      registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400, snap: false })],
        highlights: [highlightView({ kind: "card", cardId: "card-1" })],
      };

      applier.apply(viewState, 16);

      // A card mid-flight is on its way out from under the pointer.
      expect(borders).toEqual([]);
    });

    it("keeps a card border on a card settling the last pixels into its slot", () => {
      const sprite = registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        // A hover expansion retracting is a nudge of a few pixels, not a trip
        // across the board, so the border must not blink out while it eases.
        cards: [
          cardView({ cardId: "card-1", x: 0, y: HOVER_NUDGE_PX, snap: false }),
        ],
        highlights: [highlightView({ kind: "card", cardId: "card-1" })],
      };

      applier.apply(viewState, 16);

      expect([borders[0].x, borders[0].y]).toEqual([sprite.x, sprite.y]);
    });

    it("scales the settle tolerance with the layout", () => {
      registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        // Twice a nudge, which only a doubled layout scale can account for.
        cards: [
          cardView({
            cardId: "card-1",
            x: 0,
            y: HOVER_NUDGE_PX * 2,
            snap: false,
          }),
        ],
        highlights: [
          highlightView({ kind: "card", cardId: "card-1" }, { scale: 2 }),
        ],
      };

      applier.apply(viewState, 16);

      expect(borders.length).toBe(1);
    });

    it("shows the card border once the card has settled", () => {
      registerCard("card-1", 0, 0);
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400, snap: false })],
        highlights: [highlightView({ kind: "card", cardId: "card-1" })],
      };
      applier.apply(viewState, 16); // in flight, nothing drawn

      applier.apply(viewState, 0); // delta 0 snaps the card home

      expect([borders[0].x, borders[0].y]).toEqual([400, 400]);
    });

    it("draws a border for each highlight", () => {
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [
          highlightView({ kind: "point", x: 10, y: 20 }),
          highlightView({ kind: "point", x: 30, y: 40 }),
        ],
      };

      applier.apply(viewState, 16);

      expect(borders.map((border) => [border.x, border.y])).toEqual([
        [10, 20],
        [30, 40],
      ]);
    });

    it("hides the borders left over when fewer highlights are drawn", () => {
      const twoHighlights: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [
          highlightView({ kind: "point", x: 10, y: 20 }),
          highlightView({ kind: "point", x: 30, y: 40 }),
        ],
      };
      applier.apply(twoHighlights, 16);

      applier.apply({ backgrounds: [], cards: [], highlights: [] }, 16);

      expect(borders.map((border) => border.visible)).toEqual([false, false]);
    });

    it("reuses its borders instead of creating one per frame", () => {
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [],
        highlights: [highlightView({ kind: "point", x: 10, y: 20 })],
      };

      applier.apply(viewState, 16);
      applier.apply(viewState, 16);
      applier.apply(viewState, 16);

      expect(borders.length).toBe(1);
    });

    it("re-strokes a border only when its shape changes", () => {
      const border = highlightView({ kind: "point", x: 10, y: 20 });
      const moved = highlightView({ kind: "point", x: 90, y: 90 });
      const taller = { ...moved, height: 300 };

      applier.apply({ backgrounds: [], cards: [], highlights: [border] }, 16);
      applier.apply({ backgrounds: [], cards: [], highlights: [moved] }, 16);
      const strokesAfterMove = borders[0].strokeRoundedRect.mock.calls.length;
      applier.apply({ backgrounds: [], cards: [], highlights: [taller] }, 16);

      expect(strokesAfterMove).toBe(1); // moving alone does not redraw
      expect(borders[0].strokeRoundedRect.mock.calls.length).toBe(2);
    });
  });
});
