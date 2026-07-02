import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "../../../src/render/scene/board_scene";
import { PlayingCard, Suit, Type } from "../../../src/model/card/playing_card";

// Mock phaser entirely
vi.mock("phaser", () => {
  const createMockSprite = () => ({
    setOrigin: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    setFrame: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
  });

  return {
    Scene: class MockScene {
      add = {
        graphics: vi.fn(() => ({
          clear: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
        })),
        sprite: vi.fn(() => createMockSprite()),
      };
      scale = {
        on: vi.fn(),
      };
    },
  };
});

describe("BoardScene - isCardInteractable", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    boardScene = new BoardScene();
    boardScene.create();
  });

  it("handles tableau piles correctly: face-up is interactable, face-down is not", () => {
    // Grab the first tableau pile visual cards
    // The game deals 1 card to tableau-0 (face up)
    const tableau0 = boardScene.tableauPiles[0];
    expect(tableau0.playingCardVisuals.length).toBe(1);
    
    const card = tableau0.playingCardVisuals[0].playingCard;
    expect(card.faceUp).toBe(true);
    expect(boardScene.isCardInteractable(card)).toBe(true);

    // Turn face-down
    card.faceUp = false;
    expect(boardScene.isCardInteractable(card)).toBe(false);

    // Tableau 1 gets 2 cards (first face-down, second face-up)
    const tableau1 = boardScene.tableauPiles[1];
    expect(tableau1.playingCardVisuals.length).toBe(2);

    const cardBottom = tableau1.playingCardVisuals[0].playingCard;
    const cardTop = tableau1.playingCardVisuals[1].playingCard;

    expect(cardBottom.faceUp).toBe(false);
    expect(cardTop.faceUp).toBe(true);

    expect(boardScene.isCardInteractable(cardBottom)).toBe(false);
    expect(boardScene.isCardInteractable(cardTop)).toBe(true);
  });

  it("handles waste pile correctly: only top card is interactable", () => {
    // Waste is initially empty
    expect(boardScene.wastePile.playingCardVisuals.length).toBe(0);

    const card1 = new PlayingCard();
    card1.id = "card-spades-2";
    card1.faceUp = true;
    const card2 = new PlayingCard();
    card2.id = "card-hearts-king";
    card2.faceUp = true;

    // Manually add to waste model and sync
    const game = (boardScene as any).gameModel;
    game.waste.addCard(card1);
    game.waste.addCard(card2);
    
    // Registers cards in gameModel map so getPileContainingCard works
    game.allCardsMap.set(card1.id, card1);
    game.allCardsMap.set(card2.id, card2);

    (boardScene as any).syncVisualPilesWithModel();

    // Verify waste counts
    expect(boardScene.wastePile.playingCardVisuals.length).toBe(2);

    // Top card (card2) should be interactable
    expect(boardScene.isCardInteractable(card2)).toBe(true);
    // Non-top card (card1) should NOT be interactable
    expect(boardScene.isCardInteractable(card1)).toBe(false);
  });

  it("handles foundation piles correctly: only top card is interactable", () => {
    // Foundation 0 is initially empty
    const foundation0 = boardScene.foundationPiles[0];
    expect(foundation0.playingCardVisuals.length).toBe(0);

    const card1 = new PlayingCard();
    card1.id = "card-diamonds-ace";
    card1.faceUp = true;
    const card2 = new PlayingCard();
    card2.id = "card-diamonds-2";
    card2.faceUp = true;

    const game = (boardScene as any).gameModel;
    game.foundations[0].addCard(card1);
    game.foundations[0].addCard(card2);

    game.allCardsMap.set(card1.id, card1);
    game.allCardsMap.set(card2.id, card2);

    (boardScene as any).syncVisualPilesWithModel();

    expect(foundation0.playingCardVisuals.length).toBe(2);

    // Top card should be interactable
    expect(boardScene.isCardInteractable(card2)).toBe(true);
    // Non-top card should NOT be interactable
    expect(boardScene.isCardInteractable(card1)).toBe(false);
  });

  it("handles stock pile correctly: cards are never interactable", () => {
    // Stock has 24 cards
    expect(boardScene.stockPile.playingCardVisuals.length).toBe(24);

    const card = boardScene.stockPile.playingCardVisuals[0].playingCard;
    // Even if face-up (for some reason), stock cards should not be interactable
    card.faceUp = true;
    expect(boardScene.isCardInteractable(card)).toBe(false);

    card.faceUp = false;
    expect(boardScene.isCardInteractable(card)).toBe(false);
  });
});
