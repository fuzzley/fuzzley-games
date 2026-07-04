import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import {
  Suit,
  Type,
  ALL_PLAYING_CARD_IDS,
} from "@/game/model/card/playing_card";

// Mock phaser entirely
vi.mock("phaser", () => {
  const createMockSprite = (x = 0, y = 0, texture = "", frame = "") => {
    const listeners: { [event: string]: Function[] } = {};
    const dataMap = new Map<string, any>();
    const sprite = {
      x,
      y,
      scale: 1,
      depth: 0,
      alpha: 1,
      frame,
      originX: 0,
      originY: 0,
      setOrigin: vi.fn().mockImplementation(function (
        this: any,
        x: number,
        y: number,
      ) {
        this.originX = x;
        this.originY = y;
        return this;
      }),
      setInteractive: vi.fn().mockImplementation(function (this: any) {
        this.input = { cursor: "pointer" };
        return this;
      }),
      on: vi.fn().mockImplementation((event: string, cb: Function) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(cb);
        return sprite;
      }),
      emit: (event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach((cb) => cb(...args));
        }
      },
      setFrame: vi.fn().mockImplementation(function (this: any, frame: string) {
        this.frame = frame;
        return this;
      }),
      setPosition: vi.fn().mockImplementation(function (
        this: any,
        x: number,
        y: number,
      ) {
        this.x = x;
        this.y = y;
        return this;
      }),
      setScale: vi.fn().mockImplementation(function (this: any, scale: number) {
        this.scale = scale;
        return this;
      }),
      setDepth: vi.fn().mockImplementation(function (this: any, depth: number) {
        this.depth = depth;
        return this;
      }),
      setAlpha: vi.fn().mockImplementation(function (this: any, alpha: number) {
        this.alpha = alpha;
        return this;
      }),
      setData: vi.fn().mockImplementation((key: string, val: any) => {
        dataMap.set(key, val);
        return sprite;
      }),
      getData: vi.fn().mockImplementation((key: string) => {
        return dataMap.get(key);
      }),
      displayWidth: 220,
      displayHeight: 307,
      input: undefined,
      active: true,
      enableFilters: vi.fn().mockReturnThis(),
      filters: {
        external: {
          addShadow: vi.fn().mockImplementation(() => ({
            x: 2,
            y: 3,
            decay: 0.2,
            intensity: 0.4,
            setPaddingOverride: vi.fn(),
          })),
        },
      },
    };
    return sprite;
  };

  return {
    Scene: class MockScene {
      add = {
        graphics: vi.fn(() => ({
          clear: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
        })),
        sprite: vi.fn((x, y, texture, frame) =>
          createMockSprite(x, y, texture, frame),
        ),
      };
      scale = {
        on: vi.fn(),
      };
      input: any;
      constructor() {
        const listeners: { [event: string]: { cb: Function; context?: any } } =
          {};
        this.input = {
          on: vi
            .fn()
            .mockImplementation(
              (event: string, cb: Function, context?: any) => {
                listeners[event] = { cb, context };
                return this.input;
              },
            ),
          setDraggable: vi.fn(),
          _trigger: (event: string, ...args: any[]) => {
            const listener = listeners[event];
            if (listener) {
              listener.cb.apply(listener.context, args);
            }
          },
        };
      }
    },
    Geom: {
      Rectangle: Object.assign(
        class MockRectangle {
          constructor(
            public x = 0,
            public y = 0,
            public width = 0,
            public height = 0,
          ) {}
        },
        {
          Intersection: (rect1: any, rect2: any, out: any) => {
            const x5 = Math.max(rect1.x, rect2.x);
            const y5 = Math.max(rect1.y, rect2.y);
            const x6 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
            const y6 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

            if (x5 >= x6 || y5 >= y6) {
              out.x = 0;
              out.y = 0;
              out.width = 0;
              out.height = 0;
            } else {
              out.x = x5;
              out.y = y5;
              out.width = x6 - x5;
              out.height = y6 - y5;
            }
            return out;
          },
        },
      ),
    },
  };
});

