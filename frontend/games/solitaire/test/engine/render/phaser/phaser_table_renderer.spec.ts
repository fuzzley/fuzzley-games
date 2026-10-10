import { vi, describe, it, expect, beforeEach, type Mock } from "vitest";
import {
  PhaserTableRenderer,
  HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE,
} from "@/engine/render/phaser/phaser_table_renderer";
import { PhaserSprites } from "@/engine/render/phaser/phaser_sprites";
import {
  TableViewState,
  CardView,
  HighlightView,
} from "@/engine/render/view/table_view_state";
import { CardArtScale } from "@/engine/render/deck/card_art_scale";
import { STOCK_PILE_ID } from "@test/support/fake_table/zones";
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

/** The artwork the stock's placeholder sprite starts out drawn from. */
const STOCK_FRAME = "card-placeholder-full-border-reset";

describe("PhaserTableRenderer", () => {
  let applier: PhaserTableRenderer;
  /** Every graphics object the applier has asked the scene for, in order. */
  let borders: MockGraphics[];
  /** The board's draggability setter, so tests can assert what it was told. */
  let setDraggable: Mock;
  /** The card sprites the applier can find, keyed by card id. */
  let cardSprites: Map<string, MockSprite>;
  /** The shadow sprites the applier can find, keyed by card id. */
  let cardShadows: Map<string, MockSprite>;
  /** The pile background sprites the applier can find, keyed by pile id. */
  let pileBackgrounds: Map<string, MockSprite>;
  /** The placeholders whose cursor the applier asked to show at once. */
  let cursorsShown: string[];
  /**
   * The density of the atlas the sprites are drawn from, 1 unless a test says
   * otherwise, so a sprite's scale is its view's.
   */
  let artScale: CardArtScale;

  beforeEach(() => {
    borders = [];
    setDraggable = vi.fn();
    cardSprites = new Map();
    cardShadows = new Map();
    pileBackgrounds = new Map([
      [STOCK_PILE_ID, createMockSprite({ frame: STOCK_FRAME })],
    ]);
    artScale = 1;
    cursorsShown = [];

    // The applier only needs to find sprites and add graphics, so the whole
    // seam is satisfied by maps — no Phaser scene stand-in required.
    const sprites: PhaserSprites = {
      get cardArtScale() {
        return artScale;
      },
      cardSprite: (cardId) => {
        const sprite = cardSprites.get(cardId);
        return sprite ? asSprite(sprite) : undefined;
      },
      cardShadowSprite: (cardId) => {
        const sprite = cardShadows.get(cardId);
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
      showPileBackgroundCursor: (pileId) => cursorsShown.push(pileId),
    };

    applier = new PhaserTableRenderer(sprites);
  });

  /** Registers a card sprite the applier can find, and returns the mock. */
  function registerCard(cardId: string, x = 0, y = 0): MockSprite {
    const sprite = createMockSprite({ x, y });
    cardSprites.set(cardId, sprite);
    return sprite;
  }

  /** Registers a card's shadow sprite, and returns the mock. */
  function registerShadow(cardId: string): MockSprite {
    const sprite = createMockSprite();
    cardShadows.set(cardId, sprite);
    return sprite;
  }

  /** Returns a card view with the fields this suite ignores filled in. */
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

  /** Returns a highlight view sized 100x150 at scale 1, anchored as given. */
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
          frame: STOCK_FRAME,
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

  describe("a placeholder that changes during a game", () => {
    /**
     * Returns a view state holding only the stock's placeholder, drawn from
     * the given artwork with the given cursor.
     */
    function stockDrawnFrom(
      frame: string,
      cursor?: "pointer" | "default",
    ): TableViewState {
      return {
        backgrounds: [
          {
            pileId: STOCK_PILE_ID,
            x: 100,
            y: 200,
            scale: 1,
            depth: 5,
            frame,
            cursor,
          },
        ],
        cards: [],
        highlights: [],
      };
    }

    it("swaps the artwork when its view asks for another", () => {
      const sprite = pileBackgrounds.get(STOCK_PILE_ID)!;

      applier.apply(stockDrawnFrom("card-placeholder-full-border"), 16);

      expect(sprite.frame.name).toBe("card-placeholder-full-border");
    });

    it("keeps the placeholder anchored at its top-left corner after a swap", () => {
      const sprite = pileBackgrounds.get(STOCK_PILE_ID)!;

      applier.apply(stockDrawnFrom("card-placeholder-full-border"), 16);

      expect([sprite.originX, sprite.originY]).toEqual([0, 0]);
    });

    it("shows a changed cursor at once, in case the pointer is already over it", () => {
      // An interactive mock sprite starts with the default cursor.
      pileBackgrounds.get(STOCK_PILE_ID)!.setInteractive();

      applier.apply(stockDrawnFrom(STOCK_FRAME, "pointer"), 16);

      expect(cursorsShown).toEqual([STOCK_PILE_ID]);
    });

    it("leaves the canvas cursor alone while the cursor stays the same", () => {
      pileBackgrounds.get(STOCK_PILE_ID)!.setInteractive();

      applier.apply(stockDrawnFrom(STOCK_FRAME, "default"), 16);

      expect(cursorsShown).toEqual([]);
    });

    it("leaves the artwork alone while its view asks for the same", () => {
      const sprite = pileBackgrounds.get(STOCK_PILE_ID)!;
      const setFrame = vi.spyOn(sprite, "setFrame");

      applier.apply(stockDrawnFrom(STOCK_FRAME), 16);

      expect(setFrame).not.toHaveBeenCalled();
    });
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

  describe("atlas density", () => {
    /** Returns a view state holding one card and the stock's placeholder. */
    function oneCardAt(scale: number): TableViewState {
      return {
        backgrounds: [
          {
            pileId: STOCK_PILE_ID,
            x: 0,
            y: 0,
            scale,
            depth: 5,
            frame: STOCK_FRAME,
          },
        ],
        cards: [cardView({ cardId: "card-1", scale })],
        highlights: [],
      };
    }

    it("draws 2x artwork texel for texel at a layout scale of 2", () => {
      artScale = 2;
      const card = registerCard("card-1");

      applier.apply(oneCardAt(2), 16);

      expect(card.scale).toBe(1);
    });

    it("draws 1x artwork texel for texel at a layout scale of 1", () => {
      artScale = 1;
      const card = registerCard("card-1");

      applier.apply(oneCardAt(1), 16);

      expect(card.scale).toBe(1);
    });

    it("scales a card, its shadow and the placeholders by the same density", () => {
      artScale = 2;
      const card = registerCard("card-1");
      const shadow = registerShadow("card-1");

      applier.apply(oneCardAt(0.5), 16);

      expect([
        card.scale,
        shadow.scale,
        pileBackgrounds.get(STOCK_PILE_ID)!.scale,
      ]).toEqual([0.25, 0.25, 0.25]);
    });
  });

  describe("card shadows", () => {
    it("keeps a shadow on its card while the card eases", () => {
      const card = registerCard("card-1", 0, 0);
      const shadow = registerShadow("card-1");
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", x: 400, y: 400, snap: false })],
        highlights: [],
      };

      applier.apply(viewState, 16);

      // Where the card is this frame, not where it is headed.
      expect([shadow.x, shadow.y]).toEqual([card.x, card.y]);
    });

    it("scales a shadow with its card", () => {
      registerCard("card-1");
      const shadow = registerShadow("card-1");
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [cardView({ cardId: "card-1", scale: 0.25 })],
        highlights: [],
      };

      applier.apply(viewState, 16);

      expect(shadow.scale).toBe(0.25);
    });

    it("draws a shadow under its card but over the card beneath", () => {
      registerCard("lower");
      registerCard("upper");
      const shadow = registerShadow("upper");
      const viewState: TableViewState = {
        backgrounds: [],
        cards: [
          cardView({ cardId: "lower", depth: 1010 }),
          cardView({ cardId: "upper", depth: 1011 }),
        ],
        highlights: [],
      };

      applier.apply(viewState, 16);

      expect(shadow.depth).toBeGreaterThan(1010);
      expect(shadow.depth).toBeLessThan(1011);
    });
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
