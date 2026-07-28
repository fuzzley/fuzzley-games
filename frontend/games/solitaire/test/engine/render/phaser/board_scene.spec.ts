import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { resetGameModel } from "@/games/klondike/game_model_factory";
import {
  MockInput,
  MockScaleManager,
  MockSceneEvents,
  MockSprite,
  SHUTDOWN_EVENT,
} from "@test/support/phaser_mocks";
import {
  computePileOrigins,
  computeScale,
} from "@/engine/render/layout/board_geometry";
import { DESIGN_WIDTH_PX } from "@/engine/render/layout/board_layout_constants";
import { STOCK_PILE_ID } from "@/engine/core/card/card_pile";
import { relocate } from "@test/support/game_scenarios";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as MockSprite;
}

describe("BoardScene", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    resetGameModel();
    boardScene = new BoardScene();
    boardScene.create();
  });

  /** The sprite of a card sitting in the stock, for tracking where it goes. */
  function stockCardSprite(): MockSprite {
    const card = boardScene.gameModel.stock.getCards()[0];
    return asMock(boardScene.cardSprite(card.id));
  }

  /** Every card sprite on the board. */
  function allCardSprites(): MockSprite[] {
    return [...boardScene.cardIds].map((cardId) =>
      asMock(boardScene.cardSprite(cardId)),
    );
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
      const injectedModel = new SolitaireGame();

      const scene = new BoardScene(injectedModel);

      expect(scene.gameModel).toBe(injectedModel);
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
      boardScene.gameModel.settings.setBackgroundColor("#123456");

      expect(camera().setBackgroundColor).toHaveBeenCalledWith("#123456");
    });

    it("stops following the setting once the scene shuts down", () => {
      const events = boardScene.events as unknown as MockSceneEvents;
      events.emit(SHUTDOWN_EVENT);
      camera().setBackgroundColor.mockClear();

      boardScene.gameModel.settings.setBackgroundColor("#654321");

      // A scene restart runs create() again, so a subscription left behind here
      // would accumulate one stale listener per restart.
      expect(camera().setBackgroundColor).not.toHaveBeenCalled();
    });
  });

  describe("dealing", () => {
    it("renders a board that is already dealt", () => {
      const dealt = [
        boardScene.gameModel.stock.size,
        ...boardScene.gameModel.tableaus.map((pile) => pile.size),
      ];

      expect(dealt).toEqual([24, 1, 2, 3, 4, 5, 6, 7]);
    });

    it("does not re-deal when the scene is created again", () => {
      const ace = relocate(
        boardScene.gameModel,
        "card-hearts-ace",
        boardScene.gameModel.foundations[0],
      );

      boardScene.create();

      // A renderer that dealt would throw the game in progress away.
      expect(boardScene.gameModel.foundations[0].topCard).toBe(ace);
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
      const pileIds = boardScene.gameModel.tableaus.map((pile) => pile.id);

      expect(backgroundsOf(pileIds)).toEqual(
        Array(7).fill({ frame: "card-placeholder", alpha }),
      );
    });

    it("gives every foundation pile a placeholder background at the shared alpha", () => {
      const pileIds = boardScene.gameModel.foundations.map((pile) => pile.id);

      expect(backgroundsOf(pileIds)).toEqual(
        Array(4).fill({
          frame: "card-placeholder-full-border-circle",
          alpha,
        }),
      );
    });

    it("gives the waste pile no background, so it fans over bare table", () => {
      expect(
        boardScene.pileBackgroundSprite(boardScene.gameModel.waste.id),
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
        viewport,
        computeScale(viewport),
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
      const ace = relocate(
        boardScene.gameModel,
        "card-hearts-ace",
        boardScene.gameModel.tableaus[0],
      );
      const sprite = asMock(boardScene.cardSprite(ace.id));
      boardScene.update(0, 16); // the first frame snaps the board into place

      sprite.emit("pointerdown");
      sprite.emit("pointerdown");

      return sprite;
    }

    /** The highest depth of any card other than the given sprite. */
    function deepestCardExcept(sprite: MockSprite): number {
      const others = allCardSprites().filter((other) => other !== sprite);
      return Math.max(...others.map((other) => other.depth));
    }

    it("draws it over every other card while it crosses the board", () => {
      const sprite = autoMoveTheAce();

      boardScene.update(16, 16);

      // Its foundation is empty, so the depth it is headed for is the lowest on
      // the board: without the lift it would slide under the columns it crosses.
      expect(sprite.depth).toBeGreaterThan(deepestCardExcept(sprite));
    });

    it("returns it to its foundation's own depth once it lands", () => {
      const sprite = autoMoveTheAce();
      boardScene.update(16, 16); // in flight

      boardScene.update(32, 0); // a zero delta lands every card
      boardScene.update(48, 16); // the frame after it has landed

      expect(sprite.depth).toBe(1); // the only card in its foundation
    });
  });

  describe("game reset", () => {
    /** The card sprite currently wearing a highlight border, if any. */
    function highlightedCardSprite(): MockSprite | undefined {
      return allCardSprites().find((sprite) => sprite.depth >= 1000);
    }

    it("drops a hover so no border survives into the new deal", () => {
      const ace = relocate(
        boardScene.gameModel,
        "card-hearts-ace",
        boardScene.gameModel.tableaus[0],
      );
      asMock(boardScene.cardSprite(ace.id)).emit("pointerover");
      boardScene.update(0, 16);

      // Dealing a fresh board is what raises game-reset, so the interaction
      // state is cleared through the same path the game itself uses.
      boardScene.gameModel.startNewGame();
      boardScene.update(16, 16);

      expect(highlightedCardSprite()).toBeUndefined();
    });

    it("snaps every card into place rather than easing from the old deal", () => {
      const positions = () =>
        allCardSprites().map((sprite) => ({ x: sprite.x, y: sprite.y }));
      boardScene.update(0, 16);
      const before = positions();

      boardScene.gameModel.startNewGame();
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
      resetGameModel();
      const freshScene = new BoardScene();
      const getCardById = vi
        .spyOn(SolitaireGame.prototype, "getCardById")
        .mockReturnValue(undefined);

      expect(() => freshScene.create()).toThrow("Card model not found for: ");

      getCardById.mockRestore();
    });
  });
});