describe("BoardScene", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    boardScene = new BoardScene();
    boardScene.create();
  });

  it("assigns background placeholder sprite to stock pile", () => {
    expect(boardScene.stockPile.sprite).toBeDefined();
    expect(boardScene.stockPile.sprite).not.toBeNull();
    expect(boardScene.stockPile.sprite.frame).toBe(
      "card-placeholder-full-border-reset",
    );
    expect(boardScene.stockPile.sprite.alpha).toBe(
      BoardScene.PILE_BACKGROUND_ALPHA,
    );
  });

  it("assigns background placeholder sprites to tableau piles", () => {
    for (const tableauPile of boardScene.tableauPiles) {
      expect(tableauPile.sprite).toBeDefined();
      expect(tableauPile.sprite).not.toBeNull();
      expect(tableauPile.sprite.frame).toBe("card-placeholder");
      expect(tableauPile.sprite.alpha).toBe(BoardScene.PILE_BACKGROUND_ALPHA);
    }
  });

  it("assigns background placeholder sprites to foundation piles", () => {
    for (const foundationPile of boardScene.foundationPiles) {
      expect(foundationPile.sprite).toBeDefined();
      expect(foundationPile.sprite).not.toBeNull();
      expect(foundationPile.sprite.frame).toBe(
        "card-placeholder-full-border-circle",
      );
      expect(foundationPile.sprite.alpha).toBe(
        BoardScene.PILE_BACKGROUND_ALPHA,
      );
    }
  });

  it("updates hand cursor for cards based on interactability", () => {
    const tableau1 = boardScene.tableauPiles[1];
    const cardVisualBottom = tableau1.playingCardVisuals[0];
    const cardVisualTop = tableau1.playingCardVisuals[1];

    expect(cardVisualBottom.sprite.input.cursor).toBe("default");
    expect(cardVisualTop.sprite.input.cursor).toBe("pointer");
  });

  it("sets hand cursor to default after flipping top card face down", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const cardVisual0 = tableau0.playingCardVisuals[0];
    const card0 = cardVisual0.playingCard;
    card0.faceUp = false;

    boardScene.gameModel.emit("card-flipped", {
      cardId: card0.id,
      faceUp: false,
    });

    expect(cardVisual0.sprite.input.cursor).toBe("default");
  });

  it("sets draggability based on whether the card is draggable, not just interactable", () => {
    vi.mocked(boardScene.input.setDraggable).mockClear();

    boardScene.gameModel.emit("card-flipped", {
      cardId: "card-clubs-ace",
      faceUp: true,
    });

    const stockPile = boardScene.stockPile;
    const topStockCardVisual =
      stockPile.playingCardVisuals[stockPile.playingCardVisuals.length - 1];
    const tableau0 = boardScene.tableauPiles[0];
    const tableauCardVisual =
      tableau0.playingCardVisuals[tableau0.playingCardVisuals.length - 1];

    expect(boardScene.input.setDraggable).toHaveBeenCalledWith(
      topStockCardVisual.sprite,
      false,
    );
    expect(boardScene.input.setDraggable).toHaveBeenCalledWith(
      tableauCardVisual.sprite,
      true,
    );
  });

  it("getPileVisualById returns the pile or null if not found", () => {
    expect(boardScene.getPileVisualById("stock")).toBe(boardScene.stockPile);
    expect(boardScene.getPileVisualById("non-existent-pile")).toBeNull();
  });

  it("triggers layout updates when the scale resize event fires", () => {
    boardScene.scale.width = 903.5;
    boardScene.scale.height = 475;
    const scaleOnCalls = vi.mocked(boardScene.scale.on).mock.calls;
    const resizeCall = scaleOnCalls.find(
      (call: unknown[]) => call[0] === "resize",
    );
    expect(resizeCall).toBeDefined();

    const resizeCallback = resizeCall[1];
    resizeCallback();

    expect(boardScene.stockPile.position).toEqual({ x: 20, y: 20 });
  });

  it("initially populates stock pile visuals with playing cards", () => {
    expect(boardScene.stockPile.playingCardVisuals.length).toBeGreaterThan(0);
  });

  it("syncs visual piles on card-moved event", () => {
    const game = boardScene.gameModel;
    game.stock.clear();

    game.emit("card-moved");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
  });

  it("syncs visual piles on stock-recycled event", () => {
    const game = boardScene.gameModel;
    game.stock.clear();

    game.emit("stock-recycled");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
  });

  it("logs a message on game-won event", () => {
    const game = boardScene.gameModel;
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    game.emit("game-won");

    expect(consoleLogSpy).toHaveBeenCalledWith("Congratulations! You won!");
    consoleLogSpy.mockRestore();
  });

  it("updates card sprite frame to card ID on card-flipped event (faceUp true)", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];

    game.emit("card-flipped", { cardId: visual0.playingCard.id, faceUp: true });

    expect(visual0.sprite.frame).toBe(visual0.playingCard.id);
  });

  it("updates card sprite frame to card-back-blue on card-flipped event (faceUp false)", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];

    game.emit("card-flipped", {
      cardId: visual0.playingCard.id,
      faceUp: false,
    });

    expect(visual0.sprite.frame).toBe("card-back-blue");
  });

  it("does not crash on card-flipped event if card visual lacks a sprite", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const oldSprite = visual0.sprite;
    visual0.sprite = null as unknown as Phaser.GameObjects.Sprite;

    expect(() => {
      game.emit("card-flipped", {
        cardId: visual0.playingCard.id,
        faceUp: true,
      });
    }).not.toThrow();
    visual0.sprite = oldSprite;
  });

  it("throws error in createCardVisuals if a card model is not found", () => {
    const customBoardScene = new BoardScene();
    const getCardSpy = vi
      .spyOn(SolitaireGame.prototype, "getCardById")
      .mockReturnValue(undefined);

    expect(() => customBoardScene.create()).toThrow(
      "Card model not found for: ",
    );
    getCardSpy.mockRestore();
  });

  it("syncVisualPilesWithModel syncs foundation cards correctly", () => {
    const card = boardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
    const sourcePile = boardScene.gameModel.getPileContainingCard(card.id);
    sourcePile?.removeCard(card);
    boardScene.gameModel.foundations[0].addCard(card);

    boardScene.gameModel.emit("card-moved");

    expect(boardScene.foundationPiles[0].playingCardVisuals.length).toBe(1);
    expect(
      boardScene.foundationPiles[0].playingCardVisuals[0].playingCard,
    ).toBe(card);
  });

  it("syncVisualPilesWithModel ignores cards not in cardVisualsMap", () => {
    const customBoardScene = new BoardScene();
    customBoardScene.create();

    const stockCard = customBoardScene.gameModel.stock.getCards()[0];
    customBoardScene.cardVisualsMap.delete(stockCard.id);

    const wasteCard = customBoardScene.gameModel.stock.getCards()[1];
    customBoardScene.gameModel.stock.removeCard(wasteCard);
    customBoardScene.gameModel.waste.addCard(wasteCard);
    customBoardScene.cardVisualsMap.delete(wasteCard.id);

    const fCard = customBoardScene.gameModel.stock.getCards()[2];
    customBoardScene.gameModel.stock.removeCard(fCard);
    customBoardScene.gameModel.foundations[0].addCard(fCard);
    customBoardScene.cardVisualsMap.delete(fCard.id);

    const tCard =
      customBoardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
    customBoardScene.cardVisualsMap.delete(tCard.id);

    expect(() => {
      customBoardScene.gameModel.emit("card-moved");
    }).not.toThrow();
  });

  it("updateCardCursors handles stockPile.sprite or its input being null", () => {
    const originalSprite = boardScene.stockPile.sprite;
    boardScene.stockPile.sprite = null as unknown as Phaser.GameObjects.Sprite;

    expect(() => {
      boardScene.gameModel.emit("card-flipped", {
        cardId: "card-clubs-ace",
        faceUp: true,
      });
    }).not.toThrow();

    boardScene.stockPile.sprite = {
      input: null,
    } as unknown as Phaser.GameObjects.Sprite;
    expect(() => {
      boardScene.gameModel.emit("card-flipped", {
        cardId: "card-clubs-ace",
        faceUp: true,
      });
    }).not.toThrow();

    boardScene.stockPile.sprite = originalSprite;
  });

  it("throws error during creation if a card has an invalid suit", () => {
    const invalidCard = { suit: 999 as unknown as Suit, type: Type.ACE };
    ALL_PLAYING_CARD_IDS.push(invalidCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Suit: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });

  it("throws error during creation if a card has an invalid type", () => {
    const invalidTypeCard = { suit: Suit.SPADE, type: 999 as unknown as Type };
    ALL_PLAYING_CARD_IDS.push(invalidTypeCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Type: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });

  it("provides backward compatibility getter and setter for hoveredCardVisual", () => {
    const originalHovered = boardScene.hoveredCardVisual;
    boardScene.hoveredCardVisual = originalHovered;
    expect(boardScene.hoveredCardVisual).toBe(originalHovered);
  });

  it("provides backward compatibility getter and setter for isStockBackgroundHovered", () => {
    const originalStockHovered = boardScene.isStockBackgroundHovered;
    boardScene.isStockBackgroundHovered = originalStockHovered;
    expect(boardScene.isStockBackgroundHovered).toBe(originalStockHovered);
  });

  it("provides backward compatibility getter and setter for draggedStack", () => {
    const originalDragged = boardScene.draggedStack;
    boardScene.draggedStack = originalDragged;
    expect(boardScene.draggedStack).toBe(originalDragged);
  });

  it("provides backward compatibility getter and setter for draggedStackOffsets", () => {
    const originalOffsets = boardScene.draggedStackOffsets;
    boardScene.draggedStackOffsets = originalOffsets;
    expect(boardScene.draggedStackOffsets).toBe(originalOffsets);
  });

  it("provides backward compatibility getter and setter for highlightGraphics", () => {
    const originalGraphics = boardScene.highlightGraphics;
    boardScene.highlightGraphics = originalGraphics;
    expect(boardScene.highlightGraphics).toBe(originalGraphics);
  });

  it("provides getLayoutManager returning layout manager instance", () => {
    expect(boardScene.getLayoutManager()).toBeDefined();
  });

  it("syncVisualPilesWithModel syncs waste cards correctly", () => {
    const card = boardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
    const sourcePile = boardScene.gameModel.getPileContainingCard(card.id);
    sourcePile?.removeCard(card);
    boardScene.gameModel.waste.addCard(card);

    boardScene.gameModel.emit("card-moved");

    expect(boardScene.wastePile.playingCardVisuals.length).toBe(1);
    expect(boardScene.wastePile.playingCardVisuals[0].playingCard).toBe(card);
  });
});
