import { vi, describe, it, expect, beforeEach } from "vitest";
import { deckCardIds } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";
import { designSize, measureTable } from "@/engine/render/layout/table_layout";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import {
  FAKE_TABLE_LAYOUT,
  fakeTableGestures,
} from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import { tableauPileId } from "@test/support/fake_table/zones";
import { relocate } from "@test/support/game_scenarios";
import {
  MockGraphics,
  MockSceneEvents,
  MockSprite,
  MockTextures,
  POST_UPDATE_EVENT,
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
      layout: FAKE_TABLE_LAYOUT,
      handleIntent: fakeTableGestures(game),
      presentation,
      onReady,
    });
    built.create();
    return built;
  }

  /** A dealt game over the given deck, defaulting to a standard 52. */
  function dealtGame(cardIds?: typeof ONE_SUIT): FakeTableGame {
    const dealt = new FakeTableGame(cardIds);
    dealt.startNewGame();
    return dealt;
  }

  beforeEach(() => {
    scene = buildScene(dealtGame());
  });

  describe("the game it draws", () => {
    it("draws the game it was handed", () => {
      expect(scene.tableGame).toBe(game);
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

      expect(scene.stackFromCard(lower.id)).toEqual([lower.id, upper.id]);
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

    it("resolves a drop against that grid", () => {
      const pileId = tableauPileId(1);
      const origin = measureTable(
        FAKE_TABLE_LAYOUT,
        scene.viewport,
      ).origins.get(pileId)!;

      const target = scene.resolveDropTarget(
        { cardIds: ["card-spades-ace"], primary: origin },
        scene.viewport,
      );

      expect(target?.pileId).toBe(pileId);
    });
  });

  describe("the gestures it was given", () => {
    it("carries them out", () => {
      const top = game.stock.topCard!;

      scene.handleIntent({ kind: "activate", cardId: top.id });

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
        { kind: "drawn", deckId: DEFAULT_CARD_DECK },
      ]);
    });

    it("redraws from the deck the player switches to", () => {
      const textures = scene.textures as unknown as MockTextures;
      textures.add("cards:classic");

      presentation.setCardDeck("classic");

      const card = game.stock.topCard!;
      expect(asMock(scene.cardSprite(card.id)).texture.key).toBe(
        "cards:classic",
      );
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

      // A deal the board heard about snaps every card into place in a single
      // frame. These are still easing, so nothing reached the shut-down scene
      // — which is the point: create() runs again on every restart, and a
      // subscription left behind here would hold the scene it belonged to.
      expect(positions()).not.toEqual(midway);
    });

    it("lifts the cards an action relocates over the board", () => {
      scene.update(0, 16);
      const top = game.stock.topCard!;

      scene.handleIntent({ kind: "activate", cardId: top.id });
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
