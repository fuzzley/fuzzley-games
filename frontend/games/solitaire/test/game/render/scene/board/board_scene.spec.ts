import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { resetGameModel } from "@/game/model/game/game_model_factory";
import { MockScaleManager, MockSprite } from "@test/support/phaser_mocks";

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

  describe("cursors and draggability", () => {
    it("uses a pointer cursor only for interactable cards", () => {
      const tableau = boardScene.tableauPiles[1];

      expect(asMock(tableau.playingCardVisuals[0].sprite).input?.cursor).toBe(
        "default",
      );
      expect(asMock(tableau.playingCardVisuals[1].sprite).input?.cursor).toBe(
        "pointer",
      );
    });

    it("resets a card's cursor to default when it is flipped face down", () => {
      const cardVisual = boardScene.tableauPiles[0].playingCardVisuals[0];
      cardVisual.playingCard.faceUp = false;

      boardScene.gameModel.emit("card-flipped", {
        cardId: cardVisual.playingCard.id,
        faceUp: false,
      });

      expect(asMock(cardVisual.sprite).input?.cursor).toBe("default");
    });

    it("makes only draggable cards draggable, not merely interactable ones", () => {
      vi.mocked(boardScene.input.setDraggable).mockClear();

      boardScene.gameModel.emit("card-flipped", {
        cardId: "card-clubs-ace",
        faceUp: true,
      });

      const stockPile = boardScene.stockPile;
      const topStockCard =
        stockPile.playingCardVisuals[stockPile.playingCardVisuals.length - 1];
      const tableau = boardScene.tableauPiles[0];
      const topTableauCard =
        tableau.playingCardVisuals[tableau.playingCardVisuals.length - 1];

      expect(boardScene.input.setDraggable).toHaveBeenCalledWith(
        topStockCard.sprite,
        false,
      );
      expect(boardScene.input.setDraggable).toHaveBeenCalledWith(
        topTableauCard.sprite,
        true,
      );
    });
  });

  describe("getPileVisualById", () => {
    it("returns the pile visual for a known id", () => {
      expect(boardScene.getPileVisualById("stock")).toBe(boardScene.stockPile);
    });

    it("returns null for an unknown id", () => {
      expect(boardScene.getPileVisualById("non-existent-pile")).toBeNull();
    });
  });

  describe("responsiveness", () => {
    it("re-lays out the board when the viewport is resized", () => {
      const scale = boardScene.scale as unknown as MockScaleManager;
      scale.width = 903.5;
      scale.height = 475;

      scale.emit("resize");

      expect(boardScene.stockPile.position).toEqual({ x: 20, y: 20 });
    });
  });

  describe("model synchronization", () => {
    it("populates the stock pile visuals on creation", () => {
      expect(boardScene.stockPile.playingCardVisuals.length).toBeGreaterThan(0);
    });

    it("re-syncs visual piles when a card is moved", () => {
      boardScene.gameModel.stock.clear();

      boardScene.gameModel.emit("card-moved");

      expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
    });

    it("re-syncs visual piles when the stock is recycled", () => {
      boardScene.gameModel.stock.clear();

      boardScene.gameModel.emit("stock-recycled");

      expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
    });

    it("moves a card into the waste visual pile when the model does", () => {
      const card = boardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
      boardScene.gameModel.getPileContainingCard(card.id)?.removeCard(card);
      boardScene.gameModel.waste.addCard(card);

      boardScene.gameModel.emit("card-moved");

      expect(
        boardScene.wastePile.playingCardVisuals.map((v) => v.playingCard),
      ).toEqual([card]);
    });

    it("moves a card into the foundation visual pile when the model does", () => {
      const card = boardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
      boardScene.gameModel.getPileContainingCard(card.id)?.removeCard(card);
      boardScene.gameModel.foundations[0].addCard(card);

      boardScene.gameModel.emit("card-moved");

      expect(
        boardScene.foundationPiles[0].playingCardVisuals.map(
          (v) => v.playingCard,
        ),
      ).toEqual([card]);
    });

    it("ignores model cards that have no registered visual", () => {
      const stockCard = boardScene.gameModel.stock.getCards()[0];
      boardScene.cardVisualsMap.delete(stockCard.id);
      const movedCard = boardScene.gameModel.stock.getCards()[1];
      boardScene.gameModel.stock.removeCard(movedCard);
      boardScene.gameModel.waste.addCard(movedCard);
      boardScene.cardVisualsMap.delete(movedCard.id);

      expect(() => boardScene.gameModel.emit("card-moved")).not.toThrow();
    });
  });

  describe("card flipping", () => {
    it("shows the card face when it is flipped face up", () => {
      const visual = boardScene.tableauPiles[0].playingCardVisuals[0];

      boardScene.gameModel.emit("card-flipped", {
        cardId: visual.playingCard.id,
        faceUp: true,
      });

      expect(asMock(visual.sprite).frame).toBe(visual.playingCard.id);
    });

    it("shows the card back when it is flipped face down", () => {
      const visual = boardScene.tableauPiles[0].playingCardVisuals[0];

      boardScene.gameModel.emit("card-flipped", {
        cardId: visual.playingCard.id,
        faceUp: false,
      });

      expect(asMock(visual.sprite).frame).toBe("card-back-blue");
    });

    it("does not throw when the flipped card visual has no sprite", () => {
      const visual = boardScene.tableauPiles[0].playingCardVisuals[0];
      visual.sprite = null as unknown as Phaser.GameObjects.Sprite;

      expect(() =>
        boardScene.gameModel.emit("card-flipped", {
          cardId: visual.playingCard.id,
          faceUp: true,
        }),
      ).not.toThrow();
    });

    it("does not throw when the stock pile sprite or its input is missing", () => {
      boardScene.stockPile.sprite =
        null as unknown as Phaser.GameObjects.Sprite;
      expect(() =>
        boardScene.gameModel.emit("card-flipped", {
          cardId: "card-clubs-ace",
          faceUp: true,
        }),
      ).not.toThrow();

      boardScene.stockPile.sprite = {
        input: null,
      } as unknown as Phaser.GameObjects.Sprite;
      expect(() =>
        boardScene.gameModel.emit("card-flipped", {
          cardId: "card-clubs-ace",
          faceUp: true,
        }),
      ).not.toThrow();
    });
  });

  describe("creation errors and helpers", () => {
    it("throws when a card model is missing while creating visuals", () => {
      resetGameModel();
      const freshScene = new BoardScene();
      const getCardById = vi
        .spyOn(SolitaireGame.prototype, "getCardById")
        .mockReturnValue(undefined);

      expect(() => freshScene.create()).toThrow("Card model not found for: ");

      getCardById.mockRestore();
    });

    it("logs a congratulations message when the game is won", () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

      boardScene.gameModel.emit("game-won");

      expect(consoleLog).toHaveBeenCalledWith("Congratulations! You won!");
      consoleLog.mockRestore();
    });

    it("exposes the layout manager", () => {
      expect(boardScene.getLayoutManager()).toBeDefined();
    });
  });
});
