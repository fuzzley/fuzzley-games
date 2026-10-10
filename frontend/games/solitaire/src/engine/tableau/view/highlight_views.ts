import {
  CARD_RENDER_HEIGHT_PX,
  CARD_RENDER_WIDTH_PX,
} from "@/engine/render/layout/card_metrics";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import { TableMetrics } from "@/engine/render/layout/table_layout";
import {
  DragInteraction,
  TableInteractionState,
} from "@/engine/render/input/interaction_state";
import {
  HighlightAnchor,
  HighlightView,
} from "@/engine/render/view/table_view_state";
import { resolveDragTarget } from "./drag";
import { TableView } from "./table_view";

/**
 * Returns the highlight borders to draw this frame: drag feedback while a
 * stack is in hand, and the hover border otherwise.
 */
export function highlightViews(
  game: TableView,
  interaction: TableInteractionState,
  metrics: TableMetrics,
): HighlightView[] {
  const drag = interaction.drag;
  const highlight =
    drag && drag.cardIds.length > 0
      ? dropTargetHighlight(game, drag, metrics)
      : (backgroundHoverHighlight(game, interaction, metrics) ??
        cardHoverHighlight(game, interaction, metrics));
  return highlight ? [highlight] : [];
}

/**
 * Returns the border marking where the dragged stack would land if released
 * now, or null if it would not be accepted there.
 */
function dropTargetHighlight(
  game: TableView,
  drag: DragInteraction,
  metrics: TableMetrics,
): HighlightView | null {
  const target = resolveDragTarget(game, drag, metrics);
  if (!target) {
    return null;
  }

  const targetPile = game.getPileById(target.pileId);
  const [primaryCardId] = drag.cardIds;
  if (
    !targetPile ||
    primaryCardId === undefined ||
    !game.canMoveCardToPile(primaryCardId, target.pileId)
  ) {
    return null;
  }

  // Outline the card the stack would land on, or the empty slot, rather than
  // the whole column.
  const topCard = targetPile.topCard;
  return border(
    topCard
      ? { kind: "card", cardId: topCard.id }
      : { kind: "point", x: target.x, y: target.y },
    RenderLayer.DROP_TARGET_HINT,
    false,
    metrics,
  );
}

/**
 * Returns the hover border for the card under the pointer, or null when
 * nothing hovered can be picked up.
 */
function cardHoverHighlight(
  game: TableView,
  interaction: TableInteractionState,
  metrics: TableMetrics,
): HighlightView | null {
  if (!interaction.hoveredCardId) {
    return null;
  }

  const hoveredCard = game.getCardById(interaction.hoveredCardId);
  const hoveredPile = hoveredCard
    ? game.getPileContainingCard(hoveredCard.id)
    : undefined;
  if (
    !hoveredCard ||
    !hoveredPile ||
    !game.isCardInteractableInPile(hoveredCard, hoveredPile)
  ) {
    return null;
  }

  const pileCards = hoveredPile.getCards();
  const cardIndex = pileCards.indexOf(hoveredCard);
  return border(
    { kind: "card", cardId: hoveredCard.id },
    RenderLayer.HOVER_HINT,
    cardIndex !== -1 && cardIndex < pileCards.length - 1,
    metrics,
  );
}

/** Returns the border for a hovered empty slot that does something. */
function backgroundHoverHighlight(
  game: TableView,
  interaction: TableInteractionState,
  metrics: TableMetrics,
): HighlightView | null {
  const pileId = interaction.hoveredBackgroundPileId;
  if (!pileId) return null;

  const pile = game.getPileById(pileId);
  const origin = metrics.origins.get(pileId);
  if (!pile || !game.isEmptySlotActionable(pile) || !origin) {
    return null;
  }

  return border(
    { kind: "point", x: origin.x, y: origin.y },
    RenderLayer.HOVER_HINT,
    false,
    metrics,
  );
}

/**
 * Returns a border the size of a drawn card around an anchor.
 *
 * @param openBottom Whether to leave the bottom edge open, for a card with
 *   another stacked on it.
 */
function border(
  anchor: HighlightAnchor,
  layer: RenderLayer,
  openBottom: boolean,
  metrics: TableMetrics,
): HighlightView {
  // The drawn size rather than the grid cell, so a highlight hugs the card.
  return {
    anchor,
    width: CARD_RENDER_WIDTH_PX * metrics.scale,
    height: CARD_RENDER_HEIGHT_PX * metrics.scale,
    scale: metrics.scale,
    depth: depthFor(layer),
    openBottom,
  };
}
