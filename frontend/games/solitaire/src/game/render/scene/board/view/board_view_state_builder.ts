import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { CardPile, PileType } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { Point } from "@/game/common/point";
import {
  BoardInteractionState,
  BoardViewState,
  CardView,
  DragInteraction,
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
  DROP_TARGET_HIGHLIGHT_DEPTH,
  FLIGHT_BASE_DEPTH,
  HOVER_HIGHLIGHT_DEPTH,
} from "./board_geometry";
import { resolveDragTarget } from "../input/drop_target_resolver";
import {
  CARD_ART_SCALE,
  CARD_RENDER_WIDTH_PX,
  CARD_RENDER_HEIGHT_PX,
} from "../layout/board_layout_constants";

/**
 * Transient builder class that constructs the visual representation of the Solitaire board
 * for a single frame. It encapsulates shared layout metrics and calculations.
 */
class BoardViewStateBuilder {
  /** Layout scale: design units to device pixels. */
  private readonly scale: number;
  /** Sprite scale: atlas texels to device pixels. */
  private readonly spriteScale: number;
  private readonly origins: Map<string, Point>;
  private readonly cardWidth: number;
  private readonly cardHeight: number;

  constructor(
    private readonly game: SolitaireGame,
    private readonly interaction: BoardInteractionState,
    private readonly viewport: Viewport,
  ) {
    this.scale = computeScale(viewport);
    // The artwork is authored larger than a card is drawn, so a sprite is
    // scaled down from its texels while the layout keeps working in design
    // units.
    this.spriteScale = this.scale / CARD_ART_SCALE;
    this.origins = computePileOrigins(viewport, this.scale);
    // Size the highlight from the drawn card size so its border hugs the
    // rendered card exactly, rather than the slightly larger layout grid cell.
    this.cardWidth = CARD_RENDER_WIDTH_PX * this.scale;
    this.cardHeight = CARD_RENDER_HEIGHT_PX * this.scale;
  }

  /**
   * Orchestrates the construction of all view state elements.
   */
  public build(): BoardViewState {
    return {
      backgrounds: this.buildBackgrounds(),
      cards: this.buildCards(),
      highlights: this.buildHighlights(),
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
        scale: this.spriteScale,
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
        scale: this.spriteScale,
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

    // Position in the flying stack, so the cards keep their order in the air.
    const flightOrder = new Map(
      (this.interaction.flight?.cardIds ?? []).map((cardId, index) => [
        cardId,
        index,
      ]),
    );

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

          // A card in the air is lifted clear of the board, so it crosses over
          // the columns between it and its destination instead of sliding
          // under them on its way to a depth it has not arrived at yet.
          const flightIndex = flightOrder.get(card.id);
          if (flightIndex !== undefined) {
            depth = FLIGHT_BASE_DEPTH + flightIndex;
          }
        }

        cards.push({
          cardId: card.id,
          x,
          y,
          scale: this.spriteScale,
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
   * Computes the highlight borders to draw: the drag feedback while a stack is
   * in hand, and the hover border otherwise.
   */
  private buildHighlights(): HighlightView[] {
    const drag = this.interaction.drag;
    if (drag && drag.cardIds.length > 0) {
      const dropTarget = this.buildDropTargetHighlight(drag);
      return dropTarget ? [dropTarget] : [];
    }

    const hoverHighlight = this.buildHoverHighlight();
    return hoverHighlight ? [hoverHighlight] : [];
  }

  /**
   * Computes the border marking where the dragged stack would land if it were
   * released now, or null when it would not be accepted anywhere.
   *
   * The card in hand wears no border of its own: it is already lifted above the
   * board and following the pointer, so the only thing left to say is where it
   * is going — and only when it can actually go there, so the border never
   * invites a drop the rules will refuse.
   */
  private buildDropTargetHighlight(
    drag: DragInteraction,
  ): HighlightView | null {
    // Asking the same resolver the drop itself will ask means the previewed
    // pile is the pile the card lands on, not a second guess at it.
    const target = resolveDragTarget(this.game, drag, this.viewport);
    if (!target) {
      return null;
    }

    const targetPile = this.game.getPileById(target.pileId);
    if (
      !targetPile ||
      !this.game.canMoveCardToPile(drag.cardIds[0], target.pileId)
    ) {
      return null;
    }

    // Outline the card the stack would land on, which is the pile itself when
    // there is nothing in it yet. Sized to a card either way, so the border
    // marks the landing place rather than the whole column it belongs to.
    const pileCards = targetPile.getCards();
    const topCard =
      pileCards.length > 0 ? pileCards[pileCards.length - 1] : null;

    return {
      anchor: topCard
        ? { kind: "card", cardId: topCard.id }
        : { kind: "point", x: target.x, y: target.y },
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scale,
      depth: DROP_TARGET_HIGHLIGHT_DEPTH,
      openBottom: false,
    };
  }

  /**
   * Computes the hover border for the card or empty pile under the pointer, or
   * null when nothing hovered can be interacted with.
   */
  private buildHoverHighlight(): HighlightView | null {
    const stockEmpty = this.game.stock.getCards().length === 0;
    const stockOrigin = this.origins.get(this.game.stock.id);

    if (
      this.interaction.isStockBackgroundHovered &&
      stockEmpty &&
      stockOrigin
    ) {
      return {
        anchor: { kind: "point", x: stockOrigin.x, y: stockOrigin.y },
        width: this.cardWidth,
        height: this.cardHeight,
        scale: this.scale,
        depth: HOVER_HIGHLIGHT_DEPTH,
        openBottom: false,
      };
    }

    if (!this.interaction.hoveredCardId) {
      return null;
    }

    const hoveredCard = this.game.getCardById(this.interaction.hoveredCardId);
    const hoveredPile = hoveredCard
      ? this.game.getPileContainingCard(hoveredCard.id)
      : undefined;
    if (
      !hoveredCard ||
      !hoveredPile ||
      !this.game.isCardInteractableInPile(hoveredCard, hoveredPile)
    ) {
      return null;
    }

    const pileCards = hoveredPile.getCards();
    const cardIndex = pileCards.indexOf(hoveredCard);

    return {
      anchor: { kind: "card", cardId: hoveredCard.id },
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scale,
      depth: HOVER_HIGHLIGHT_DEPTH,
      // Leave the bottom edge open when another card is stacked on top, so the
      // border never draws a line across the covering card.
      openBottom: cardIndex !== -1 && cardIndex < pileCards.length - 1,
    };
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
