import {
  computeDropGeometries,
  resolveDropTarget,
  PileGeometry,
} from "@/engine/render/layout/drop_geometry";
import { TableMetrics } from "@/engine/render/layout/table_layout";
import { DragInteraction } from "@/engine/render/input/interaction_state";
import { grabbedStack } from "../rules/grab";
import { pileArrangement } from "./pile_arrangement";
import { TableView } from "./table_view";

/**
 * How much of the dragged card must lie over a pile that would take it for
 * that pile to win over one the card overlaps more, as a share of the card.
 *
 * Enough that a card dropped squarely on one column does not jump to the
 * neighbour it barely touches.
 */
const PREFERRED_TARGET_MIN_OVERLAP = 0.25;

/**
 * Returns a function listing the cards a drag of a card picks up: it and
 * everything resting on it, bottom first, or none if its zone will not let go.
 */
export function stackFromCard(
  view: TableView,
): (cardId: string) => readonly string[] {
  return (cardId) => {
    const pile = view.getPileContainingCard(cardId);
    const card = view.getCardById(cardId);
    const zone = pile ? view.zoneFor(pile.id) : undefined;
    if (!pile || !card || !zone) return [];

    const stack = grabbedStack(zone.grab, card, pile, view.board);
    return stack ? stack.map((held) => held.id) : [];
  };
}

/**
 * Resolves the pile a drag would land on, as its drop rectangle, or null if it
 * is over none.
 *
 * Prefers a pile that would take the stack, if the card lies well over one,
 * and only then the one the drag overlaps most. So where piles overlap, as a
 * pyramid's do, a card held over a free card and the covered one above it
 * lands where it can. Both the hover preview and the drop itself ask this, so
 * the two agree.
 */
export function resolveDragTarget(
  game: TableView,
  drag: DragInteraction,
  metrics: TableMetrics,
): PileGeometry | null {
  const cardSize = metrics.layout.cardSize;
  const geometries = computeDropGeometries(
    game.dropTargetPiles.map((pile) => ({
      pile,
      layout: pileArrangement(game, pile, metrics),
    })),
    metrics.origins,
    cardSize,
    metrics.scale,
  );

  const dragRect = {
    x: drag.primary.x,
    y: drag.primary.y,
    width: cardSize.width * metrics.scale,
    height: cardSize.height * metrics.scale,
  };
  const [primaryCardId] = drag.cardIds;
  const accepting =
    primaryCardId === undefined
      ? []
      : geometries.filter((geometry) =>
          game.canMoveCardToPile(primaryCardId, geometry.pileId),
        );

  return (
    resolveDropTarget(
      dragRect,
      accepting,
      dragRect.width * dragRect.height * PREFERRED_TARGET_MIN_OVERLAP,
    ) ?? resolveDropTarget(dragRect, geometries)
  );
}
