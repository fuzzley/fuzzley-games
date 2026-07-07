import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PileType } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { Point } from "@/game/common/point";
import {
  BoardInteractionState,
  BoardViewState,
  CardView,
  PileBackgroundView,
  HighlightView,
  Viewport,
} from "./board_view_state";
import {
  computeScale,
  computePileOrigins,
  offsetsForPile,
  TABLEAU_FACE_UP_OFFSET,
} from "./board_geometry";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
} from "../layout/board_layout_constants";

/**
 * Transient builder class that constructs the visual representation of the Solitaire board
 * for a single frame. It encapsulates shared layout metrics and calculations.
 */
class BoardViewStateBuilder {
  private readonly scale: number;
  private readonly origins: Map<string, Point>;
  private readonly cardWidth: number;
  private readonly cardHeight: number;

  constructor(
    private readonly game: SolitaireGame,
    private readonly interaction: BoardInteractionState,
    viewport: Viewport,
  ) {
    this.scale = computeScale(viewport);
    this.origins = computePileOrigins(viewport, this.scale);
    this.cardWidth = CARD_WIDTH_PX * this.scale;
    this.cardHeight = CARD_HEIGHT_PX * this.scale;
  }

  /**
   * Orchestrates the construction of all view state elements.
   */
  public build(): BoardViewState {
    const backgrounds = this.buildBackgrounds();
    const cards = this.buildCards();
    const highlight = this.buildHighlight(cards);

    return {
      backgrounds,
      cards,
      highlight,
    };
  }

  /**
   * Computes the background representations for each pile.
   */
  private buildBackgrounds(): PileBackgroundView[] {
    const backgrounds: PileBackgroundView[] = [];
    const stockEmpty = this.game.stock.getCards().length === 0;
    const stockOrigin = this.origins.get("stock");

    if (stockOrigin) {
      backgrounds.push({
        pileId: "stock",
        pileType: PileType.STOCK,
        x: stockOrigin.x,
        y: stockOrigin.y,
        scale: this.scale,
        depth: 0,
        cursor: stockEmpty ? "pointer" : "default",
      });
    }

    for (let foundationIndex = 0; foundationIndex < 4; foundationIndex++) {
      const origin = this.origins.get(`foundation-${foundationIndex}`);
      if (origin) {
        backgrounds.push({
          pileId: `foundation-${foundationIndex}`,
          pileType: PileType.FOUNDATION,
          pileIndex: foundationIndex,
          x: origin.x,
          y: origin.y,
          scale: this.scale,
          depth: 0,
        });
      }
    }

    for (let tableauIndex = 0; tableauIndex < 7; tableauIndex++) {
      const origin = this.origins.get(`tableau-${tableauIndex}`);
      if (origin) {
        backgrounds.push({
          pileId: `tableau-${tableauIndex}`,
          pileType: PileType.TABLEAU,
          pileIndex: tableauIndex,
          x: origin.x,
          y: origin.y,
          scale: this.scale,
          depth: 0,
        });
      }
    }

    return backgrounds;
  }

