// @vitest-environment jsdom
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { GameObjects, Scenes, Textures } from "phaser";
import type { FileServer, SceneRun } from "@fz/phaser/testing";
import { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { BoardDeckLoader } from "@/engine/render/phaser/deck/board_deck_loader";
import { TableLight } from "@/engine/render/phaser/scene/table_light";
import {
  makeFakeTableBoardScene,
  runFakeTableBoard,
} from "@test/support/fake_table/scene";
import { loadAtlases } from "@test/support/atlas_scene";
import { serveWorkspace } from "@test/support/workspace_files";
import { TestPresentation } from "@test/support/presentation";
import {
  FakeTableGame,
  StockOverrideTableGame,
} from "@test/support/fake_table/game";
import {
  type CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
} from "@/engine/render/deck/card_deck";
import type { CardArtScale } from "@/engine/render/deck/card_art_scale";
import {
  type CardAtlas,
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
import { relocate } from "@test/support/game_scenarios";

/** The size the fake game's board is designed at, laid out at a scale of 1. */
const DESIGN = designSize(FAKE_TABLE_LAYOUT);

/** An atlas page's path, which names its deck, density and page. */
const ATLAS_PAGE = /\/atlas\/([^/]+)\/([\d.]+)x\/card_assets-(\d+)\.png$/;

/** Returns a deck at a density, 1x unless said otherwise. */
function atlas(deckId: CardDeckId, artScale: CardArtScale = 1): CardAtlas {
  return { deckId, artScale };
}

/** Returns a deck's texture at a density, 1x unless said otherwise. */
function deckTexture(deckId: CardDeckId, artScale: CardArtScale = 1): string {
  return cardAtlasTextureKey(atlas(deckId, artScale));
}

function dealtGame(): FakeTableGame {
  const game = new FakeTableGame();
  game.startNewGame();
  return game;
}

/** Says how a spec's board starts. */
interface BoardStart {
  /** The game the board draws; a fresh deal when not given. */
  readonly game?: FakeTableGame;
  /** The deck the player chose; the desktop default when not given. */
  readonly chosen?: CardDeckId;
  /**
   * The atlases an earlier board left loaded; the default deck's at 1x when
   * not given.
   */
  readonly loaded?: readonly CardAtlas[];
  /** The scale the board is laid out at; 1 when not given. */
  readonly layoutScale?: number;
}

/**
 * Ends a scene with an event: a stop shuts it down, and a removal destroys it
 * without shutting it down first, as Phaser does every scene of a destroyed
 * game.
 */
const ENDINGS: readonly (readonly [
  string,
  (run: SceneRun<BoardScene>) => void,
])[] = [
  [
    Scenes.Events.SHUTDOWN,
    (run) => {
      run.game.scene.stop(run.scene.key);
    },
  ],
  [
    Scenes.Events.DESTROY,
    (run) => {
      run.game.scene.remove(run.scene.key);
    },
  ],
];

describe("BoardScene", () => {
  let run: SceneRun<BoardScene>;
  /** The game the scene under test draws. */
  let fakeGame: FakeTableGame;
  /** The presentation the scene under test follows. */
  let presentation: TestPresentation;
  /** The atlases the board has asked for, by texture, oldest first. */
  let requested: string[];
  /** The atlases whose pages are not found, by texture. */
  let refused: string[];
  /** Every render of a dynamic texture, with the texture it rendered. */
  let renders: MockInstance<Textures.DynamicTexture["render"]>;

  /**
   * Serves the workspace's files, but for the atlases refused, noting each
   * atlas asked for by the first of its pages.
   */
  const serve: FileServer = (url) => {
    const page = ATLAS_PAGE.exec(url.pathname);
    if (!page) return serveWorkspace(url);
    const [, deckId, artScale, index] = page;
    const texture = deckTexture(
      deckId as CardDeckId,
      Number(artScale) as CardArtScale,
    );
    if (index === "0") requested.push(texture);
    return refused.includes(texture) ? undefined : serveWorkspace(url);
  };

  /**
   * Runs a board of the fake game, as `start` says, with a fresh presentation a
   * test can drive, on a canvas sized for a display of the pixel ratio its
   * layout scale names, showing the whole design.
   */
  async function drawBoard(start: BoardStart = {}): Promise<void> {
    const layoutScale = start.layoutScale ?? 1;
    const loaded = start.loaded ?? [atlas(DEFAULT_DESKTOP_CARD_DECK)];
    fakeGame = start.game ?? dealtGame();
    presentation = new TestPresentation(undefined, undefined, start.chosen);
    run = await runFakeTableBoard(fakeGame, presentation, {
      width: DESIGN.width * layoutScale,
      height: DESIGN.height * layoutScale,
      config: { zoom: 1 / layoutScale },
      serve,
      prepare: async (game) => {
        await loadAtlases(game, loaded);
        requested = [];
      },
    });
  }

  beforeEach(async () => {
    requested = [];
    refused = [];
    renders = vi.spyOn(Textures.DynamicTexture.prototype, "render");
    await drawBoard();
  });

  afterEach(() => {
    run.destroy();
    vi.restoreAllMocks();
  });

  /** Returns a card's sprite. */
  function cardSprite(cardId: string): GameObjects.Sprite {
    const sprite = run.scene.cardSprite(cardId);
    if (!sprite) throw new Error(`No sprite for ${cardId}`);
    return sprite;
  }

  /** Returns the sprite of a card in the stock, for tracking where it goes. */
  function stockCardSprite(): GameObjects.Sprite {
    return cardSprite(fakeGame.stock.getCards()[0].id);
  }

  /** Returns every card sprite on the board. */
  function allCardSprites(): GameObjects.Sprite[] {
    return [...run.scene.cardIds].map(cardSprite);
  }

  /** Returns the highest depth of any card other than the given sprites. */
  function deepestCardExcept(...lifted: GameObjects.Sprite[]): number {
    const others = allCardSprites().filter(
      (sprite) => !lifted.includes(sprite),
    );
    return Math.max(...others.map((sprite) => sprite.depth));
  }

  /** Returns a pile's placeholder. */
  function backgroundSprite(pileId: string): GameObjects.Sprite {
    const sprite = run.scene.pileBackgroundSprite(pileId);
    if (!sprite) throw new Error(`No placeholder under ${pileId}`);
    return sprite;
  }

  /** Returns the frame and alpha of each of the given piles' backgrounds. */
  function backgroundsOf(
    pileIds: string[],
  ): { frame: string; alpha: number }[] {
    return pileIds.map((pileId) => {
      const sprite = backgroundSprite(pileId);
      return { frame: sprite.frame.name, alpha: sprite.alpha };
    });
  }

  /** Returns how many times the shared shadow texture has been drawn. */
  function shadowRenders(): number {
    return renders.mock.contexts.filter(
      (texture) =>
        texture instanceof Textures.DynamicTexture &&
        texture.key === PhaserCardFactory.SHADOW_TEXTURE_KEY,
    ).length;
  }

  /** Returns the light the scene laid on its felt. */
  function tableLight(): GameObjects.Gradient {
    const light = run.scene.children.list.find(
      (object) => object instanceof GameObjects.Gradient,
    );
    if (!light) throw new Error("The felt has no light");
    return light;
  }

  /** Returns the middle of a sprite, in the canvas's pixels. */
  function middleOf(sprite: GameObjects.Sprite): [number, number] {
    const bounds = sprite.getBounds();
    return [bounds.centerX, bounds.centerY];
  }

  /** Presses a sprite with the mouse and lets go. */
  function click(sprite: GameObjects.Sprite): void {
    run.pointer("down", ...middleOf(sprite));
    run.pointer("up", ...middleOf(sprite));
  }

  /** Presses a sprite twice with the mouse, in quick succession. */
  function doubleClick(sprite: GameObjects.Sprite): void {
    click(sprite);
    click(sprite);
  }

  /** Moves the mouse onto the middle of a sprite. */
  function hover(sprite: GameObjects.Sprite): void {
    run.pointer("move", ...middleOf(sprite));
  }

  /**
   * Starts listening for the canvas's resizes to reach the deck loader or the
   * light, and returns how many have, each.
   */
  function resizesHeard(): () => number[] {
    const refits = vi.spyOn(BoardDeckLoader.prototype, "refit");
    const fits = vi.spyOn(TableLight.prototype, "fit");
    return () => [refits.mock.calls.length, fits.mock.calls.length];
  }

  describe("construction", () => {
    it("registers under a key no other board shares", () => {
      const next = makeFakeTableBoardScene(dealtGame(), new TestPresentation());

      // Phaser throws on a key already in use, and the next board is added to
      // the game before the last one is gone if the swap is queued.
      expect(next.key).not.toBe(run.scene.key);
    });

    it("draws a placeholder under each pile it is handed one for, and no others", () => {
      const withPlaceholder = fakeGame.piles
        .filter((pile) => run.scene.pileBackgroundSprite(pile.id))
        .map((pile) => pile.id);

      expect(withPlaceholder).toEqual(
        pileBackgrounds(fakeGame).map((background) => background.pileId),
      );
    });
  });

  describe("card shadows", () => {
    /** Returns the shadow sprite of every card, in card order. */
    function allShadows(): GameObjects.Sprite[] {
      return [...run.scene.cardIds].map((cardId) => {
        const shadow = run.scene.cardShadowSprite(cardId);
        if (!shadow) throw new Error(`No shadow for ${cardId}`);
        return shadow;
      });
    }

    it("gives every card a shadow", () => {
      const shadows = [...run.scene.cardIds].map((cardId) =>
        run.scene.cardShadowSprite(cardId),
      );

      expect(shadows.every((shadow) => shadow !== undefined)).toBe(true);
    });

    it("keeps each shadow under its card", () => {
      run.advance(16);

      const cards = allCardSprites().map((sprite) => [sprite.x, sprite.y]);
      expect(allShadows().map((shadow) => [shadow.x, shadow.y])).toEqual(cards);
    });

    it("keeps the shadows on their own texture when the deck changes", async () => {
      await loadAtlases(run.game, [atlas("classic")]);

      presentation.setCardDeck("classic");

      const keys = new Set(allShadows().map((shadow) => shadow.texture.key));
      expect([...keys]).toEqual([PhaserCardFactory.SHADOW_TEXTURE_KEY]);
    });

    it("redraws the shadow once a lost WebGL context is restored", async () => {
      const before = shadowRenders();
      await run.loseContext();

      // A restored context comes back with every framebuffer empty.
      await run.restoreContext();

      expect(shadowRenders()).toBe(before + 1);
    });
  });

  describe("table background", () => {
    it("repaints the camera when the background color setting changes", () => {
      presentation.setBackgroundColor("#123456");

      expect(run.scene.cameras.main.backgroundColor.color).toBe(0x123456);
    });
  });

  describe("card deck", () => {
    /** Returns every sprite the board draws, cards and placeholders alike. */
    function allSprites(): GameObjects.Sprite[] {
      const backgrounds = fakeGame.piles
        .map((pile) => run.scene.pileBackgroundSprite(pile.id))
        .filter((sprite) => sprite !== undefined);
      return [...allCardSprites(), ...backgrounds];
    }

    /** Returns the distinct texture keys the board is drawing from. */
    function texturesInUse(): string[] {
      return [...new Set(allSprites().map((sprite) => sprite.texture.key))];
    }

    /** Returns the texture of every atlas left loaded. */
    function residentTextures(): string[] {
      return residentCardAtlases(run.scene.textures).map(cardAtlasTextureKey);
    }

    it("draws every sprite from the deck the player is using", () => {
      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    describe("drawn from another texture", () => {
      /** A texture as the deck drawn at a 390 px phone's layout scale is. */
      const DRAWN = "cards:mobile@0.75x-drawn-1";

      beforeEach(() => {
        // Every frame of the deck on the table, as the drawn deck has.
        const deck = run.scene.textures.get(run.scene.cardTextureKey);
        const drawn = run.scene.textures.createCanvas(DRAWN, 64, 64);
        for (const frame of deck.getFrameNames()) {
          drawn?.add(frame, 0, 0, 0, 64, 64);
        }
      });

      it("points every card and placeholder at it", () => {
        run.scene.drawCardsFrom(DRAWN, 0.73);

        expect(texturesInUse()).toEqual([DRAWN]);
      });

      it("keeps every sprite on its frame", () => {
        const frames = allSprites().map((sprite) => sprite.frame.name);

        run.scene.drawCardsFrom(DRAWN, 0.73);

        expect(allSprites().map((sprite) => sprite.frame.name)).toEqual(frames);
      });

      it("redraws the shadow at the texture's texel scale", () => {
        const before = shadowRenders();

        run.scene.drawCardsFrom(DRAWN, 0.73);

        expect(shadowRenders()).toBe(before + 1);
      });

      it("leaves the shadow be when only the texture changes", () => {
        // The board boots on 1x.
        const before = shadowRenders();

        run.scene.drawCardsFrom(DRAWN, 1);

        expect(shadowRenders()).toBe(before);
      });

      it("says which texture the cards draw from", () => {
        run.scene.drawCardsFrom(DRAWN, 0.73);

        expect([run.scene.cardTextureKey, run.scene.cardArtScale]).toEqual([
          DRAWN,
          0.73,
        ]);
      });
    });

    describe("from a deck already loaded", () => {
      beforeEach(async () => {
        await loadAtlases(run.game, [atlas("classic")]);
      });

      it("redraws every card and placeholder", () => {
        presentation.setCardDeck("classic");

        expect(texturesInUse()).toEqual([deckTexture("classic")]);
      });

      it("keeps each sprite on the frame it was showing", () => {
        const before = allSprites().map((sprite) => sprite.frame.name);

        presentation.setCardDeck("classic");

        // A swap that dropped the frame would leave every sprite showing the
        // whole atlas page instead of its card.
        expect(allSprites().map((sprite) => sprite.frame.name)).toEqual(before);
      });

      it("keeps each sprite anchored at its top left corner", () => {
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
        presentation.setCardDeck("classic");

        // An atlas page is sixty megabytes of texture memory once uploaded,
        // and a deck the board is no longer drawing is not worth holding it
        // for.
        expect(
          run.scene.textures.exists(deckTexture(DEFAULT_DESKTOP_CARD_DECK)),
        ).toBe(false);
      });
    });

    it("loads a deck it has never drawn before switching to it", () => {
      presentation.setCardDeck("classic");

      expect({ requested, inUse: texturesInUse() }).toEqual({
        requested: [deckTexture("classic")],
        inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK)],
      });
    });

    it("switches once the load it was waiting on finishes", async () => {
      presentation.setCardDeck("classic");

      await run.loaded();

      expect(texturesInUse()).toEqual([deckTexture("classic")]);
    });

    it("stays on the deck it has when the load fails", async () => {
      refused = [deckTexture("classic")];
      presentation.setCardDeck("classic");

      await run.loaded();

      // Pointing sprites at a texture that never arrived would draw the whole
      // board as blank rectangles, which is worse than the deck being left.
      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("ignores a load that finishes after the player changed their mind", async () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      await run.loaded();

      expect(texturesInUse()).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK)]);
    });

    it("releases a deck that finishes loading after the player changed their mind", async () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      await run.loaded();

      expect(residentTextures()).toEqual([
        deckTexture(DEFAULT_DESKTOP_CARD_DECK),
      ]);
    });

    it("draws the latest deck when two loads finish together", async () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck("all-corner-pips");

      // Phaser finishes every file queued while it was busy in one batch, so
      // the stale load's turn comes while the wanted one is resident but not
      // yet drawn, and must leave it alone.
      await run.loaded();

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
      it("loads the chosen deck first when no deck is loaded", async () => {
        run.destroy();

        await drawBoard({ chosen: "classic", loaded: [] });

        expect(requested).toEqual([deckTexture("classic")]);
      });

      it("loads nothing when the chosen deck is loaded", async () => {
        run.destroy();

        await drawBoard({ chosen: "classic", loaded: [atlas("classic")] });

        expect(requested).toEqual([]);
      });

      it("draws from the chosen deck and releases any other left loaded", async () => {
        run.destroy();

        await drawBoard({
          chosen: "classic",
          loaded: [atlas("indexed"), atlas("classic")],
        });

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic")],
          resident: [deckTexture("classic")],
        });
      });

      it("draws from another loaded deck while it fetches the chosen one", async () => {
        run.destroy();

        await drawBoard({ chosen: "classic", loaded: [atlas("indexed")] });

        // The board is playable at once, with the corner badge saying the
        // chosen deck is on its way.
        expect({
          inUse: texturesInUse(),
          requested,
          status: presentation.cardDeckStatuses.at(-1),
        }).toEqual({
          inUse: [deckTexture("indexed")],
          requested: [deckTexture("classic")],
          status: { kind: "loading", deckId: "classic" },
        });
      });

      it("moves to the chosen deck once it arrives, releasing the one it booted on", async () => {
        run.destroy();
        await drawBoard({ chosen: "classic", loaded: [atlas("indexed")] });

        await run.loaded();

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic")],
          resident: [deckTexture("classic")],
        });
      });

      it("preloads the 2x atlas for a board laid out larger than 1x", async () => {
        run.destroy();

        await drawBoard({ chosen: "classic", loaded: [], layoutScale: 2 });

        expect(requested).toEqual([deckTexture("classic", 2)]);
      });

      it("boots on a 2x atlas left loaded without fetching the 1x one", async () => {
        run.destroy();

        // An earlier board on a bigger canvas left it, and loading the cheaper
        // copy would cost a fetch for no gain.
        await drawBoard({ chosen: "classic", loaded: [atlas("classic", 2)] });

        expect({ inUse: texturesInUse(), requested }).toEqual({
          inUse: [deckTexture("classic", 2)],
          requested: [],
        });
      });

      it("boots on the chosen deck at 1x while it fetches the 2x copy", async () => {
        run.destroy();

        await drawBoard({
          chosen: "classic",
          loaded: [atlas("classic")],
          layoutScale: 2,
        });

        // The deck the player chose is on the table, so the drawer is told so.
        expect({
          inUse: texturesInUse(),
          requested,
          status: presentation.cardDeckStatuses.at(-1),
        }).toEqual({
          inUse: [deckTexture("classic")],
          requested: [deckTexture("classic", 2)],
          status: { kind: "drawn", deckId: "classic" },
        });
      });
    });

    describe("atlas density", () => {
      /**
       * Resizes the canvas so the board is laid out at a scale, as the shell
       * sizes it on a display of that pixel ratio showing the whole design.
       */
      function resizeTo(layoutScale: number): void {
        const style = run.game.canvas.style;
        style.width = `${DESIGN.width}px`;
        style.height = `${DESIGN.height}px`;
        run.game.scale.resize(
          DESIGN.width * layoutScale,
          DESIGN.height * layoutScale,
        );
      }

      /** Returns the scene's shadow texture. */
      function shadowTexture(): Textures.DynamicTexture {
        const texture = run.scene.textures.get(
          PhaserCardFactory.SHADOW_TEXTURE_KEY,
        );
        if (!(texture instanceof Textures.DynamicTexture)) {
          throw new Error("No shadow texture was created");
        }
        return texture;
      }

      it("fetches the 2x atlas once the board grows past 1x", () => {
        resizeTo(2);

        expect({ requested, inUse: texturesInUse() }).toEqual({
          requested: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK)],
        });
      });

      it("moves every sprite to the 2x atlas once it arrives, releasing 1x", async () => {
        resizeTo(2);

        await run.loaded();

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          resident: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
        });
      });

      it("draws the 2x artwork texel for texel at a layout scale of 2", async () => {
        resizeTo(2);
        await run.loaded();

        run.advance(16);

        const scales = new Set(allSprites().map((sprite) => sprite.scale));
        expect([...scales]).toEqual([1]);
      });

      it("redraws the shadow at 2x, refitting every shadow sprite to it", async () => {
        resizeTo(2);

        await run.loaded();

        const origins = new Set(
          [...run.scene.cardIds].map((cardId) => {
            const shadow = run.scene.cardShadowSprite(cardId);
            return `${shadow?.displayOriginX},${shadow?.displayOriginY}`;
          }),
        );
        expect({
          size: [shadowTexture().width, shadowTexture().height],
          origins: [...origins],
        }).toEqual({ size: [440 + 64, 614 + 96], origins: ["32,48"] });
      });

      it("says nothing about the deck, which has not changed", async () => {
        resizeTo(2);

        await run.loaded();

        expect(presentation.cardDeckStatuses).toEqual([
          { kind: "drawn", deckId: DEFAULT_DESKTOP_CARD_DECK },
        ]);
      });

      it("fetches the 2x atlas once however often the board resizes", () => {
        resizeTo(2);

        resizeTo(2.5);

        expect(requested).toEqual([deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)]);
      });

      it("keeps the 2x atlas when the board shrinks again", async () => {
        // Swapping back on every resize would reload the deck each time a
        // window's edge is dragged across the line.
        resizeTo(2);
        await run.loaded();

        resizeTo(1);

        expect({ requested, inUse: texturesInUse() }).toEqual({
          requested: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
          inUse: [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)],
        });
      });

      it("stays on 1x without a word when the 2x atlas fails to load", async () => {
        refused = [deckTexture(DEFAULT_DESKTOP_CARD_DECK, 2)];
        resizeTo(2);

        await run.loaded();

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

      it("loads a new deck at the density the board needs now", async () => {
        resizeTo(2);
        await run.loaded();
        resizeTo(1);

        presentation.setCardDeck("classic");

        expect(requested.at(-1)).toBe(deckTexture("classic"));
      });

      it("lets a deck chosen during the 2x fetch win", async () => {
        resizeTo(2);
        presentation.setCardDeck("classic");

        await run.loaded();

        expect({
          inUse: texturesInUse(),
          resident: residentTextures(),
        }).toEqual({
          inUse: [deckTexture("classic", 2)],
          resident: [deckTexture("classic", 2)],
        });
      });

      it("fetches the deck being loaded at 2x if the board grows meanwhile", async () => {
        presentation.setCardDeck("classic");
        resizeTo(2);

        await run.loaded();

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

      expect(requested).toEqual([]);
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

    it("says the deck is drawn once the load finishes", async () => {
      presentation.setCardDeck("classic");

      await run.loaded();

      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
        "loading:classic",
        "drawn:classic",
      ]);
    });

    it("says the deck is unavailable when the load fails", async () => {
      refused = [deckTexture("classic")];
      presentation.setCardDeck("classic");

      await run.loaded();

      // Without this the drawer would be left showing a deck the board never
      // drew, and would persist it for the next visit to fail on too.
      expect(statusesReported().at(-1)).toBe("unavailable:classic");
    });

    it("answers for a deck that is still wanted and no other", async () => {
      presentation.setCardDeck("classic");
      presentation.setCardDeck(DEFAULT_DESKTOP_CARD_DECK);

      await run.loaded();

      // The switch back is answered at once, and the load that arrives after it
      // is nobody's question by then.
      expect(statusesReported()).toEqual([
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
        "loading:classic",
        `drawn:${DEFAULT_DESKTOP_CARD_DECK}`,
      ]);
    });

    it("stops following the setting once the scene shuts down", async () => {
      run.game.scene.stop(run.scene.key);
      await loadAtlases(run.game, [atlas("classic")]);

      presentation.setCardDeck("classic");

      expect(run.scene.cardTextureKey).toBe(
        deckTexture(DEFAULT_DESKTOP_CARD_DECK),
      );
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

      run.scene.scene.restart();
      run.advance(16);

      // A renderer that dealt would throw the game in progress away.
      expect(fakeGame.foundations[0].topCard).toBe(ace);
    });
  });

  describe.each(ENDINGS)("once the scene ends with %s", (_, endScene) => {
    it("stops following the presentation", () => {
      endScene(run);

      expect([
        presentation.listenerCount,
        presentation.deckListenerCount,
      ]).toEqual([0, 0]);
    });

    it("stops listening for the canvas to resize", () => {
      const heard = resizesHeard();
      endScene(run);

      run.game.scale.resize(1000, 800);

      expect(heard()).toEqual([0, 0]);
    });

    it("takes the light off the felt", () => {
      const light = tableLight();

      endScene(run);

      // Destroying an object lets go of its scene.
      expect(light.scene).toBeUndefined();
    });

    it("stops redrawing the shadow when a lost WebGL context is restored", async () => {
      endScene(run);
      const before = shadowRenders();
      await run.loseContext();

      await run.restoreContext();

      expect(shadowRenders()).toBe(before);
    });
  });

  describe("a restarted scene", () => {
    it("lets go of everything when it is then destroyed", () => {
      run.scene.scene.restart();
      run.advance(16);
      const heard = resizesHeard();

      run.game.scene.remove(run.scene.key);
      run.game.scale.resize(1000, 800);

      expect([
        presentation.listenerCount,
        presentation.deckListenerCount,
        ...heard(),
      ]).toEqual([0, 0, 0, 0]);
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
      expect(run.scene.pileBackgroundSprite(fakeGame.waste.id)).toBeUndefined();
    });

    describe("an empty slot that stops being pressable", () => {
      let game: StockOverrideTableGame;

      beforeEach(async () => {
        run.destroy();
        game = new StockOverrideTableGame();
        game.startNewGame();
        // Every card drawn, as when the waste is next turned back over.
        for (const card of [...game.stock.getCards()]) {
          relocate(game, card.id, game.waste);
        }
        game.stockActionable = true;
        await drawBoard({ game });
        run.advance(16);
      });

      it("drops the pointer at once from under a pointer that has not moved", () => {
        hover(backgroundSprite(STOCK_PILE_ID));
        game.stockActionable = false;

        run.advance(16);

        expect(run.game.canvas.style.cursor).toBe("default");
      });

      it("leaves the canvas cursor alone while the pointer is elsewhere", () => {
        game.stockActionable = false;

        run.advance(16);

        expect(run.game.canvas.style.cursor).toBe("");
      });
    });
  });

  describe("pointer polling", () => {
    it("hit tests every frame so hover follows cards that move under the pointer", () => {
      // Phaser's default only re-tests when the pointer itself moves, which
      // leaves the hover attached to a card that has since slid away.
      expect(run.scene.input.pollRate).toBe(0);
    });
  });

  describe("the light on the felt", () => {
    it("lies beneath every placeholder and card", () => {
      expect(tableLight().depth).toBeLessThan(
        depthFor(RenderLayer.PILE_BACKGROUND),
      );
    });

    it("spreads over the canvas again when it resizes", () => {
      run.game.scale.resize(1000, 800);

      const light = tableLight();
      expect([light.x, light.y, light.width, light.height]).toEqual([
        500, 256, 2500, 1680,
      ]);
    });
  });

  describe("responsiveness", () => {
    it("snaps cards to their new places after a resize rather than easing", () => {
      const sprite = stockCardSprite();
      run.advance(16);
      const beforeResize = sprite.x;

      // A wider viewport centers the layout further right, moving every pile.
      run.game.scale.resize(DESIGN.width * 2, DESIGN.height);
      run.advance(16);

      // A snap lands on the target in the first frame, so the next frame leaves
      // the card alone; an ease would still be closing the gap.
      const afterResize = sprite.x;
      run.advance(16);
      expect(afterResize).not.toBe(beforeResize);
      expect(sprite.x).toBe(afterResize);
    });
  });

  describe("update loop", () => {
    it("lays each card out where its pile's geometry puts it", () => {
      const viewport = run.scene.viewport;
      const stockOrigin = computePileOrigins(
        FAKE_TABLE_LAYOUT,
        viewport,
        computeScale(FAKE_TABLE_LAYOUT, viewport),
      ).get(STOCK_PILE_ID)!;
      const sprite = stockCardSprite();

      run.advance(16);

      // Stock cards stack with no offset, so they land exactly on the origin.
      expect({ x: sprite.x, y: sprite.y }).toEqual(stockOrigin);
    });
  });

  describe("auto-moved card", () => {
    /**
     * Puts the ace of hearts on top of tableau 0 and double clicks it to a
     * foundation, returning its sprite, which is still back at the tableau.
     */
    function autoMoveTheAce(): GameObjects.Sprite {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const sprite = cardSprite(ace.id);
      run.advance(16); // the first frame snaps the board into place

      doubleClick(sprite);

      return sprite;
    }

    it("draws it over every other card while it crosses the board", () => {
      const sprite = autoMoveTheAce();

      run.advance(16);

      // Its foundation is empty, so the depth it is headed for is the lowest on
      // the board: without the lift it would slide under the columns it crosses.
      expect(sprite.depth).toBeGreaterThan(deepestCardExcept(sprite));
    });

    it("settles it back among the resting cards once it lands", () => {
      const sprite = autoMoveTheAce();
      run.advance(16); // in flight

      run.advance(2000); // long enough to land, and a frame after

      expect(sprite.depth).toBeLessThan(depthFor(RenderLayer.FLYING_CARD, 0));
    });
  });

  describe("cards the model relocates without a gesture reporting it", () => {
    /** Presses the top of the stock once, which is what draws. */
    function drawFromStock(): GameObjects.Sprite[] {
      const top = fakeGame.stock.topCard!;
      run.advance(16); // the first frame snaps the board into place

      click(cardSprite(top.id));

      return fakeGame.waste.getCards().map((card) => cardSprite(card.id));
    }

    it("lifts the drawn cards over the board on their way to the waste", () => {
      const drawn = drawFromStock();

      run.advance(16);

      // A draw is not a move, but the model still announces what it moved.
      const restingDepth = deepestCardExcept(...drawn);
      expect(drawn.every((sprite) => sprite.depth > restingDepth)).toBe(true);
    });

    it("lifts the cards an undo puts back", () => {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const sprite = cardSprite(ace.id);
      run.advance(16);
      doubleClick(sprite); // to a foundation
      run.advance(2000); // land it there

      fakeGame.undo();
      run.advance(16);

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
      const firstSprite = cardSprite(first.id);
      const secondSprite = cardSprite(second.id);
      run.advance(16);

      doubleClick(firstSprite);
      run.advance(16); // still crossing
      doubleClick(secondSprite);
      run.advance(16);

      const restingDepth = deepestCardExcept(firstSprite, secondSprite);
      expect([
        firstSprite.depth > restingDepth,
        secondSprite.depth > firstSprite.depth,
      ]).toEqual([true, true]);
    });
  });

  describe("game reset", () => {
    /** Returns whether any highlight border is currently drawn. */
    function anyBorderDrawn(): boolean {
      // The renderer's borders are the only graphics on the board.
      return run.scene.children.list.some(
        (object) => object instanceof GameObjects.Graphics && object.visible,
      );
    }

    /**
     * Puts the ace of hearts on top of tableau 0 and moves the mouse onto its
     * foot, below the card it lies on, so a new deal leaves bare table under
     * the pointer.
     */
    function hoverTheAce(): void {
      const ace = relocate(fakeGame, "card-hearts-ace", fakeGame.tableaus[0]);
      const sprite = cardSprite(ace.id);
      run.advance(16);
      const bounds = sprite.getBounds();
      run.pointer("move", bounds.centerX, bounds.bottom - 10);
    }

    it("draws a border while a card is hovered", () => {
      hoverTheAce();

      run.advance(16);

      expect(anyBorderDrawn()).toBe(true);
    });

    it("drops a hover so no border survives into the new deal", () => {
      hoverTheAce();
      run.advance(16);

      // Dealing a fresh board is what raises game-reset, so the interaction
      // state is cleared through the same path the game itself uses.
      fakeGame.startNewGame();
      run.advance(16);

      expect(anyBorderDrawn()).toBe(false);
    });

    it("snaps every card into place rather than easing from the old deal", () => {
      const positions = () =>
        allCardSprites().map((sprite) => ({ x: sprite.x, y: sprite.y }));
      run.advance(16);
      const before = positions();

      fakeGame.startNewGame();
      run.advance(16);

      // A snap lands on the target in one frame; an ease would leave the cards
      // part way between the two deals.
      const after = positions();
      expect(after).not.toEqual(before);
      run.advance(16);
      expect(positions()).toEqual(after);
    });
  });
});
