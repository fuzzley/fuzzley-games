import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { makeFakeTableBoardScene } from "@test/support/fake_table/scene";
import { TestPresentation } from "@test/support/presentation";
import { FakeTableGame } from "@test/support/fake_table/game";
import {
  MockGraphics,
  MockInput,
  MockScaleManager,
  MockSceneEvents,
  MockSprite,
  SHUTDOWN_EVENT,
} from "@test/support/phaser_mocks";
import { RenderLayer, depthFor } from "@/engine/render/layout/render_layers";
import {
  computePileOrigins,
  computeScale,
  designSize,
} from "@/engine/render/layout/table_layout";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";

const DESIGN_WIDTH_PX = designSize(FAKE_TABLE_LAYOUT).width;
import { STOCK_PILE_ID } from "@test/support/fake_table/zones";
import { relocate } from "@test/support/game_scenarios";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as MockSprite;
}

/**
 * A board scene drawing the given game, or the shared dealt one, laid out the
 * way the real application lays it out.
 */
let fakeGame: FakeTableGame;
let presentation: TestPresentation;

/** A dealt game drawn with a presentation a test can drive. */
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

  /** The sprite of a card sitting in the stock, for tracking where it goes. */
  function stockCardSprite(): MockSprite {
    const card = fakeGame.stock.getCards()[0];
    return asMock(boardScene.cardSprite(card.id));
  }

  /** Every card sprite on the board. */
  function allCardSprites(): MockSprite[] {
    return [...boardScene.cardIds].map((cardId) =>
      asMock(boardScene.cardSprite(cardId)),
    );
  }

  /** The highest depth of any card other than the given sprites. */
  function deepestCardExcept(...lifted: MockSprite[]): number {
    const others = allCardSprites().filter(
      (sprite) => !lifted.includes(sprite),
    );
    return Math.max(...others.map((sprite) => sprite.depth));
  }

  /** The frame and alpha of each of the given piles' background sprites. */
  function backgroundsOf(
    pileIds: string[],
  ): { frame: string; alpha: number }[] {
    return pileIds.map((pileId) => {
      const sprite = asMock(boardScene.pileBackgroundSprite(pileId));
      return { frame: sprite.frame, alpha: sprite.alpha };
    });
  }

  describe("construction", () => {
    it("renders the game model it is injected with", () => {
      const injectedModel = new FakeTableGame();

      const scene = makeBoardScene(injectedModel);

      expect(scene.tableGame).toBe(injectedModel);
    });
  });

  describe("table background", () => {
    /** The camera's recording background setter. */
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
     * Puts the ace of hearts face up on top of tableau 0, lays the board out,
     * then double clicks it so the model moves it to a foundation. Returns its
     * sprite, which is still back at the tableau with the board to cross.
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

      // A single press reports no move of its own, so before the model was
      // asked these took the waste's depth the instant they were drawn.
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

      // Undo never passes through the intent pipeline at all, so nothing used
      // to lift the card it sent back across the board.
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

    /** Whether any highlight border is currently drawn. */
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

  describe("creation errors", () => {
    it("throws when a card model is missing while creating sprites", () => {
      const freshScene = makeBoardScene();
      const getCardById = vi
        .spyOn(FakeTableGame.prototype, "getCardById")
        .mockReturnValue(undefined);

      expect(() => freshScene.create()).toThrow("Card model not found for: ");

      getCardById.mockRestore();
    });
  });
});
