import { describe, it, expect, beforeEach } from "vitest";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { buildBoardViewState } from "@/game/render/scene/board/view/board_view_state_builder";
import {
  BoardInteractionState,
  Viewport,
} from "@/game/render/scene/board/view/board_view_state";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("board_view_state_builder", () => {
  let game: SolitaireGame;
  const viewport: Viewport = { width: 1920, height: 1080 };
  let interaction: BoardInteractionState;

  beforeEach(() => {
    game = new SolitaireGame();
    game.startNewGame();
    interaction = {
      hoveredCardId: null,
      isStockBackgroundHovered: false,
      drag: null,
      snapAll: false,
    };
  });

  it("computes positions, scales, and depths for all piles and card views", () => {
    emptyBoard(game);
    // Relocate one card to tableau-0
    const card = relocate(game, "card-hearts-ace", game.tableaus[0], true);

    const viewState = buildBoardViewState(game, interaction, viewport);

    expect(viewState.backgrounds.length).toBe(12); // stock, 4 foundations, 7 tableaus
    expect(viewState.cards.length).toBe(1);

    const cardView = viewState.cards[0];
    expect(cardView.cardId).toBe(card.id);
    expect(cardView.scale).toBe(1.0); // full design viewport size allows scale 1.0
    expect(cardView.depth).toBe(1); // first card in tableau gets depth 1
    expect(cardView.frame).toBe(card.id); // face-up card uses its id
    expect(cardView.cursor).toBe("pointer");
    expect(cardView.draggable).toBe(true);
    expect(cardView.snap).toBe(false);
  });

  it("handles snapAll flag correctly", () => {
    interaction.snapAll = true;
    const viewState = buildBoardViewState(game, interaction, viewport);
    expect(viewState.cards.every((cardView) => cardView.snap)).toBe(true);
  });

  it("hides highlights and overrides position/depth/snap for dragged cards", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    interaction.drag = {
      cardIds: [card1.id, card2.id],
      primary: { x: 500, y: 600 },
    };
    interaction.hoveredCardId = card1.id;

    const viewState = buildBoardViewState(game, interaction, viewport);

    expect(viewState.highlight).toBeNull(); // highlight hidden during drag

    const cardView1 = viewState.cards.find((card) => card.cardId === card1.id)!;
    const cardView2 = viewState.cards.find((card) => card.cardId === card2.id)!;

    expect(cardView1.x).toBe(500);
    expect(cardView1.y).toBe(600);
    expect(cardView1.depth).toBe(1000);
    expect(cardView1.snap).toBe(true);

    expect(cardView2.x).toBe(500);
    expect(cardView2.y).toBe(600 + 45); // offset for tableau drag
    expect(cardView2.depth).toBe(1001);
    expect(cardView2.snap).toBe(true);
  });

  it("draws highlight over empty stock if hovered", () => {
    emptyBoard(game); // stock is empty
    interaction.isStockBackgroundHovered = true;

    const viewState = buildBoardViewState(game, interaction, viewport);

    expect(viewState.highlight).not.toBeNull();
    expect(viewState.highlight?.openBottom).toBe(false);
    expect(viewState.highlight?.x).toBe(
      viewState.backgrounds.find(
        (backgroundView) => backgroundView.pileId === "stock",
      )!.x,
    );
  });

  it("draws openBottom highlight for covered cards in a tableau", () => {
    emptyBoard(game);
    const card1 = relocate(game, "card-hearts-ace", game.tableaus[0], true);
    const card2 = relocate(game, "card-hearts-2", game.tableaus[0], true);

    // Hover the bottom card (card1) which is covered by card2
    interaction.hoveredCardId = card1.id;

    const viewState = buildBoardViewState(game, interaction, viewport);

    expect(viewState.highlight).not.toBeNull();
    expect(viewState.highlight?.openBottom).toBe(true);
    expect(viewState.highlight?.x).toBe(
      viewState.cards.find((card) => card.cardId === card1.id)!.x,
    );
    expect(viewState.highlight?.y).toBe(
      viewState.cards.find((card) => card.cardId === card1.id)!.y,
    );

    // Hover the top card (card2) which is NOT covered
    interaction.hoveredCardId = card2.id;
    const viewState2 = buildBoardViewState(game, interaction, viewport);
    expect(viewState2.highlight?.openBottom).toBe(false);
  });
});