  /**
   * Computes the visual positions and states of all cards currently in play.
   */
  private buildCards(): CardView[] {
    const cards: CardView[] = [];
    const draggedIds = this.interaction.drag?.cardIds ?? [];
    const dragSet = new Set(draggedIds);
    const dragPrimary = this.interaction.drag?.primary ?? null;

    const dragSourcePile = draggedIds.length > 0
      ? this.game.getPileContainingCard(draggedIds[0])
      : null;
    const isTableauDrag = dragSourcePile?.type === PileType.TABLEAU;

    const allPiles = [
      this.game.stock,
      this.game.waste,
      ...this.game.foundations,
      ...this.game.tableaus,
    ];

    for (const pile of allPiles) {
      const origin = this.origins.get(pile.id);
      if (!origin) continue;

      const pileCards = pile.getCards();
      const isWaste = pile.type === PileType.WASTE;

      const hasHoveredCardInPile = this.interaction.hoveredCardId &&
        pileCards.some((card) => card.id === this.interaction.hoveredCardId);
      const expansionCardId =
        hasHoveredCardInPile && !this.interaction.drag ? this.interaction.hoveredCardId : null;

      const offsets = offsetsForPile(
        pile,
        pileCards,
        this.game.settings.drawCount,
        expansionCardId,
      );

      for (let cardIndex = 0; cardIndex < pileCards.length; cardIndex++) {
        const card = pileCards[cardIndex];
        const isDragged = dragSet.has(card.id);

        let x = 0;
        let y = 0;
        let depth = isWaste ? cardIndex : cardIndex + 1;
        let snap = this.interaction.snapAll;

        if (isDragged && dragPrimary) {
          const dragIndex = draggedIds.indexOf(card.id);
          x = dragPrimary.x;
          y = dragPrimary.y + (isTableauDrag ? dragIndex * TABLEAU_FACE_UP_OFFSET * this.scale : 0);
          depth = 1000 + dragIndex;
          snap = true;
        } else {
          x = origin.x + offsets[cardIndex].x * this.scale;
          y = origin.y + offsets[cardIndex].y * this.scale;
        }

        cards.push({
          cardId: card.id,
          x,
          y,
          scale: this.scale,
          depth,
          frame: this.getCardFrame(card, pile.type, this.game.settings.cardBackStyle),
          cursor: this.game.isCardInteractable(card) ? "pointer" : "default",
          draggable: this.game.isCardDraggable(card),
          snap,
        });
      }
    }

    return cards;
  }

  /**
   * Computes the highlight view geometry, indicating hovered cards or empty piles.
   */
  private buildHighlight(cards: CardView[]): HighlightView | null {
    const draggedIds = this.interaction.drag?.cardIds ?? [];
    const isDragging = draggedIds.length > 0;
    if (isDragging) {
      return null;
    }

    const stockEmpty = this.game.stock.getCards().length === 0;
    const stockOrigin = this.origins.get("stock");

    if (this.interaction.isStockBackgroundHovered && stockEmpty && stockOrigin) {
      return {
        x: stockOrigin.x,
        y: stockOrigin.y,
        width: this.cardWidth,
        height: this.cardHeight,
        scale: this.scale,
        openBottom: false,
      };
    }

    if (this.interaction.hoveredCardId) {
      const hoveredCard = this.game.getCardById(this.interaction.hoveredCardId);
      if (hoveredCard && this.game.isCardInteractable(hoveredCard)) {
        const cardView = cards.find((cv) => cv.cardId === this.interaction.hoveredCardId);
        if (cardView) {
          const hoveredPile = this.game.getPileContainingCard(this.interaction.hoveredCardId);
          let openBottom = false;
          if (hoveredPile) {
            const pileCards = hoveredPile.getCards();
            const cardIndex = pileCards.findIndex((card) => card.id === this.interaction.hoveredCardId);
            if (cardIndex !== -1 && cardIndex < pileCards.length - 1) {
              openBottom = true;
            }
          }

          return {
            x: cardView.x,
            y: cardView.y,
            width: this.cardWidth,
            height: this.cardHeight,
            scale: this.scale,
            openBottom,
          };
        }
      }
    }

    return null;
  }

  /**
   * Determines the frame or sprite key to use for rendering a playing card.
   */
  private getCardFrame(
    card: PlayingCard,
    pileType: PileType,
    cardBack: string,
  ): string {
    if (pileType === PileType.STOCK) {
      return cardBack;
    }
    if (pileType === PileType.TABLEAU) {
      return card.faceUp ? card.id : cardBack;
    }
    return card.id; // waste, foundation
  }
}

/**
 * Builds the complete desired visual representation of the Solitaire board for one frame,
 * based on the logical game model, pointer-driven interaction state, and viewport size.
 *
 * @param game The logical game rules and state.
 * @param interaction The current mouse pointer and drag state.
 * @param viewport The available screen space.
 * @returns The pure view state describing positions, depths, scale, frames, and highlight.
 */
export function buildBoardViewState(
  game: SolitaireGame,
  interaction: BoardInteractionState,
  viewport: Viewport,
): BoardViewState {
  return new BoardViewStateBuilder(game, interaction, viewport).build();
}
