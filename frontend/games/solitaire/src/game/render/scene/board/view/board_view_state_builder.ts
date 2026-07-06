import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PileType } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
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

function getCardFrame(
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
  const scale = computeScale(viewport);
  const origins = computePileOrigins(viewport, scale);
  const cardWidth = CARD_WIDTH_PX * scale;
  const cardHeight = CARD_HEIGHT_PX * scale;

  const backgrounds: PileBackgroundView[] = [];
  const cards: CardView[] = [];
  let highlight: HighlightView | null = null;

  // 1. Compute backgrounds
  const stockEmpty = game.stock.getCards().length === 0;
  const stockOrigin = origins.get("stock");
  if (stockOrigin) {
    backgrounds.push({
      pileId: "stock",
      x: stockOrigin.x,
      y: stockOrigin.y,
      scale,
      depth: 0,
      cursor: stockEmpty ? "pointer" : "default",
    });
  }

  for (let i = 0; i < 4; i++) {
    const origin = origins.get(`foundation-${i}`);
    if (origin) {
      backgrounds.push({
        pileId: `foundation-${i}`,
        x: origin.x,
        y: origin.y,
        scale,
        depth: 0,
      });
    }
  }

  for (let i = 0; i < 7; i++) {
    const origin = origins.get(`tableau-${i}`);
    if (origin) {
      backgrounds.push({
        pileId: `tableau-${i}`,
        x: origin.x,
        y: origin.y,
        scale,
        depth: 0,
      });
    }
  }

  // Helper to determine if a card is currently being dragged
  const draggedIds = interaction.drag?.cardIds ?? [];
  const dragSet = new Set(draggedIds);
  const dragPrimary = interaction.drag?.primary ?? null;

  // Find the pile containing the primary dragged card to compute relative offsets
  const dragSourcePile = draggedIds.length > 0
    ? game.getPileContainingCard(draggedIds[0])
    : null;
  const isTableauDrag = dragSourcePile?.type === PileType.TABLEAU;

  const allPiles = [
    game.stock,
    game.waste,
    ...game.foundations,
    ...game.tableaus,
  ];

  // 2. Compute card views
  for (const pile of allPiles) {
    const origin = origins.get(pile.id);
    if (!origin) continue;

    const pileCards = pile.getCards();
    const isWaste = pile.type === PileType.WASTE;
    const isTableau = pile.type === PileType.TABLEAU;

    // Determine the expansion card ID if hover expansion applies to this pile
    const hasHoveredCardInPile = interaction.hoveredCardId &&
      pileCards.some((c) => c.id === interaction.hoveredCardId);
    const expansionCardId =
      hasHoveredCardInPile && !interaction.drag ? interaction.hoveredCardId : null;

    const offsets = offsetsForPile(
      pile,
      pileCards,
      game.settings.drawCount,
      expansionCardId,
    );

    for (let j = 0; j < pileCards.length; j++) {
      const card = pileCards[j];
      const isDragged = dragSet.has(card.id);

      let x = 0;
      let y = 0;
      let depth = isWaste ? j : j + 1;
      let snap = interaction.snapAll;

      if (isDragged && dragPrimary) {
        const dragIdx = draggedIds.indexOf(card.id);
        x = dragPrimary.x;
        y = dragPrimary.y + (isTableauDrag ? dragIdx * TABLEAU_FACE_UP_OFFSET * scale : 0);
        depth = 1000 + dragIdx;
        snap = true;
      } else {
        x = origin.x + offsets[j].x * scale;
        y = origin.y + offsets[j].y * scale;
      }

      cards.push({
        cardId: card.id,
        x,
        y,
        scale,
        depth,
        frame: getCardFrame(card, pile.type, game.settings.cardBackStyle),
        cursor: game.isCardInteractable(card) ? "pointer" : "default",
        draggable: game.isCardDraggable(card),
        snap,
      });
    }
  }

  // 3. Compute highlight view
  const isDragging = draggedIds.length > 0;
  if (!isDragging) {
    if (interaction.isStockBackgroundHovered && stockEmpty && stockOrigin) {
      highlight = {
        x: stockOrigin.x,
        y: stockOrigin.y,
        width: cardWidth,
        height: cardHeight,
        scale,
        openBottom: false,
      };
    } else if (interaction.hoveredCardId) {
      const hoveredCard = game.getCardById(interaction.hoveredCardId);
      if (hoveredCard && game.isCardInteractable(hoveredCard)) {
        const cardView = cards.find((cv) => cv.cardId === interaction.hoveredCardId);
        if (cardView) {
          const hoveredPile = game.getPileContainingCard(interaction.hoveredCardId);
          let openBottom = false;
          if (hoveredPile) {
            const pileCards = hoveredPile.getCards();
            const idx = pileCards.findIndex((c) => c.id === interaction.hoveredCardId);
            if (idx !== -1 && idx < pileCards.length - 1) {
              openBottom = true;
            }
          }

          highlight = {
            x: cardView.x,
            y: cardView.y,
            width: cardWidth,
            height: cardHeight,
            scale,
            openBottom,
          };
        }
      }
    }
  }

  return {
    backgrounds,
    cards,
    highlight,
  };
}
