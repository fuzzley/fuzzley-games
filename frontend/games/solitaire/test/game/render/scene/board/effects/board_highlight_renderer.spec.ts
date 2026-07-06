import { describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardHighlightRenderer } from "@/game/render/scene/board/effects/board_highlight_renderer";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { PlayingCard } from "@/game/model/card/playing_card";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import type { PileVisual } from "@/game/render/scene/board/board_scene";
import {
  asSprite,
  createMockGraphics,
  createMockSprite,
  MockGraphics,
  MockSprite,
} from "@test/support/phaser_mocks";

const SCALE_FACTOR = 1.5;

describe("BoardHighlightRenderer", () => {
  let graphics: MockGraphics;
  let gameModel: SolitaireGame;
  let stockSprite: MockSprite;
  let renderer: BoardHighlightRenderer;
  let pileVisualsById: Map<string, PileVisual>;

  beforeEach(() => {
    graphics = createMockGraphics();
    gameModel = new SolitaireGame();
    gameModel.startNewGame();
    stockSprite = createMockSprite({
      x: 20,
      y: 20,
      displayWidth: 100,
      displayHeight: 150,
    });
    pileVisualsById = new Map<string, PileVisual>();

    const boardScene = {
      add: { graphics: () => graphics },
      gameModel,
      stockPile: { sprite: asSprite(stockSprite) },
      getLayoutManager: () => ({ getScaleFactor: () => SCALE_FACTOR }),
      getPileVisualById: (id: string) => pileVisualsById.get(id) ?? null,
    } as unknown as BoardScene;

    renderer = new BoardHighlightRenderer(boardScene);
  });

  /** Builds a card visual backed by a mock sprite at the given position. */
  function hoveredVisual(card: PlayingCard): PlayingCardVisual {
    const visual = new PlayingCardVisual(card);
    visual.sprite = asSprite(
      createMockSprite({ x: 50, y: 50, displayWidth: 100, displayHeight: 150 }),
    );
    return visual;
  }

  it("does not throw when the graphics object is missing", () => {
    renderer.graphics = null as unknown as Phaser.GameObjects.Graphics;

    expect(() => renderer.update(null, false, false)).not.toThrow();
  });

  it("clears the highlight and draws nothing while dragging", () => {
    renderer.update(null, false, true);

    expect(graphics.clear).toHaveBeenCalled();
    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("highlights the stock background when the empty stock is hovered", () => {
    gameModel.stock.clear();

    renderer.update(null, true, false);

    expect(graphics.lineStyle).toHaveBeenCalledWith(
      9 * SCALE_FACTOR,
      0xebef9b,
      0.9,
    );
    expect(graphics.strokeRoundedRect).toHaveBeenCalledWith(
      20,
      20,
      100,
      150,
      12 * SCALE_FACTOR,
    );
  });

  it("does not highlight the stock background when the stock is not empty", () => {
    renderer.update(null, true, false);

    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not highlight the empty stock background when its sprite is inactive", () => {
    gameModel.stock.clear();
    stockSprite.active = false;

    renderer.update(null, true, false);

    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("draws nothing when no card is hovered", () => {
    renderer.update(null, false, false);

    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not highlight a hovered card that is not interactable", () => {
    const faceDownCard = gameModel.tableaus[1].getCards()[0];

    renderer.update(hoveredVisual(faceDownCard), false, false);

    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not highlight a hovered card whose sprite is inactive", () => {
    const interactableCard = gameModel.tableaus[0].getCards()[0];
    const visual = new PlayingCardVisual(interactableCard);
    visual.sprite = asSprite(
      createMockSprite({
        x: 50,
        y: 50,
        active: false,
        displayWidth: 100,
        displayHeight: 150,
      }),
    );

    renderer.update(visual, false, false);

    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("draws a highlight border around an interactable, active hovered card", () => {
    const interactableCard = gameModel.tableaus[0].getCards()[0];

    renderer.update(hoveredVisual(interactableCard), false, false);

    expect(graphics.lineStyle).toHaveBeenCalledWith(
      9 * SCALE_FACTOR,
      0xebef9b,
      0.9,
    );
    expect(graphics.strokeRoundedRect).toHaveBeenCalledWith(
      50,
      50,
      100,
      150,
      12 * SCALE_FACTOR,
    );
  });

  it("outlines the full card when it is the top of its pile", () => {
    const tableau = gameModel.tableaus[0];
    const topCard = tableau.getCards()[0];
    const pileId = gameModel.getPileContainingCard(topCard.id)!.id;
    const topVisual = hoveredVisual(topCard);
    pileVisualsById.set(pileId, new TableauPileVisual(tableau, [topVisual]));

    renderer.update(topVisual, false, false);

    expect(graphics.strokeRoundedRect).toHaveBeenCalledWith(
      50,
      50,
      100,
      150,
      12 * SCALE_FACTOR,
    );
    expect(graphics.strokePath).not.toHaveBeenCalled();
  });

  it("outlines a covered card with full-height sides and an open bottom", () => {
    const tableau = gameModel.tableaus[0];
    const coveredCard = tableau.getCards()[0];
    const pileId = gameModel.getPileContainingCard(coveredCard.id)!.id;
    const coveredVisual = hoveredVisual(coveredCard);
    const coveringVisual = new PlayingCardVisual(
      gameModel.tableaus[1].getCards()[0],
    );
    coveringVisual.sprite = asSprite(
      createMockSprite({ x: 50, y: 90, displayWidth: 100, displayHeight: 150 }),
    );
    pileVisualsById.set(
      pileId,
      new TableauPileVisual(tableau, [coveredVisual, coveringVisual]),
    );

    renderer.update(coveredVisual, false, false);

    // The sides run the full card height (bottom edge at y + height = 200) via an
    // open-bottomed path instead of a full rounded rect, so no line is drawn
    // across the covering card.
    expect(graphics.strokeRoundedRect).not.toHaveBeenCalled();
    expect(graphics.moveTo).toHaveBeenCalledWith(50, 200);
    expect(graphics.lineTo).toHaveBeenCalledWith(150, 200);
    expect(graphics.strokePath).toHaveBeenCalled();
  });
});
