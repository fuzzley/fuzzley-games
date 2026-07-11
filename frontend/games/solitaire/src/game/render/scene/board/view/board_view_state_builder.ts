import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { CardPile, PileType } from "@/game/model/card/card_pile";
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
  DRAG_BASE_DEPTH,
} from "./board_geometry";
import {
  CARD_TEXTURE_WIDTH_PX,
  CARD_TEXTURE_HEIGHT_PX,
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
    // Size the highlight from the real texture frame so its border hugs the
    // rendered card exactly, rather than the slightly larger layout grid cell.
    this.cardWidth = CARD_TEXTURE_WIDTH_PX * this.scale;
    this.cardHeight = CARD_TEXTURE_HEIGHT_PX * this.scale;
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

    const stockOrigin = this.origins.get(this.game.stock.id);
    if (stockOrigin) {
      const stockEmpty = this.game.stock.getCards().length === 0;
      backgrounds.push({
        pileId: this.game.stock.id,
        pileType: PileType.STOCK,
        x: stockOrigin.x,
        y: stockOrigin.y,
        scale: this.scale,
        depth: 0,
        cursor: stockEmpty ? "pointer" : "default",
      });
    }

    const pushPileBackground = (
      pile: CardPile<PlayingCard>,
      index: number,
    ): void => {
      const origin = this.origins.get(pile.id);
      if (!origin) return;
      backgrounds.push({
        pileId: pile.id,
        pileType: pile.type,
        pileIndex: index,
        x: origin.x,
        y: origin.y,
        scale: this.scale,
        depth: 0,
      });
    };

    this.game.foundations.forEach(pushPileBackground);
    this.game.tableaus.forEach(pushPileBackground);

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

    const dragSourcePile =
      draggedIds.length > 0
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

      const hoveredCardInPile = this.interaction.hoveredCardId
        ? pileCards.find((card) => card.id === this.interaction.hoveredCardId)
        : undefined;
      // Only interactable cards expand on hover; a face-down tableau card, for
      // example, cannot be picked up, so it should not open a gap beneath it.
      const expansionCardId =
        hoveredCardInPile &&
        !this.interaction.drag &&
        this.game.isCardInteractableInPile(hoveredCardInPile, pile)
          ? hoveredCardInPile.id
          : null;

      const offsets = offsetsForPile(
        pile,
        pileCards,
        this.game.settings.drawCount,
        expansionCardId,
      );

      for (let cardIndex = 0; cardIndex < pileCards.length; cardIndex++) {
        const card = pileCards[cardIndex];
        const isDragged = dragSet.has(card.id);

        let x: number;
        let y: number;
        let depth = cardIndex + 1; // card depths sit above the pile background at depth 0
        let snap = this.interaction.snapAll;

        if (isDragged && dragPrimary) {
          const dragIndex = draggedIds.indexOf(card.id);
          x = dragPrimary.x;
          y =
            dragPrimary.y +
            (isTableauDrag
              ? dragIndex * TABLEAU_FACE_UP_OFFSET * this.scale
              : 0);
          depth = DRAG_BASE_DEPTH + dragIndex;
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
          frame: this.getCardFrame(
            card,
            pile.type,
            this.game.settings.cardBackStyle,
          ),
          cursor: this.game.isCardInteractableInPile(card, pile)
            ? "pointer"
            : "default",
          draggable: this.game.isCardDraggableInPile(card, pile),
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
    const stockOrigin = this.origins.get(this.game.stock.id);

    if (
      this.interaction.isStockBackgroundHovered &&
      stockEmpty &&
      stockOrigin
    ) {
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
      const hoveredPile = hoveredCard
        ? this.game.getPileContainingCard(hoveredCard.id)
        : undefined;
      if (
        hoveredCard &&
        hoveredPile &&
        this.game.isCardInteractableInPile(hoveredCard, hoveredPile)
      ) {
        const cardView = cards.find((cv) => cv.cardId === hoveredCard.id);
        if (cardView) {
          const pileCards = hoveredPile.getCards();
          const cardIndex = pileCards.indexOf(hoveredCard);
          // Leave the bottom edge open when another card is stacked on top, so
          // the border never draws a line across the covering card.
          const openBottom =
            cardIndex !== -1 && cardIndex < pileCards.length - 1;

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
