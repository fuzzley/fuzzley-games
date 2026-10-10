import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { makeFakeTableBoardScene } from "@test/support/fake_table/scene";
import { TestPresentation } from "@test/support/presentation";
import {
  FakeTableGame,
  StockOverrideTableGame,
} from "@test/support/fake_table/game";
import {
  BOOT_TEXTURE_KEY,
  DESTROY_EVENT,
  MockGraphics,
  MockInput,
  MockLoader,
  MockRenderer,
  MockScaleManager,
  MockSceneEvents,
  MockSprite,
  MockTextures,
  PRESS_ON_CANVAS,
  RESTORE_WEBGL_EVENT,
  SHUTDOWN_EVENT,
} from "@test/support/phaser_mocks";
import {
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
} from "@/engine/render/deck/card_deck";
import { CardArtScale } from "@/engine/render/deck/card_art_scale";
import {
  CardAtlas,
  cardAtlasTextureKey,
  residentCardAtlases,
} from "@/engine/render/phaser/deck/card_deck_atlas";
import { PhaserCardFactory } from "@/engine/render/phaser/scene/phaser_card_factory";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import {
  computePileOrigins,
  computeScale,
} from "@/engine/render/layout/table_metrics";
import { designSize } from "@/engine/render/layout/table_layout";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";
import { STOCK_PILE_ID } from "@test/support/fake_table/zones";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

const DESIGN_WIDTH_PX = designSize(FAKE_TABLE_LAYOUT).width;

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as MockSprite;
}

/**
 * Returns a deck's texture at a density, 1x unless said otherwise, since a
 * mock scene lays its board out at a scale of 1.
 */
function deckTexture(deckId: CardDeckId, artScale: CardArtScale = 1): string {
  return cardAtlasTextureKey({ deckId, artScale });
}

/**
 * Sizes a scene's canvas so its board is laid out at a scale, as a display of
 * that pixel ratio showing the whole design would.
 */
function sizeCanvasFor(scene: BoardScene, layoutScale: number): void {
  const scale = scene.scale as unknown as MockScaleManager;
  const design = designSize(FAKE_TABLE_LAYOUT);
  scale.width = design.width * layoutScale;
  scale.height = design.height * layoutScale;
  scale.displayScale = { x: layoutScale, y: layoutScale };
}

function dealtGame(): FakeTableGame {
  const game = new FakeTableGame();
  game.startNewGame();
  return game;
}

