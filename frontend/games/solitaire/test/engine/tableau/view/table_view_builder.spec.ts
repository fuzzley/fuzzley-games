import { describe, it, expect, beforeEach } from "vitest";
import {
  FakeTableGame,
  StockOverrideTableGame,
} from "@test/support/fake_table/game";
import {
  FAKE_TABLE_LAYOUT,
  buildFakeTableViewState,
  measureFakeTable,
} from "@test/support/fake_table/board";
import { measureTable } from "@/engine/render/layout/table_metrics";
import { buildTableViewState } from "@/engine/tableau/view/table_view_builder";
import { resolveDragTarget } from "@/engine/tableau/view/drag";
import { PileBackgroundView } from "@/engine/render/view/table_view_state";
import { TableInteractionState } from "@/engine/render/input/interaction_state";
import { Viewport } from "@/engine/render/layout/viewport";
import {
  CARD_RENDER_WIDTH_PX,
  CARD_RENDER_HEIGHT_PX,
} from "@/engine/render/layout/card_metrics";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import {
  TABLEAU_FACE_UP_OFFSET,
  TABLEAU_FACE_DOWN_OFFSET,
  TABLEAU_HOVER_EXPANSION_OFFSET,
} from "@test/support/fake_table/zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { TestPresentation } from "@test/support/presentation";

const presentation = new TestPresentation();

