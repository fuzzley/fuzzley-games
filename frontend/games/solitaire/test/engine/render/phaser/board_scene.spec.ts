import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { makeFakeTableBoardScene } from "@test/support/fake_table/scene";
import { TestPresentation } from "@test/support/presentation";
import { FakeTableGame } from "@test/support/fake_table/game";
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
  RESTORE_WEBGL_EVENT,
  SHUTDOWN_EVENT,
} from "@test/support/phaser_mocks";
import { CardDeckId, DEFAULT_CARD_DECK } from "@/engine/render/card_deck";
import {
  cardDeckTextureKey,
  residentCardDecks,
} from "@/engine/render/phaser/card_deck_atlas";
import { PhaserCardFactory } from "@/engine/render/phaser/phaser_card_factory";
import { RenderLayer, depthFor } from "@/engine/render/layout/render_layers";
import {
  computePileOrigins,
  computeScale,
  designSize,
} from "@/engine/render/layout/table_layout";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";

const DESIGN_WIDTH_PX = designSize(FAKE_TABLE_LAYOUT).width;
import { STOCK_PILE_ID } from "@test/support/fake_table/zones";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import { relocate } from "@test/support/game_scenarios";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as MockSprite;
}

/** The game the current scene draws, and the presentation it follows. */
let fakeGame: FakeTableGame;
let presentation: TestPresentation;

/**
 * Builds a board scene drawing the given game, or a freshly dealt one, with a
 * presentation a test can drive.
 */
function makeBoardScene(gameModel?: FakeTableGame): BoardScene {
  fakeGame = gameModel ?? dealtGame();
  presentation = new TestPresentation();
  return makeFakeTableBoardScene(fakeGame, presentation);
}

function dealtGame(): FakeTableGame {
  const game = new FakeTableGame();
  game.startNewGame();
  return game;
}

describe("BoardScene", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    boardScene = makeBoardScene();
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
      (boardScene.textures as unknown as MockTextures).add("cards:classic");

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

    it("draws every sprite from the deck the player is using", () => {
      expect(texturesInUse()).toEqual([`cards:${DEFAULT_CARD_DECK}`]);
    });

    it("redraws every card and placeholder from a deck already loaded", () => {
      textures().add("cards:classic");

      presentation.setCardDeck("classic");

      expect(texturesInUse()).toEqual(["cards:classic"]);
    });

    it("keeps each sprite on the frame it was showing", () => {
      const before = allSprites().map((sprite) => sprite.frame.name);
      textures().add("cards:classic");

      presentation.setCardDeck("classic");

      // A swap that dropped the frame would leave every sprite showing the
      // whole atlas page instead of its card.
      expect(allSprites().map((sprite) => sprite.frame.name)).toEqual(before);
    });

    it("keeps each sprite anchored at its top left corner", () => {
      textures().add("cards:classic");

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
      textures().add("cards:classic");

      presentation.setCardDeck("classic");

      // An atlas page is sixty megabytes of texture memory once uploaded, and
      // a deck the board is no longer drawing is not worth holding it for.
      expect(textures().exists(`cards:${DEFAULT_CARD_DECK}`)).toBe(false);
    });

    it("loads a deck it has never drawn before switching to it", () => {
      presentation.setCardDeck("classic");

      expect(loader().requested).toEqual(["cards:classic"]);
      expect(texturesInUse()).toEqual([`cards:${DEFAULT_CARD_DECK}`]);
    });

    it("switches once the load it was waiting on finishes", () => {
      presentation.setCardDeck("classic");

      loader().complete(textures());

      expect(texturesInUse()).toEqual(["cards:classic"]);
    });

    it("stays on the deck it has when the load fails", () => {
      presentation.setCardDeck("classic");

      loader().complete(false);

      // Pointing sprites at a texture that never arrived would draw the whole
      // board as blank rectangles, which is worse than the deck being left.
      expect(texturesInUse()).toEqual([`cards:${DEFAULT_CARD_DECK}`]);
    });

    it("ignores a load that finishes after the player changed their mind", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_CARD_DECK);

      loader().complete(textures());

      expect(texturesInUse()).toEqual([`cards:${DEFAULT_CARD_DECK}`]);
    });

    it("releases a deck that finishes loading after the player changed their mind", () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_CARD_DECK);

      loader().complete(textures());

      expect(residentCardDecks(textures())).toEqual([DEFAULT_CARD_DECK]);
    });

    describe("on boot", () => {
      /**
       * Builds a board for a player who chose `chosen`, with only the given
       * decks loaded, as an earlier board may have left them.
       */
      function bootScene(chosen: CardDeckId, ...loaded: CardDeckId[]): void {
        fakeGame = dealtGame();
        presentation = new TestPresentation(undefined, undefined, chosen);
        boardScene = makeFakeTableBoardScene(fakeGame, presentation);
        textures().remove(BOOT_TEXTURE_KEY);
        for (const deckId of loaded) {
          textures().add(cardDeckTextureKey(deckId));
        }
      }

      it("loads the chosen deck first when no deck is loaded", () => {
        bootScene("classic");

        boardScene.preload();

        expect(loader().requested).toEqual(["cards:classic"]);
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
          resident: residentCardDecks(textures()),
        }).toEqual({ inUse: ["cards:classic"], resident: ["classic"] });
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
          inUse: ["cards:indexed"],
          requested: ["cards:classic"],
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
          resident: residentCardDecks(textures()),
        }).toEqual({ inUse: ["cards:classic"], resident: ["classic"] });
      });
    });

    it("does not reload a deck it is already drawing", () => {
      presentation.setCardDeck(DEFAULT_CARD_DECK);

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
      expect(statusesReported()).toEqual([`drawn:${DEFAULT_CARD_DECK}`]);
    });

    it("says a deck is on its way before it arrives", () => {
      presentation.setCardDeck("classic");

      expect(statusesReported().at(-1)).toBe("loading:classic");
    });

    it("says the deck is drawn once the load finishes", () => {
      presentation.setCardDeck("classic");

      loader().complete(textures());

      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_CARD_DECK}`,
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
      presentation.setCardDeck(DEFAULT_CARD_DECK);

      loader().complete(textures());

      // The switch back is answered at once, and the load that arrives after it
      // is nobody's question by then.
      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_CARD_DECK}`,
        "loading:classic",
        `drawn:${DEFAULT_CARD_DECK}`,
      ]);
    });

    it("stops following the setting once the scene shuts down", () => {
      const events = boardScene.events as unknown as MockSceneEvents;
      events.emit(SHUTDOWN_EVENT);
      textures().add("cards:classic");

      presentation.setCardDeck("classic");

      expect(texturesInUse()).toEqual([`cards:${DEFAULT_CARD_DECK}`]);
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

      sprite.emit("pointerdown");
      sprite.emit("pointerdown");

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

      asMock(boardScene.cardSprite(top.id)).emit("pointerdown");

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
      sprite.emit("pointerdown");
      sprite.emit("pointerdown"); // to a foundation
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

      firstSprite.emit("pointerdown");
      firstSprite.emit("pointerdown");
      boardScene.update(16, 16); // still crossing
      secondSprite.emit("pointerdown");
      secondSprite.emit("pointerdown");
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
