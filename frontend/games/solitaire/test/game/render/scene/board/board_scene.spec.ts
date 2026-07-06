import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { resetGameModel } from "@/game/model/game/game_model_factory";
import { MockScaleManager, MockSprite } from "@test/support/phaser_mocks";
import * as ViewStateBuilder from "@/game/render/scene/board/view/board_view_state_builder";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/** Views a Phaser sprite handle as the underlying recording mock sprite. */
function asMock(sprite: unknown): MockSprite {
  return sprite as unknown as MockSprite;
}

describe("BoardScene", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    resetGameModel();
    boardScene = new BoardScene();
    boardScene.create();
  });

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

      boardScene.gameModel.setBackgroundColor("#123456");

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

  describe("responsiveness", () => {
    it("sets snapAll on scale resize", () => {
      const scale = boardScene.scale as unknown as MockScaleManager;
      boardScene["inputManager"].snapAll = false;

      scale.emit("resize");

      expect(boardScene["inputManager"].snapAll).toBe(true);
    });
  });

  describe("update loop", () => {
    it("builds the board view state and applies it", () => {
      const buildSpy = vi.spyOn(ViewStateBuilder, "buildBoardViewState");
      const applySpy = vi.spyOn(boardScene["viewApplier"], "apply");

      boardScene.update(100, 16.6);

      expect(buildSpy).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalled();
    });
  });

  describe("game reset", () => {
    it("resets hovered states on game-reset", () => {
      const mockCardVisual = { playingCard: { id: "card-1" } };
      boardScene["inputManager"].hoveredCardVisual = mockCardVisual as any;
      boardScene["inputManager"].isStockBackgroundHovered = true;
      boardScene["inputManager"].drag = {} as any;
      boardScene["inputManager"].snapAll = false;

      boardScene.gameModel.emit("game-reset", undefined);

      expect(boardScene["inputManager"].hoveredCardVisual).toBeNull();
      expect(boardScene["inputManager"].isStockBackgroundHovered).toBe(false);
      expect(boardScene["inputManager"].drag).toBeNull();
      expect(boardScene["inputManager"].snapAll).toBe(true);
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