describe("board_view_state_builder", () => {
  let game: FakeTableGame;
  const viewport: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };
  let interaction: TableInteractionState;

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    interaction = {
      hoveredCardId: null,
      hoveredBackgroundPileId: null,
      drag: null,
      flights: [],
      snapAll: false,
    };
  });

  it("computes positions, scales, and depths for all piles and card views", () => {
    emptyBoard(game);
    const card = relocate(game, "card-hearts-ace", game.tableaus[0], true);

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    expect(viewState.backgrounds.length).toBe(12); // stock, 4 foundations, 7 tableaus
    expect(viewState.cards.length).toBe(1);

    const cardView = viewState.cards[0];
    expect(cardView.cardId).toBe(card.id);
    // A full design viewport at 1x allows a layout scale of 1.0.
    expect(cardView.scale).toBe(1.0);
    expect(cardView.depth).toBe(depthFor(RenderLayer.RESTING_CARD, 0));
    expect(cardView.frame).toBe(card.id); // face-up card uses its id
    expect(cardView.cursor).toBe("pointer");
    expect(cardView.draggable).toBe(true);
    expect(cardView.snap).toBe(false);
  });

  it("gives no two resting cards the same depth", () => {
    // A freshly dealt board, so every pile that holds cards holds several.
    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    // Per-pile depths would tie across piles and leave what covers what to the
    // order the sprites happened to be created in.
    const depths = viewState.cards.map((card) => card.depth);
    expect(new Set(depths).size).toBe(depths.length);
  });

  it("stacks a pile's cards in the order they sit in it", () => {
    emptyBoard(game);
    const lower = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const upper = relocate(game, "card-hearts-2", game.tableaus[0], true);

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    const lowerView = viewState.cards.find((c) => c.cardId === lower.id)!;
    const upperView = viewState.cards.find((c) => c.cardId === upper.id)!;
    expect(upperView.depth).toBeGreaterThan(lowerView.depth);
  });

  it("handles snapAll flag correctly", () => {
    interaction.snapAll = true;
    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );
    expect(viewState.cards.every((cardView) => cardView.snap)).toBe(true);
  });

  it("overrides position/depth/snap for dragged cards", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.drag = {
      cardIds: [card1.id, card2.id],
      primary: { x: 500, y: 600 },
    };
    interaction.hoveredCardId = card1.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    const cardView1 = viewState.cards.find((card) => card.cardId === card1.id)!;
    const cardView2 = viewState.cards.find((card) => card.cardId === card2.id)!;

    expect(cardView1.x).toBe(500);
    expect(cardView1.y).toBe(600);
    expect(cardView1.depth).toBe(depthFor(RenderLayer.HELD_CARD, 0));
    expect(cardView1.snap).toBe(true);

    expect(cardView2.x).toBe(500);
    expect(cardView2.y).toBe(600 + 45); // offset for tableau drag
    expect(cardView2.depth).toBe(depthFor(RenderLayer.HELD_CARD, 1));
    expect(cardView2.snap).toBe(true);
  });

  describe("a stack flying to the pile it was moved to", () => {
    /** Returns the depth of the topmost card on the board as it stands. */
    function deepestRestingDepth(): number {
      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );
      return Math.max(...viewState.cards.map((card) => card.depth));
    }

    it("lifts the flying card above every card resting on the board", () => {
      // An ace auto-moved to a foundation is the first card there, so its
      // resting depth is the lowest on the board while it is still crossing it.
      const card = relocate(game, "card-hearts-ace", game.foundations[0]);
      const restingDepth = deepestRestingDepth();
      interaction.flights = [{ cardIds: [card.id] }];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const flying = viewState.cards.find((view) => view.cardId === card.id)!;
      expect(flying.depth).toBeGreaterThan(restingDepth);
    });

    it("keeps the flying stack in its own order", () => {
      const lower = relocate(game, "card-spades-6", game.tableaus[1]);
      const upper = relocate(game, "card-hearts-5", game.tableaus[1]);
      interaction.flights = [{ cardIds: [lower.id, upper.id] }];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const lowerView = viewState.cards.find((v) => v.cardId === lower.id)!;
      const upperView = viewState.cards.find((v) => v.cardId === upper.id)!;
      expect(upperView.depth).toBeGreaterThan(lowerView.depth);
    });

    it("draws a later flight over one still settling", () => {
      const earlier = relocate(game, "card-hearts-ace", game.foundations[0]);
      const later = relocate(game, "card-spades-ace", game.foundations[1]);
      interaction.flights = [
        { cardIds: [earlier.id] },
        { cardIds: [later.id] },
      ];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const earlierView = viewState.cards.find((v) => v.cardId === earlier.id)!;
      const laterView = viewState.cards.find((v) => v.cardId === later.id)!;
      expect(laterView.depth).toBeGreaterThan(earlierView.depth);
    });

    it("lifts every stack in the air above the resting board", () => {
      const first = relocate(game, "card-hearts-ace", game.foundations[0]);
      const second = relocate(game, "card-spades-ace", game.foundations[1]);
      const restingDepth = deepestRestingDepth();
      interaction.flights = [{ cardIds: [first.id] }, { cardIds: [second.id] }];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const flying = viewState.cards.filter((view) =>
        [first.id, second.id].includes(view.cardId),
      );
      expect(flying.every((view) => view.depth > restingDepth)).toBe(true);
    });

    it("keeps the flying stack below a stack in hand", () => {
      const card = relocate(game, "card-hearts-ace", game.foundations[0]);
      interaction.flights = [{ cardIds: [card.id] }];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const flying = viewState.cards.find((view) => view.cardId === card.id)!;
      expect(flying.depth).toBeLessThan(depthFor(RenderLayer.HELD_CARD, 0));
    });

    it("lands the card back among the resting cards once the flight ends", () => {
      const card = relocate(game, "card-hearts-ace", game.foundations[0]);
      interaction.flights = [];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const landed = viewState.cards.find((view) => view.cardId === card.id)!;
      expect(landed.depth).toBeLessThan(depthFor(RenderLayer.FLYING_CARD, 0));
    });

    it("leaves the card's position to its pile while it flies", () => {
      const card = relocate(game, "card-hearts-ace", game.foundations[0]);
      const resting = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      ).cards.find((view) => view.cardId === card.id)!;
      interaction.flights = [{ cardIds: [card.id] }];

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      // Only the depth is lifted: the applier eases the sprite to the pile, so
      // the target it eases towards must stay the card's place in that pile.
      const flying = viewState.cards.find((view) => view.cardId === card.id)!;
      expect([flying.x, flying.y]).toEqual([resting.x, resting.y]);
    });
  });

  it("draws highlight over empty stock if hovered", () => {
    emptyBoard(game); // stock is empty
    interaction.hoveredBackgroundPileId = "stock";

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    const stockBackground = viewState.backgrounds.find(
      (backgroundView) => backgroundView.pileId === "stock",
    )!;
    expect(viewState.highlights).toEqual([
      {
        anchor: { kind: "point", x: stockBackground.x, y: stockBackground.y },
        width: CARD_RENDER_WIDTH_PX,
        height: CARD_RENDER_HEIGHT_PX,
        scale: 1,
        depth: depthFor(RenderLayer.HOVER_HINT),
        openBottom: false,
      },
    ]);
  });

  describe("a placeholder its game redraws", () => {
    let overridden: StockOverrideTableGame;

    beforeEach(() => {
      overridden = new StockOverrideTableGame();
      overridden.startNewGame();
      emptyBoard(overridden);
    });

    /** Returns the stock's placeholder in the frame the game draws now. */
    function stockBackground(): PileBackgroundView | undefined {
      return buildFakeTableViewState(overridden, presentation)(
        interaction,
        viewport,
      ).backgrounds.find((background) => background.pileId === "stock");
    }

    it("draws a placeholder from its zone's artwork by default", () => {
      const background = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      ).backgrounds.find((view) => view.pileId === "stock");

      expect(background?.frame).toBe(game.zoneFor("stock")?.backgroundKey);
    });

    it("draws a placeholder from the artwork its game shows now", () => {
      overridden.stockBackgroundKey = "card-placeholder-full-border";

      expect(stockBackground()?.frame).toBe("card-placeholder-full-border");
    });

    it("draws a placeholder in the artwork its grid swaps in", () => {
      const grid = {
        ...FAKE_TABLE_LAYOUT,
        pileBackgrounds: { stock: () => "card-placeholder-full-border-circle" },
      };
      const metrics = measureTable(grid, viewport);

      const background = buildTableViewState(
        overridden,
        interaction,
        metrics,
        "back",
      ).backgrounds.find((view) => view.pileId === "stock");

      expect(background?.frame).toBe("card-placeholder-full-border-circle");
    });

    it("gives a pressable empty slot a pointer", () => {
      overridden.stockActionable = true;

      expect(stockBackground()?.cursor).toBe("pointer");
    });

    it("gives an empty slot that would do nothing the default cursor", () => {
      overridden.stockActionable = false;

      expect(stockBackground()?.cursor).toBe("default");
    });

    it("draws no hover border over an empty slot that would do nothing", () => {
      overridden.stockActionable = false;
      interaction.hoveredBackgroundPileId = "stock";

      const viewState = buildFakeTableViewState(overridden, presentation)(
        interaction,
        viewport,
      );

      expect(viewState.highlights).toEqual([]);
    });
  });

  it("anchors a hover highlight to the card rather than to its slot", () => {
    emptyBoard(game);
    const card = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    interaction.hoveredCardId = card.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    // Naming the card leaves the applier free to draw the border where the
    // sprite actually is, which is not the slot while the card is travelling.
    expect(viewState.highlights[0].anchor).toEqual({
      kind: "card",
      cardId: card.id,
    });
  });

  it("draws openBottom highlight for covered cards in a tableau", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    relocate(game, "card-hearts-2", game.tableaus[0], true);

    // Hover the bottom card (card1) which is covered by card2
    interaction.hoveredCardId = card1.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    expect(viewState.highlights[0].openBottom).toBe(true);
  });

  it("draws a closed highlight for the top card of a tableau", () => {
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.hoveredCardId = card2.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    expect(viewState.highlights[0].openBottom).toBe(false);
  });

  it("draws no highlight for a card that cannot be interacted with", () => {
    emptyBoard(game);
    const facedown = relocate(game, "card-hearts-ace", game.tableaus[0], false);
    relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.hoveredCardId = facedown.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    expect(viewState.highlights).toEqual([]);
  });

  it("expands the pile below a face-up hovered tableau card", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.hoveredCardId = card1.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    const cardView1 = viewState.cards.find((c) => c.cardId === card1.id)!;
    const cardView2 = viewState.cards.find((c) => c.cardId === card2.id)!;
    // The covering card slides down by the face-up gap plus the hover expansion.
    expect(cardView2.y - cardView1.y).toBe(
      TABLEAU_FACE_UP_OFFSET + TABLEAU_HOVER_EXPANSION_OFFSET,
    );
  });

  it("does not expand the pile below a face-down hovered tableau card", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], false);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.hoveredCardId = card1.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    const cardView1 = viewState.cards.find((c) => c.cardId === card1.id)!;
    const cardView2 = viewState.cards.find((c) => c.cardId === card2.id)!;
    // A card drawn face down has nothing to reveal, so no gap opens beneath it.
    expect(cardView2.y - cardView1.y).toBe(TABLEAU_FACE_DOWN_OFFSET);
  });

  it("scales the layout up to the pixel ratio on a high density display", () => {
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0], true);
    // Twice the design viewport in device pixels: the same layout, at 2x.
    const retinaViewport: Viewport = {
      width: 1920 * 2,
      height: 1080 * 2,
      pixelRatio: 2,
    };

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      retinaViewport,
    );

    expect(viewState.cards[0].scale).toBe(2.0);
  });

  it("keeps a card in the same place on screen at a higher pixel ratio", () => {
    emptyBoard(game);
    const card = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const retinaViewport: Viewport = {
      width: 1920 * 2,
      height: 1080 * 2,
      pixelRatio: 2,
    };

    const retinaState = buildFakeTableViewState(game, presentation)(
      interaction,
      retinaViewport,
    );

    // Device pixels are twice as dense, so the same CSS position is twice the
    // coordinate. Anchored to the header, which is a CSS-pixel DOM overlay.
    const baseView = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    ).cards.find((cardView) => cardView.cardId === card.id)!;
    const retinaView = retinaState.cards.find(
      (cardView) => cardView.cardId === card.id,
    )!;
    expect([retinaView.x, retinaView.y]).toEqual([
      baseView.x * 2,
      baseView.y * 2,
    ]);
  });

  describe("drag highlights", () => {
    /** Returns the layout origin of a pile at this viewport. */
    function originOf(pileId: string): { x: number; y: number } {
      return measureFakeTable(viewport).origins.get(pileId)!;
    }

    /** Picks up a card from tableau-0 and holds it over the given point. */
    function drag(cardId: string, over: { x: number; y: number }): void {
      interaction.drag = {
        cardIds: [relocate(game, cardId, game.tableaus[0], true).id],
        primary: { x: over.x, y: over.y },
      };
    }

    beforeEach(() => {
      emptyBoard(game);
    });

    it("outlines the top card of the pile the stack would land on", () => {
      const sevenHearts = relocate(game, "card-hearts-7", game.tableaus[1]);
      drag("card-spades-6", originOf("tableau-1")); // black 6 onto red 7

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      expect(viewState.highlights[0].anchor).toEqual({
        kind: "card",
        cardId: sevenHearts.id,
      });
    });

    it("outlines the pile itself when it has no top card to land on", () => {
      const tableau1 = originOf("tableau-1");
      drag("card-spades-king", tableau1); // only a King may take an empty column

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      expect(viewState.highlights[0].anchor).toEqual({
        kind: "point",
        x: tableau1.x,
        y: tableau1.y,
      });
    });

    it("sizes the border to a card rather than to the whole column", () => {
      relocate(game, "card-hearts-7", game.tableaus[1]);
      relocate(game, "card-clubs-6", game.tableaus[1]);
      drag("card-diamonds-5", originOf("tableau-1"));

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      // The column is two cards deep, so its drop rectangle is taller than the
      // border that marks the landing place.
      expect([
        viewState.highlights[0].width,
        viewState.highlights[0].height,
      ]).toEqual([CARD_RENDER_WIDTH_PX, CARD_RENDER_HEIGHT_PX]);
    });

    it("draws no border on the card in hand", () => {
      relocate(game, "card-hearts-7", game.tableaus[1]);
      drag("card-spades-6", originOf("tableau-1"));

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      // The card is already lifted and following the pointer; the only thing
      // left to say is where it is going.
      expect(viewState.highlights.length).toBe(1);
    });

    it("keeps the border under the dragged stack", () => {
      relocate(game, "card-hearts-7", game.tableaus[1]);
      drag("card-spades-6", originOf("tableau-1"));

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      // The card in hand is held over the place it is going, so the border must
      // not be drawn across it.
      expect(viewState.highlights[0].depth).toBeLessThan(
        depthFor(RenderLayer.HELD_CARD, 0),
      );
    });

    it("keeps the border above the cards resting in the target pile", () => {
      relocate(game, "card-hearts-7", game.tableaus[1]);
      drag("card-spades-6", originOf("tableau-1"));

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      const deepestCard = Math.max(
        ...viewState.cards
          .filter((card) => card.depth < depthFor(RenderLayer.HELD_CARD, 0))
          .map((card) => card.depth),
      );
      expect(viewState.highlights[0].depth).toBeGreaterThan(deepestCard);
    });

    it("draws no border over a pile that would refuse the card", () => {
      relocate(game, "card-hearts-7", game.tableaus[1]);
      drag("card-diamonds-6", originOf("tableau-1")); // red 6 onto red 7

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      expect(viewState.highlights).toEqual([]);
    });

    it("draws no border over the pile the card was picked up from", () => {
      relocate(game, "card-hearts-7", game.tableaus[0]);
      drag("card-spades-6", originOf("tableau-0")); // legal rank and color

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      // Legal on its face, but a card cannot land back where it came from.
      expect(viewState.highlights).toEqual([]);
    });

    it("draws no border when the drag is over no pile at all", () => {
      drag("card-spades-king", { x: 9000, y: 9000 });

      const viewState = buildFakeTableViewState(game, presentation)(
        interaction,
        viewport,
      );

      expect(viewState.highlights).toEqual([]);
    });
  });

  it("sizes the hover highlight to the rendered card so it leaves no edge gap", () => {
    emptyBoard(game);
    const card = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    interaction.hoveredCardId = card.id;

    const viewState = buildFakeTableViewState(game, presentation)(
      interaction,
      viewport,
    );

    // Compared against the card's on-screen size, derived from its scale, so
    // the highlight cannot drift from the card it outlines.
    const cardView = viewState.cards.find((c) => c.cardId === card.id)!;
    expect([
      viewState.highlights[0].width,
      viewState.highlights[0].height,
    ]).toEqual([
      CARD_RENDER_WIDTH_PX * cardView.scale,
      CARD_RENDER_HEIGHT_PX * cardView.scale,
    ]);
  });
});

