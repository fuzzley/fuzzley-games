import { vi, describe, it, expect, beforeEach } from "vitest";
import { deckCardIds } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { DEFAULT_DESKTOP_CARD_DECK } from "@/engine/render/card_deck";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import { designSize, measureTable } from "@/engine/render/layout/table_layout";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { cardAtlasTextureKey } from "@/engine/render/phaser/card_deck_atlas";
import { makeTableBoardScene } from "@/engine/board/table_board_scene";
import { NO_INSETS } from "@/engine/render/layout/viewport";
import { mirrorTable } from "@/engine/render/layout/board_layouts";
import {
  FAKE_TABLE_LAYOUT,
  fakeTableGestures,
} from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import { relocate } from "@test/support/game_scenarios";
import {
  MockGraphics,
  MockInput,
  MockScaleManager,
  MockSceneEvents,
  MockSprite,
  MockTextures,
  POST_UPDATE_EVENT,
  PRESS_ON_CANVAS,
  SHUTDOWN_EVENT,
} from "@test/support/phaser_mocks";
import { TestPresentation } from "@test/support/presentation";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** One suit of thirteen cards: fewer than a standard deck holds. */
const ONE_SUIT = deckCardIds({
  suits: [Suit.SPADE],
  ranks: ALL_RANKS,
  copies: 1,
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as MockSprite;
}

/** Views a scene's input plugin as the recording mock that raises its events. */
function inputOf(scene: BoardScene): MockInput {
  return scene.input as unknown as MockInput;
}

describe("makeTableBoardScene", () => {
  let game: FakeTableGame;
  let presentation: TestPresentation;
  let scene: BoardScene;

  /**
   * Builds and creates a board over the given game, the fake board's grid and
   * its gestures — the three things a real game supplies.
   */
  function buildScene(
    gameModel: FakeTableGame,
    onReady?: () => void,
  ): BoardScene {
    game = gameModel;
    presentation = new TestPresentation("card-back-red");
    const built = makeTableBoardScene({
      game,
      layouts: { roomy: FAKE_TABLE_LAYOUT },
      handleIntent: fakeTableGestures(game),
      presentation,
      onReady,
    });
    built.create();
    return built;
  }

  /** Returns a dealt game over the given deck, a standard 52 by default. */
  function dealtGame(cardIds?: typeof ONE_SUIT): FakeTableGame {
    const dealt = new FakeTableGame(cardIds);
    dealt.startNewGame();
    return dealt;
  }

  beforeEach(() => {
    scene = buildScene(dealtGame());
  });

  describe("the game it draws", () => {
    it("draws a placeholder under each pile whose zone declares one", () => {
      const withPlaceholder = game.piles
        .filter((pile) => scene.pileBackgroundSprite(pile.id))
        .map((pile) => pile.id);

      expect(withPlaceholder).toEqual(
        game.piles
          .filter((pile) => game.zoneFor(pile.id)?.backgroundKey)
          .map((pile) => pile.id),
      );
    });

    it("makes a sprite for every card the game holds, and no others", () => {
      const shortDeck = buildScene(dealtGame(ONE_SUIT));

      // Read from the game rather than from a deck specification, so a variant
      // dealing a shorter deck does not get sprites for cards it never deals.
      expect([...shortDeck.cardIds]).toEqual(
        ONE_SUIT.map((cardId) => playingCardInstanceId(cardId)),
      );
    });

    it("picks up the cards that travel with a grabbed one", () => {
      const lower = relocate(game, "card-spades-9", game.tableaus[0]);
      const upper = relocate(game, "card-hearts-8", game.tableaus[0]);

      inputOf(scene).emit(
        "dragstart",
        PRESS_ON_CANVAS,
        scene.cardSprite(lower.id),
      );
      scene.update(0, 16);

      const held = depthFor(RenderLayer.HELD_CARD);
      expect(
        [lower, upper].map(
          (card) => asMock(scene.cardSprite(card.id)).depth >= held,
        ),
      ).toEqual([true, true]);
    });
  });

  describe("the grid it was given", () => {
    it("lays the board out at that grid's design size", () => {
      // The mock scale manager has not sized a canvas, so the viewport falls
      // back to the design size of whichever layout the board was built with.
      const design = designSize(FAKE_TABLE_LAYOUT);
      expect([scene.viewport.width, scene.viewport.height]).toEqual([
        design.width,
        design.height,
      ]);
    });

    it("lays the board out below the inset the shell reports", () => {
      const inset = makeTableBoardScene({
        game,
        layouts: { roomy: FAKE_TABLE_LAYOUT },
        handleIntent: fakeTableGestures(game),
        presentation,
        insets: () => ({ ...NO_INSETS, top: 40 }),
      });

      // The unsized canvas falls back to the design size plus the inset, so
      // the board below it still lays out at a scale of 1.
      expect([
        inset.viewport.insets?.top,
        inset.viewport.height,
        measureTable(FAKE_TABLE_LAYOUT, inset.viewport).scale,
      ]).toEqual([40, designSize(FAKE_TABLE_LAYOUT).height + 40, 1]);
    });

    it("lands a released stack on the pile under it on that grid", () => {
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);
      const foundation = game.foundations[0];
      const origin = measureTable(
        FAKE_TABLE_LAYOUT,
        scene.viewport,
      ).origins.get(foundation.id)!;
      const sprite = scene.cardSprite(ace.id);

      inputOf(scene).emit("dragstart", PRESS_ON_CANVAS, sprite);
      inputOf(scene).emit("drag", {}, sprite, origin.x, origin.y);
      inputOf(scene).emit("dragend", {}, sprite);

      expect(game.getPileContainingCard(ace.id)).toBe(foundation);
    });
  });

  describe("the gestures it was given", () => {
    it("carries them out", () => {
      const top = game.stock.topCard!;

      asMock(scene.cardSprite(top.id)).emit("pointerdown", PRESS_ON_CANVAS);

      // Pressing the top of the stock is what draws on the fake board.
      expect(game.waste.size).toBe(3);
    });
  });

  describe("the presentation it was given", () => {
    it("draws new cards on the back the player chose", () => {
      const card = game.stock.topCard!;

      expect(asMock(scene.cardSprite(card.id)).frame.name).toBe(
        "card-back-red",
      );
    });

    it("repaints the table when the colour setting changes", () => {
      const camera = scene.cameras.main as unknown as {
        setBackgroundColor: ReturnType<typeof vi.fn>;
      };

      presentation.setBackgroundColor("#123456");

      expect(camera.setBackgroundColor).toHaveBeenCalledWith("#123456");
    });

    it("says which deck it is drawing", () => {
      expect(presentation.cardDeckStatuses).toEqual([
        { kind: "drawn", deckId: DEFAULT_DESKTOP_CARD_DECK },
      ]);
    });

    it("redraws from the deck the player switches to", () => {
      const classic = cardAtlasTextureKey({ deckId: "classic", artScale: 1 });
      const textures = scene.textures as unknown as MockTextures;
      textures.add(classic);

      presentation.setCardDeck("classic");

      const card = game.stock.topCard!;
      expect(asMock(scene.cardSprite(card.id)).texture.key).toBe(classic);
    });
  });

  describe("following the game", () => {
    /**
     * Hovers a card and draws a frame, then reports whether the highlight
     * border that puts up is still drawn.
     *
     * The renderer makes its borders lazily, so they are collected through the
     * scene's own factory rather than by reaching into the renderer.
     */
    function hoverACard(): () => boolean {
      const borders: MockGraphics[] = [];
      const addGraphics = scene.addGraphics.bind(scene);
      vi.spyOn(scene, "addGraphics").mockImplementation(() => {
        const graphics = addGraphics();
        borders.push(graphics as unknown as MockGraphics);
        return graphics;
      });
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      asMock(scene.cardSprite(ace.id)).emit("pointerover");
      scene.update(0, 16);
      return () => borders.some((border) => border.visible);
    }

    it("drops stale interaction state when the game deals again", () => {
      const anyBorderDrawn = hoverACard();

      game.startNewGame();
      scene.update(16, 16);

      // A highlight left over from the previous deal would be drawn around
      // whichever card has landed under it.
      expect(anyBorderDrawn()).toBe(false);
    });

    it("stops following the game once the scene shuts down", () => {
      const positions = () =>
        [...scene.cardIds].map((cardId) => {
          const sprite = asMock(scene.cardSprite(cardId));
          return { x: sprite.x, y: sprite.y };
        });
      scene.update(0, 16);

      (scene.events as unknown as MockSceneEvents).emit(SHUTDOWN_EVENT);
      game.startNewGame();
      scene.update(16, 16);
      const midway = positions();
      scene.update(32, 16);

      // Still easing: a subscription the shut-down scene left behind would
      // have snapped them into place.
      expect(positions()).not.toEqual(midway);
    });

    it("lifts the cards an action relocates over the board", () => {
      scene.update(0, 16);
      const top = game.stock.topCard!;

      asMock(scene.cardSprite(top.id)).emit("pointerdown", PRESS_ON_CANVAS);
      scene.update(16, 16);

      // A draw moves cards without any gesture reporting which, so only the
      // model can say they are crossing the board.
      const drawn = game.waste
        .getCards()
        .map((card) => asMock(scene.cardSprite(card.id)));
      const restingDepth = Math.max(
        ...game.tableaus.flatMap((pile) =>
          pile
            .getCards()
            .map((card) => asMock(scene.cardSprite(card.id)).depth),
        ),
      );
      expect(drawn.map((sprite) => sprite.depth > restingDepth)).toEqual([
        true,
        true,
        true,
      ]);
    });
  });

  describe("readiness", () => {
    it("reports ready once the first frame has been drawn", () => {
      let ready = false;
      const built = buildScene(dealtGame(), () => {
        ready = true;
      });

      (built.events as unknown as MockSceneEvents).emit(POST_UPDATE_EVENT);

      expect(ready).toBe(true);
    });

    it("stays silent until then", () => {
      let ready = false;

      buildScene(dealtGame(), () => {
        ready = true;
      });

      // Announcing early would let the shell reveal a canvas with nothing on
      // it yet.
      expect(ready).toBe(false);
    });
  });
});