describe("BoardScene", () => {
  let boardScene: BoardScene;
  /** The game the scene under test draws. */
  let fakeGame: FakeTableGame;
  /** The presentation the scene under test follows. */
  let presentation: TestPresentation;

  /**
   * Makes the scene under test draw `game`, with a fresh presentation a test
   * can drive, replacing whatever scene, game and presentation came before.
   */
  function drawBoardOf(game: FakeTableGame): void {
    fakeGame = game;
    presentation = new TestPresentation();
    boardScene = makeFakeTableBoardScene(fakeGame, presentation);
  }

  beforeEach(() => {
    drawBoardOf(dealtGame());
    boardScene.create();
  });

  /** Returns the sprite of a card in the stock, for tracking where it goes. */
  function stockCardSprite(): MockSprite {
    const card = fakeGame.stock.getCards()[0];
    return asMock(boardScene.cardSprite(card.id));
  }

  /** Returns every card sprite on the board. */
  function allCardSprites(): MockSprite[] {
    return [...boardScene.cardIds].map((cardId) =>
      asMock(boardScene.cardSprite(cardId)),
    );
  }

  /** Returns the highest depth of any card other than the given sprites. */
  function deepestCardExcept(...lifted: MockSprite[]): number {
    const others = allCardSprites().filter(
      (sprite) => !lifted.includes(sprite),
    );
    return Math.max(...others.map((sprite) => sprite.depth));
  }

  /** Returns the frame and alpha of each of the given piles' backgrounds. */
  function backgroundsOf(
    pileIds: string[],
  ): { frame: string; alpha: number }[] {
    return pileIds.map((pileId) => {
      const sprite = asMock(boardScene.pileBackgroundSprite(pileId));
      return { frame: sprite.frame.name, alpha: sprite.alpha };
    });
  }

  /** Returns how many times the shared shadow texture has been drawn. */
  function shadowRenders(): number {
    const textures = boardScene.textures as unknown as MockTextures;
    return (
      textures.dynamicTexture(PhaserCardFactory.SHADOW_TEXTURE_KEY)
        ?.renderCount ?? 0
    );
  }

  describe("construction", () => {
    it("registers under a key no other board shares", () => {
      const next = makeFakeTableBoardScene(dealtGame(), new TestPresentation());

      // Phaser throws on a key already in use, and the next board is added to
      // the game before the last one is gone if the swap is queued.
      expect(next.key).not.toBe(boardScene.key);
    });

    it("draws a placeholder under each pile it is handed one for, and no others", () => {
      const withPlaceholder = fakeGame.piles
        .filter((pile) => boardScene.pileBackgroundSprite(pile.id))
        .map((pile) => pile.id);

      expect(withPlaceholder).toEqual(
        pileBackgrounds(fakeGame).map((background) => background.pileId),
      );
    });
  });

  describe("card shadows", () => {
    /** Returns the shadow sprite of every card, in card order. */
    function allShadows(): MockSprite[] {
      return [...boardScene.cardIds].map((cardId) =>
        asMock(boardScene.cardShadowSprite(cardId)),
      );
    }

    it("gives every card a shadow", () => {
      expect(allShadows().every((shadow) => shadow !== undefined)).toBe(true);
    });

    it("keeps each shadow under its card", () => {
      boardScene.update(0, 16);

      const cards = allCardSprites().map((sprite) => [sprite.x, sprite.y]);
      expect(allShadows().map((shadow) => [shadow.x, shadow.y])).toEqual(cards);
    });

    it("keeps the shadows on their own texture when the deck changes", () => {
      (boardScene.textures as unknown as MockTextures).add(
        deckTexture("classic"),
      );

      presentation.setCardDeck("classic");

      const keys = new Set(allShadows().map((shadow) => shadow.texture.key));
      expect([...keys]).toEqual([PhaserCardFactory.SHADOW_TEXTURE_KEY]);
    });

    it("redraws the shadow once a lost WebGL context is restored", () => {
      const before = shadowRenders();

      // A restored context comes back with every framebuffer empty.
      (boardScene.renderer as unknown as MockRenderer).emit(
        RESTORE_WEBGL_EVENT,
      );

      expect(shadowRenders()).toBe(before + 1);
    });
  });

  describe("table background", () => {
    /** Returns the camera's recording background setter. */
    function camera(): { setBackgroundColor: ReturnType<typeof vi.fn> } {
      return boardScene.cameras.main as unknown as {
        setBackgroundColor: ReturnType<typeof vi.fn>;
      };
    }

    it("repaints the camera when the background color setting changes", () => {
      presentation.setBackgroundColor("#123456");

      expect(camera().setBackgroundColor).toHaveBeenCalledWith("#123456");
    });

    it("stops following the setting once the scene shuts down", () => {
      const events = boardScene.events as unknown as MockSceneEvents;
      events.emit(SHUTDOWN_EVENT);
      camera().setBackgroundColor.mockClear();

      presentation.setBackgroundColor("#654321");

      // A scene restart runs create() again, so a subscription left behind here
      // would accumulate one stale listener per restart.
      expect(camera().setBackgroundColor).not.toHaveBeenCalled();
    });
  });

  describe("card deck", () => {
    /** Returns the scene's mock loader, which finishes a load when told to. */
    function loader(): MockLoader {
      return boardScene.load as unknown as MockLoader;
    }

    /** Returns the scene's mock texture cache. */
    function textures(): MockTextures {
      return boardScene.textures as unknown as MockTextures;
    }

    /** Returns every sprite the board draws, cards and placeholders alike. */
    function allSprites(): MockSprite[] {
      const backgrounds = fakeGame.piles
        .map((pile) => boardScene.pileBackgroundSprite(pile.id))
        .filter((sprite) => sprite !== undefined)
        .map(asMock);
      return [...allCardSprites(), ...backgrounds];
    }

    /** Returns the distinct texture keys the board is drawing from. */
    function texturesInUse(): string[] {
      return [...new Set(allSprites().map((sprite) => sprite.texture.key))];
    }

    /** Returns the texture of every atlas left loaded. */
    function residentTextures(): string[] {
      return residentCardAtlases(textures()).map(cardAtlasTextureKey);
    }

    it("draws every sprite from the deck the player is using", () => {
      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("redraws every card and placeholder from a deck already loaded", () => {
      textures().add(deckTexture("classic"));

      presentation.setCardDeck("classic");

      expect(texturesInUse()).toEqual([deckTexture("classic")]);
    });

    it("keeps each sprite on the frame it was showing", () => {
      const before = allSprites().map((sprite) => sprite.frame.name);
      textures().add(deckTexture("classic"));

      presentation.setCardDeck("classic");

      // A swap that dropped the frame would leave every sprite showing the
      // whole atlas page instead of its card.
      expect(allSprites().map((sprite) => sprite.frame.name)).toEqual(before);
    });

    it("keeps each sprite anchored at its top left corner", () => {
      textures().add(deckTexture("classic"));

      presentation.setCardDeck("classic");

      // The frames are anchored at their centres, so a swap that let Phaser
      // move the origin onto the new frame's anchor would shift the whole
      // table by half a card.
      const origins = allSprites().map((sprite) => [
        sprite.originX,
        sprite.originY,
      ]);
      expect(origins).toEqual(origins.map(() => [0, 0]));
    });

    it("releases the deck it leaves", () => {
      textures().add(deckTexture("classic"));

      presentation.setCardDeck("classic");

      // An atlas page is sixty megabytes of texture memory once uploaded, and
      // a deck the board is no longer drawing is not worth holding it for.
      expect(textures().exists(deckTexture(DEFAULT_DESKTOP_CARD_DECK))).toBe(
        false,
      );
    });

    it("loads a deck it has never drawn before switching to it", () => {
      presentation.setCardDeck("classic");

      expect(loader().requested).toEqual([deckTexture("classic")]);
      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("switches once the load it was waiting on finishes", () => {
      presentation.setCardDeck("classic");

      loader().complete(textures());

      expect(texturesInUse()).toEqual([deckTexture("classic")]);
    });

    it("stays on the deck it has when the load fails", () => {
      presentation.setCardDeck("classic");

      loader().complete(false);

      // Pointing sprites at a texture that never arrived would draw the whole
      // board as blank rectangles, which is worse than the deck being left.
      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("ignores a load that finishes after the player changed their mind", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      loader().complete(textures());

      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("releases a deck that finishes loading after the player changed their mind", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      loader().complete(textures());

      expect(residentTextures()).toEqual([
        deckTexture(DEFAULT_DESKTOP_CARD_DECK),
      ]);
    });

    it("draws the latest deck when two loads finish together", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck("all-corner-pips");

      // Phaser finishes every file queued while it was busy in one batch, so
      // the stale load's turn comes while the wanted one is resident but not
      // yet drawn, and must leave it alone.
      loader().complete(textures());

      expect({
        inUse: texturesInUse(),
        resident: residentTextures(),
        status: presentation.cardDeckStatuses.at(-1),
      }).toEqual({
        inUse: [deckTexture("all-corner-pips")],
        resident: [deckTexture("all-corner-pips")],
        status: { kind: "drawn", deckId: "all-corner-pips" },
      });
    });

    describe("on boot", () => {
      /**
       * Builds a board for a player who chose `chosen`, with only the given
       * atlases loaded, as an earlier board may have left them; a deck named
       * alone is loaded at 1x.
       */
      function bootScene(
        chosen: CardDeckId,
        ...loaded: (CardDeckId | CardAtlas)[]
      ): void {
        fakeGame = dealtGame();
        presentation = new TestPresentation(undefined, undefined, chosen);
        boardScene = makeFakeTableBoardScene(fakeGame, presentation);
        textures().remove(BOOT_TEXTURE_KEY);
        for (const atlas of loaded) {
          textures().add(
            typeof atlas === "string"
              ? deckTexture(atlas)
              : cardAtlasTextureKey(atlas),
          );
        }
      }

      it("loads the chosen deck first when no deck is loaded", () => {
        bootScene("classic");

        boardScene.preload();

        expect(loader().requested).toEqual([deckTexture("classic")]);
      });

      it("loads nothing when the chosen deck is loaded", () => {
        bootScene("classic", "classic");

        boardScene.preload();

        expect(loader().requested).toEqual([]);
      });

      it("draws from the chosen deck and releases any other left loaded", () => {
        bootScene("classic", "indexed", "classic");
        boardScene.preload();

        boardScene.create();

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic")],
          resident: [deckTexture("classic")],
        });
      });

      it("draws from another loaded deck while it fetches the chosen one", () => {
        bootScene("classic", "indexed");
        boardScene.preload();

        boardScene.create();

        // The board is playable at once, with the corner badge saying the
        // chosen deck is on its way.
        expect({
          inUse: texturesInUse(),
          requested: loader().requested,
          status: presentation.cardDeckStatuses.at(-1),
        }).toEqual({
          inUse: [deckTexture("indexed")],
          requested: [deckTexture("classic")],
          status: { kind: "loading", deckId: "classic" },
        });
      });

      it("moves to the chosen deck once it arrives, releasing the one it booted on", () => {
        bootScene("classic", "indexed");
        boardScene.preload();
        boardScene.create();

        loader().complete(textures());

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic")],
          resident: [deckTexture("classic")],
        });
      });

      it("preloads the 2x atlas for a board laid out larger than 1x", () => {
        bootScene("classic");
        sizeCanvasFor(boardScene, 2);

        boardScene.preload();

        expect(loader().requested).toEqual([deckTexture("classic", 2)]);
      });

      it("boots on a 2x atlas left loaded without fetching the 1x one", () => {
        // An earlier board on a bigger canvas left it, and loading the cheaper
        // copy would cost a fetch for no gain.
        bootScene("classic", { deckId: "classic", artScale: 2 });
        boardScene.preload();

        boardScene.create();

        expect({
          inUse: texturesInUse(),
          requested: loader().requested,
        }).toEqual({ inUse: [deckTexture("classic", 2)], requested: [] });
      });

      it("boots on the chosen deck at 1x while it fetches the 2x copy", () => {
        bootScene("classic", "classic");
        sizeCanvasFor(boardScene, 2);
        boardScene.preload();

        boardScene.create();

        // The deck the player chose is on the table, so the drawer is told so.
        expect({
          inUse: texturesInUse(),
          requested: loader().requested,
          status: presentation.cardDeckStatuses.at(-1),
        }).toEqual({
          inUse: [deckTexture("classic")],
          requested: [deckTexture("classic", 2)],
          status: { kind: "drawn", deckId: "classic" },
        });
      });
    });

    describe("atlas density", () => {
      /** Resizes the canvas so the board is laid out at a scale. */
      function resizeTo(layoutScale: number): void {
        sizeCanvasFor(boardScene, layoutScale);
        (boardScene.scale as unknown as MockScaleManager).emit("resize");
      }

      /** Returns the scene's shadow texture. */
      function shadowTexture(): { width: number; height: number } {
        const texture = textures().dynamicTexture(
          PhaserCardFactory.SHADOW_TEXTURE_KEY,
        );
        if (!texture) throw new Error("No shadow texture was created");
        return texture;
      }

      it("fetches the 2x atlas once the board grows past 1x", () => {
        resizeTo(2);

        expect({
          requested: loader().requested,
          inUse: texturesInUse(),
        }).toEqual({
          requested: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK)],
        });
      });

      it("moves every sprite to the 2x atlas once it arrives, releasing 1x", () => {
        resizeTo(2);

        loader().complete(textures());

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          resident: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
        });
      });

      it("draws the 2x artwork texel for texel at a layout scale of 2", () => {
        resizeTo(2);
        loader().complete(textures());

        boardScene.update(0, 16);

        const scales = new Set(allSprites().map((sprite) => sprite.scale));
        expect([...scales]).toEqual([1]);
      });

      it("redraws the shadow at 2x, refitting every shadow sprite to it", () => {
        resizeTo(2);

        loader().complete(textures());

        const origins = new Set(
          [...boardScene.cardIds].map((cardId) => {
            const shadow = asMock(boardScene.cardShadowSprite(cardId));
            return `${shadow.displayOriginX},${shadow.displayOriginY}`;
          }),
        );
        expect({
          size: [shadowTexture().width, shadowTexture().height],
          origins: [...origins],
        }).toEqual({ size: [440 + 64, 614 + 96], origins: ["32,48"] });
      });

      it("says nothing about the deck, which has not changed", () => {
        resizeTo(2);

        loader().complete(textures());

        expect(presentation.cardDeckStatuses).toEqual([
          { kind: "drawn", deckId: DEFAULT_DESKTOP_CARD_DECK },
        ]);
      });

      it("fetches the 2x atlas once however often the board resizes", () => {
        resizeTo(2);

        resizeTo(2.5);

        expect(loader().requested).toEqual([
          deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2),
        ]);
      });

      it("keeps the 2x atlas when the board shrinks again", () => {
        // Swapping back on every resize would reload the deck each time a
        // window's edge is dragged across the line.
        resizeTo(2);
        loader().complete(textures());

        resizeTo(1);

        expect({
          requested: loader().requested,
          inUse: texturesInUse(),
        }).toEqual({
          requested: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
        });
      });

      it("stays on 1x without a word when the 2x atlas fails to load", () => {
        resizeTo(2);

        loader().complete(false);

        // The deck is still drawn, only less sharply, so there is nothing
        // for the drawer to report.
        expect({
          inUse: texturesInUse(),
          statuses: presentation.cardDeckStatuses,
        }).toEqual({
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK)],
          statuses: [{ kind: "drawn", deckId: DEFAULT_DESKTOP_CARD_DECK }],
        });
      });

      it("loads a new deck at the density the board needs now", () => {
        resizeTo(2);
        loader().complete(textures());
        resizeTo(1);

        presentation.setCardDeck("classic");

        expect(loader().requested.at(-1)).toBe(deckTexture("classic"));
      });

      it("lets a deck chosen during the 2x fetch win", () => {
        resizeTo(2);
        presentation.setCardDeck("classic");

        loader().complete(textures());

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic", 2)],
          resident: [deckTexture("classic", 2)],
        });
      });

      it("fetches the deck being loaded at 2x if the board grows meanwhile", () => {
        presentation.setCardDeck("classic");

        resizeTo(2);
        loader().complete(textures());

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
          statuses: presentation.cardDeckStatuses.slice(1),
        }).toEqual({
          inUse: [deckTexture("classic", 2)],
          resident: [deckTexture("classic", 2)],
          statuses: [
            { kind: "loading", deckId: "classic" },
            { kind: "drawn", deckId: "classic" },
          ],
        });
      });
    });

    it("does not reload a deck it is already drawing", () => {
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      expect(loader().requested).toEqual([]);
    });

    /** Returns what the board said about the deck, as `<kind>:<deck>` pairs. */
    function statusesReported(): string[] {
      return presentation.cardDeckStatuses.map(
        (status) => `${status.kind}:${status.deckId}`,
      );
    }

    it("says which deck it booted on", () => {
      // The drawer has to start from something, and only the board knows what
      // is actually on the table.
      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
      ]);
    });

    it("says a deck is on its way before it arrives", () => {
      presentation.setCardDeck("classic");

      expect(statusesReported().at(-1)).toBe("loading:classic");
    });

    it("says the deck is drawn once the load finishes", () => {
      presentation.setCardDeck("classic");

      loader().complete(textures());

      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
        "loading:classic",
        "drawn:classic",
      ]);
    });

    it("says the deck is unavailable when the load fails", () => {
      presentation.setCardDeck("classic");

      loader().complete(false);

      // Without this the drawer would be left showing a deck the board never
      // drew, and would persist it for the next visit to fail on too.
      expect(statusesReported().at(-1)).toBe("unavailable:classic");
    });

    it("answers for a deck that is still wanted and no other", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      loader().complete(textures());

      // The switch back is answered at once, and the load that arrives after it
      // is nobody's question by then.
      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
        "loading:classic",
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
      ]);
    });

    it("stops following the setting once the scene shuts down", () => {
      const events = boardScene.events as unknown as MockSceneEvents;
      events.emit(SHUTDOWN_EVENT);
      textures().add(deckTexture("classic"));

      presentation.setCardDeck("classic");

      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });
  });

  describe("dealing", () => {
    it("renders a board that is already dealt", () => {
      const dealt = [
        fakeGame.stock.size,
        ...fakeGame.tableaus.map((pile) => pile.size),
      ];

      expect(dealt).toEqual([24, 1, 2, 3, 4, 5, 6, 7]);
    });

    it("does not re-deal when the scene is created again", () => {
      const ace = relocate(
        fakeGame,
        "card-hearts-ace",
        fakeGame.foundations[0],
      );

      boardScene.create();

      // A renderer that dealt would throw the game in progress away.
      expect(fakeGame.foundations[0].topCard).toBe(ace);
    });
  });

  // Phaser destroys a removed scene, or every scene of a destroyed game,
  // without shutting it down first.
  describe.each([SHUTDOWN_EVENT, DESTROY_EVENT])(
    "once the scene ends with %s",
    (event) => {
      /** Raises the event that ends the scene. */
      function endScene(): void {
        (boardScene.events as unknown as MockSceneEvents).emit(event);
      }

      it("stops following the presentation", () => {
        endScene();

        expect([
          presentation.listenerCount,
          presentation.deckListenerCount,
        ]).toEqual([0, 0]);
      });

      it("stops listening for the canvas to resize", () => {
        const scale = boardScene.scale as unknown as MockScaleManager;

        endScene();

        expect(scale.listenerCount("resize")).toBe(0);
      });

      it("stops redrawing the shadow when a lost WebGL context is restored", () => {
        endScene();
        const before = shadowRenders();

        (boardScene.renderer as unknown as MockRenderer).emit(
          RESTORE_WEBGL_EVENT,
        );

        expect(shadowRenders()).toBe(before);
      });
    },
  );

  describe("a restarted scene", () => {
    it("lets go of everything when it is then destroyed", () => {
      const events = boardScene.events as unknown as MockSceneEvents;
      const scale = boardScene.scale as unknown as MockScaleManager;
      events.emit(SHUTDOWN_EVENT);
      boardScene.create();

      events.emit(DESTROY_EVENT);

      expect([
        presentation.listenerCount,
        presentation.deckListenerCount,
        scale.listenerCount("resize"),
      ]).toEqual([0, 0, 0]);
    });
  });

  describe("pile backgrounds", () => {
    const alpha = BoardScene.PILE_BACKGROUND_ALPHA;

    it("gives the stock pile a placeholder background at the shared alpha", () => {
      expect(backgroundsOf([STOCK_PILE_ID])).toEqual([
        { frame: "card-placeholder-full-border-reset", alpha },
      ]);
    });

    it("gives every tableau pile a placeholder background at the shared alpha", () => {
      const pileIds = fakeGame.tableaus.map((pile) => pile.id);

      expect(backgroundsOf(pileIds)).toEqual(
        Array(7).fill({ frame: "card-placeholder", alpha }),
      );
    });

    it("gives every foundation pile a placeholder background at the shared alpha", () => {
      const pileIds = fakeGame.foundations.map((pile) => pile.id);

      expect(backgroundsOf(pileIds)).toEqual(
        Array(4).fill({
          frame: "card-placeholder-full-border-circle",
          alpha,
        }),
      );
    });

    it("gives the waste pile no background, so it fans over bare table", () => {
      expect(
        boardScene.pileBackgroundSprite(fakeGame.waste.id),
      ).toBeUndefined();
    });

    describe("an empty slot that stops being pressable", () => {
      let game: StockOverrideTableGame;

      beforeEach(() => {
        game = new StockOverrideTableGame();
        game.startNewGame();
        emptyBoard(game);
        game.stockActionable = true;
        drawBoardOf(game);
        boardScene.create();
        boardScene.update(0, 16);
      });

      /** Returns the cursor the scene last put on the canvas. */
      function canvasCursor(): string {
        return (boardScene.input as unknown as MockInput).canvasCursor;
      }

      it("drops the pointer at once from under a pointer that has not moved", () => {
        asMock(boardScene.pileBackgroundSprite(STOCK_PILE_ID)).emit(
          "pointerover",
        );
        game.stockActionable = false;

        boardScene.update(16, 16);

        expect(canvasCursor()).toBe("default");
      });

      it("leaves the canvas cursor alone while the pointer is elsewhere", () => {
        game.stockActionable = false;

        boardScene.update(16, 16);

        expect(canvasCursor()).toBe("");
      });
    });
  });

  describe("pointer polling", () => {
    it("hit tests every frame so hover follows cards that move under the pointer", () => {
      const input = boardScene.input as unknown as MockInput;

      // Phaser's default only re-tests when the pointer itself moves, which
      // leaves the hover attached to a card that has since slid away.
      expect(input.pollRate).toBe(0);
    });
  });

  describe("responsiveness", () => {
    it("snaps cards to their new places after a resize rather than easing", () => {
      const scale = boardScene.scale as unknown as MockScaleManager;
      const sprite = stockCardSprite();
      boardScene.update(0, 16);
      const beforeResize = sprite.x;

      // A wider viewport centers the layout further right, moving every pile.
      scale.width = DESIGN_WIDTH_PX * 2;
      scale.emit("resize");
      boardScene.update(16, 16);

      // A snap lands on the target in the first frame, so the next frame leaves
      // the card alone; an ease would still be closing the gap.
      const afterResize = sprite.x;
      boardScene.update(32, 16);
      expect(afterResize).not.toBe(beforeResize);
      expect(sprite.x).toBe(afterResize);
    });
  });

  describe("update loop", () => {
    it("lays each card out where its pile's geometry puts it", () => {
      const viewport = boardScene.viewport;
      const stockOrigin = computePileOrigins(
        FAKE_TABLE_LAYOUT,
        viewport,
        computeScale(FAKE_TABLE_LAYOUT, viewport),
      ).get(STOCK_PILE_ID)!;
      const sprite = stockCardSprite();

      boardScene.update(0, 16);

      // Stock cards stack with no offset, so they land exactly on the origin.
      expect({ x: sprite.x, y: sprite.y }).toEqual(stockOrigin);
    });
  });

  describe("auto-moved card", () => {
    /**
     * Puts the ace of hearts on top of tableau 0 and double clicks it to a
     * foundation, returning its sprite, which is still back at the tableau.
     */
    function autoMoveTheAce(): MockSprite {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const sprite = asMock(boardScene.cardSprite(ace.id));
      boardScene.update(0, 16); // the first frame snaps the board into place

      sprite.emit("pointerdown", PRESS_ON_CANVAS);
      sprite.emit("pointerdown", PRESS_ON_CANVAS);

      return sprite;
    }

    it("draws it over every other card while it crosses the board", () => {
      const sprite = autoMoveTheAce();

      boardScene.update(16, 16);

      // Its foundation is empty, so the depth it is headed for is the lowest on
      // the board: without the lift it would slide under the columns it crosses.
      expect(sprite.depth).toBeGreaterThan(deepestCardExcept(sprite));
    });

    it("settles it back among the resting cards once it lands", () => {
      const sprite = autoMoveTheAce();
      boardScene.update(16, 16); // in flight

      boardScene.update(32, 0); // a zero delta lands every card
      boardScene.update(48, 16); // the frame after it has landed

      expect(sprite.depth).toBeLessThan(depthFor(RenderLayer.FLYING_CARD, 0));
    });
  });

  describe("cards the model relocates without a gesture reporting it", () => {
    /** Presses the top of the stock once, which is what draws. */
    function drawFromStock(): MockSprite[] {
      const top = fakeGame.stock.topCard!;
      boardScene.update(0, 16); // the first frame snaps the board into place

      asMock(boardScene.cardSprite(top.id)).emit(
        "pointerdown",
        PRESS_ON_CANVAS,
      );

      return fakeGame.waste
        .getCards()
        .map((card) => asMock(boardScene.cardSprite(card.id)));
    }

    it("lifts the drawn cards over the board on their way to the waste", () => {
      const drawn = drawFromStock();

      boardScene.update(16, 16);

      // A draw is not a move, but the model still announces what it moved.
      const restingDepth = deepestCardExcept(...drawn);
      expect(drawn.every((sprite) => sprite.depth > restingDepth)).toBe(true);
    });

    it("lifts the cards an undo puts back", () => {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const sprite = asMock(boardScene.cardSprite(ace.id));
      boardScene.update(0, 16);
      sprite.emit("pointerdown", PRESS_ON_CANVAS);
      sprite.emit("pointerdown", PRESS_ON_CANVAS); // to a foundation
      boardScene.update(16, 0); // land it there

      fakeGame.undo();
      boardScene.update(32, 16);

      // Undo bypasses the intent pipeline, but the model still announces it.
      expect(sprite.depth).toBeGreaterThan(deepestCardExcept(sprite));
    });

    it("keeps an earlier stack lifted while a later one sets off", () => {
      const first = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const second = relocate(
        fakeGame,
        "card-spades-ace",
        fakeGame.tableaus[1],
      );
      const firstSprite = asMock(boardScene.cardSprite(first.id));
      const secondSprite = asMock(boardScene.cardSprite(second.id));
      boardScene.update(0, 16);

      firstSprite.emit("pointerdown", PRESS_ON_CANVAS);
      firstSprite.emit("pointerdown", PRESS_ON_CANVAS);
      boardScene.update(16, 16); // still crossing
      secondSprite.emit("pointerdown", PRESS_ON_CANVAS);
      secondSprite.emit("pointerdown", PRESS_ON_CANVAS);
      boardScene.update(32, 16);

      const restingDepth = deepestCardExcept(firstSprite, secondSprite);
      expect([
        firstSprite.depth > restingDepth,
        secondSprite.depth > firstSprite.depth,
      ]).toEqual([true, true]);
    });
  });

  describe("game reset", () => {
    /** Every highlight border the renderer has made, drawn or hidden. */
    let borders: MockGraphics[];

    beforeEach(() => {
      borders = [];
      // The renderer makes its borders lazily, on the first frame that needs
      // one, so collecting them through the scene's own factory catches them
      // all without reaching into the renderer.
      const addGraphics = boardScene.addGraphics.bind(boardScene);
      vi.spyOn(boardScene, "addGraphics").mockImplementation(() => {
        const graphics = addGraphics();
        borders.push(graphics as unknown as MockGraphics);
        return graphics;
      });
    });

    /** Returns whether any highlight border is currently drawn. */
    function anyBorderDrawn(): boolean {
      return borders.some((border) => border.visible);
    }

    it("draws a border while a card is hovered", () => {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);

      asMock(boardScene.cardSprite(ace.id)).emit("pointerover");
      boardScene.update(0, 16);

      expect(anyBorderDrawn()).toBe(true);
    });

    it("drops a hover so no border survives into the new deal", () => {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      asMock(boardScene.cardSprite(ace.id)).emit("pointerover");
      boardScene.update(0, 16);

      // Dealing a fresh board is what raises game-reset, so the interaction
      // state is cleared through the same path the game itself uses.
      fakeGame.startNewGame();
      boardScene.update(16, 16);

      expect(anyBorderDrawn()).toBe(false);
    });

    it("snaps every card into place rather than easing from the old deal", () => {
      const positions = () =>
        allCardSprites().map((sprite) => ({ x: sprite.x, y: sprite.y }));
      boardScene.update(0, 16);
      const before = positions();

      fakeGame.startNewGame();
      boardScene.update(16, 16);

      // A snap lands on the target in one frame; an ease would leave the cards
      // part way between the two deals.
      const after = positions();
      expect(after).not.toEqual(before);
      boardScene.update(32, 16);
      expect(positions()).toEqual(after);
    });
  });
});