describe("board_view_state_builder on a grid whose fans fit their room", () => {
  const viewport: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };
  const FITTED = {
    ...FAKE_TABLE_LAYOUT,
    fanFit: { minFaceUpGap: 40, maxFaceUpGap: 110, minFaceDownGap: 10 },
  };
  let game: FakeTableGame;
  let interaction: TableInteractionState;

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    emptyBoard(game);
    interaction = {
      hoveredCardId: null,
      hoveredBackgroundPileId: null,
      drag: null,
      flights: [],
      snapAll: false,
    };
  });

  /** Lays a king and a queen in the first column and returns them. */
  function twoCards() {
    const king = relocate(game, "card-spades-king", game.tableaus[0]);
    const queen = relocate(game, "card-hearts-queen", game.tableaus[0]);
    return { king, queen };
  }

  it("draws a column's cards the fitted gap apart", () => {
    const { king, queen } = twoCards();
    const metrics = measureTable(FITTED, viewport);

    const cards = buildTableViewState(game, interaction, metrics, "back").cards;

    const y = (id: string) => cards.find((card) => card.cardId === id)!.y;
    expect(y(queen.id) - y(king.id)).toBe(110 * metrics.scale);
  });

  it("carries a stack from a fitted column the fitted gap apart", () => {
    const { king, queen } = twoCards();
    interaction.drag = {
      cardIds: [king.id, queen.id],
      primary: { x: 100, y: 100 },
    };
    const metrics = measureTable(FITTED, viewport);

    const cards = buildTableViewState(game, interaction, metrics, "back").cards;

    const held = cards.find((card) => card.cardId === queen.id)!;
    expect(held.y).toBe(100 + 110 * metrics.scale);
  });

  it("takes a drop over the part of a fitted column past its own gaps", () => {
    twoCards();
    const jack = relocate(game, "card-spades-jack", game.tableaus[1]);
    const metrics = measureTable(FITTED, viewport);
    const origin = metrics.origins.get(game.tableaus[0].id)!;
    const queenTop = origin.y + 110 * metrics.scale;

    // Lower than the queen would reach at the zone's own gap of 45.
    const target = resolveDragTarget(
      game,
      {
        cardIds: [jack.id],
        primary: { x: origin.x, y: queenTop + 0.8 * 313 * metrics.scale },
      },
      metrics,
    );

    expect(target?.pileId).toBe(game.tableaus[0].id);
  });
});