describe("makeTableBoardScene on a game with arranged grids", () => {
  /**
   * The fake board with its foundations moved down a row, so a stack dropped
   * where the roomy grid puts them misses.
   */
  const PHONE_GRID = {
    ...FAKE_TABLE_LAYOUT,
    rows: 3,
    slots: FAKE_TABLE_LAYOUT.slots.map((slot) =>
      slot.pileId.startsWith("foundation") ? { ...slot, row: 2 } : slot,
    ),
  };

  /** The fake board's columns, left to right. */
  const COLUMNS = PHONE_GRID.slots
    .map((slot) => slot.pileId)
    .filter((pileId) => pileId.startsWith("tableau"));

  let game: FakeTableGame;
  let presentation: TestPresentation;
  let scene: BoardScene;

  beforeEach(() => {
    game = new FakeTableGame();
    game.startNewGame();
    presentation = new TestPresentation();
    scene = makeTableBoardScene({
      game,
      layouts: {
        roomy: FAKE_TABLE_LAYOUT,
        arranged: {
          roomy: { top: FAKE_TABLE_LAYOUT, bottom: FAKE_TABLE_LAYOUT },
          portrait: { top: PHONE_GRID, bottom: PHONE_GRID },
          landscape: { top: PHONE_GRID, bottom: PHONE_GRID },
          columns: COLUMNS,
          side: game.stock.id,
        },
      },
      handleIntent: fakeTableGestures(game),
      presentation,
    });
    scene.create();
    // A phone held upright.
    const scale = scene.scale as unknown as MockScaleManager;
    scale.width = 390 * 3;
    scale.height = 844 * 3;
    scale.displayScale = { x: 3, y: 3 };
  });

  /** Drags the ace of spades from a column to a point and lets go. */
  function dropAceAt(point: { x: number; y: number }) {
    const ace = relocate(game, "card-spades-ace", game.tableaus[0]);
    const sprite = scene.cardSprite(ace.id);
    inputOf(scene).emit("dragstart", PRESS_ON_CANVAS, sprite);
    inputOf(scene).emit("drag", {}, sprite, point.x, point.y);
    inputOf(scene).emit("dragend", {}, sprite);
    return ace;
  }

  it("lays the board out on its phone grid on a phone", () => {
    presentation.setBoardArrangement({ piles: "auto", stockSide: "left" });
    const foundation = game.foundations[0];
    const origin = measureTable(PHONE_GRID, scene.viewport).origins.get(
      foundation.id,
    )!;

    const ace = dropAceAt(origin);

    expect(game.getPileContainingCard(ace.id)).toBe(foundation);
  });

  it("mirrors its phone grid to put the stock at the right", () => {
    presentation.setBoardArrangement({ piles: "auto", stockSide: "right" });
    const foundation = game.foundations[0];
    const origin = measureTable(
      mirrorTable(PHONE_GRID, COLUMNS),
      scene.viewport,
    ).origins.get(foundation.id)!;

    const ace = dropAceAt(origin);

    expect(game.getPileContainingCard(ace.id)).toBe(foundation);
  });
});
