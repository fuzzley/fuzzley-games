import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { resetGameModel } from "@/game/model/game/game_model_factory";
import {
  MockInput,
  MockScaleManager,
  MockSprite,
} from "@test/support/phaser_mocks";
import {
  computePileOrigins,
  computeScale,
} from "@/game/render/scene/board/view/board_geometry";
import { DESIGN_WIDTH_PX } from "@/game/render/scene/board/layout/board_layout_constants";
import { STOCK_PILE_ID } from "@/game/model/card/card_pile";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
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

  /** The visual for a card sitting in the stock, for tracking its sprite. */
  function stockCardVisual(): PlayingCardVisual {
    const card = boardScene.gameModel.stock.getCards()[0];
    return boardScene.cardVisualsMap.get(card.id)!;
  }

  describe("construction", () => {
    it("renders the game model it is injected with", () => {
      const injectedModel = new SolitaireGame();

      const scene = new BoardScene(injectedModel);

      expect(scene.gameModel).toBe(injectedModel);
    });
  });

  describe("table background", () => {
    it("repaints the camera when the background color setting changes", () => {
      const camera = boardScene.cameras.main as unknown as {
        setBackgroundColor: ReturnType<typeof vi.fn>;
      };

      boardScene.gameModel.settings.setBackgroundColor("#123456");

      expect(camera.setBackgroundColor).toHaveBeenCalledWith("#123456");
    });
  });

  describe("pile backgrounds", () => {
    it("gives the stock pile a placeholder background at the shared alpha", () => {
      const sprite = asMock(boardScene.stockPile.sprite);

      expect(sprite.frame).toBe("card-placeholder-full-border-reset");
      expect(sprite.alpha).toBe(BoardScene.PILE_BACKGROUND_ALPHA);
    });

    it("gives every tableau pile a placeholder background at the shared alpha", () => {
      const frames = boardScene.tableauPiles.map((p) => asMock(p.sprite).frame);
      const alphas = boardScene.tableauPiles.map((p) => asMock(p.sprite).alpha);

      expect(frames).toEqual(Array(7).fill("card-placeholder"));
      expect(alphas).toEqual(Array(7).fill(BoardScene.PILE_BACKGROUND_ALPHA));
    });

    it("gives every foundation pile a placeholder background at the shared alpha", () => {
      const frames = boardScene.foundationPiles.map(
        (p) => asMock(p.sprite).frame,
      );
      const alphas = boardScene.foundationPiles.map(
        (p) => asMock(p.sprite).alpha,
      );

      expect(frames).toEqual(
        Array(4).fill("card-placeholder-full-border-circle"),
      );
      expect(alphas).toEqual(Array(4).fill(BoardScene.PILE_BACKGROUND_ALPHA));
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
      const sprite = asMock(stockCardVisual().sprite);
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
      const sprite = asMock(stockCardVisual().sprite);

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
      const sprite = asMock(boardScene.cardVisualsMap.get(ace.id)!.sprite);
      boardScene.update(0, 16); // the first frame snaps the board into place

      sprite.emit("pointerdown");
      sprite.emit("pointerdown");

      return sprite;
    }

    /** The highest depth of any card other than the given sprite. */
    function deepestCardExcept(sprite: MockSprite): number {
      const others = [...boardScene.cardVisualsMap.values()]
        .map((visual) => asMock(visual.sprite))
        .filter((other) => other !== sprite);
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
      return [...boardScene.cardVisualsMap.values()]
        .map((visual) => asMock(visual.sprite))
        .find((sprite) => sprite.depth >= 1000);
    }

    it("drops a hover so no border survives into the new deal", () => {
      const ace = relocate(
        boardScene.gameModel,
        "card-hearts-ace",
        boardScene.gameModel.tableaus[0],
      );
      asMock(boardScene.cardVisualsMap.get(ace.id)!.sprite).emit("pointerover");
      boardScene.update(0, 16);

      // Dealing a fresh board is what raises game-reset, so the interaction
      // state is cleared through the same path the game itself uses.
      boardScene.gameModel.startNewGame();
      boardScene.update(16, 16);

      expect(highlightedCardSprite()).toBeUndefined();
    });

    it("snaps every card into place rather than easing from the old deal", () => {
      boardScene.update(0, 16);
      const before = [...boardScene.cardVisualsMap.values()].map((visual) => ({
        x: asMock(visual.sprite).x,
        y: asMock(visual.sprite).y,
      }));

      boardScene.gameModel.startNewGame();
      boardScene.update(16, 16);

      const after = [...boardScene.cardVisualsMap.values()].map((visual) => ({
        x: asMock(visual.sprite).x,
        y: asMock(visual.sprite).y,
      }));
      // A snap lands on the target in one frame; an ease would leave the cards
      // part way between the two deals.
      expect(after).not.toEqual(before);
      boardScene.update(32, 16);
      const settled = [...boardScene.cardVisualsMap.values()].map((visual) => ({
        x: asMock(visual.sprite).x,
        y: asMock(visual.sprite).y,
      }));
      expect(settled).toEqual(after);
    });
  });

  describe("creation errors", () => {
    it("throws when a card model is missing while creating visuals", () => {
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
