import { ResolvedMove } from "./moves/move";
import { grabbedStack } from "./rules/grab";
import { Tabletop } from "./tabletop";
import { hasRoomFor } from "./zones/zone";

/**
 * Resolves a requested move into the stack and piles it would act on, or null
 * when the rules reject it.
 */
export function resolveMove(
  tabletop: Tabletop,
  cardId: string,
  targetPileId: string,
): ResolvedMove | null {
  const card = tabletop.getCardById(cardId);
  const targetPile = tabletop.pile(targetPileId);
  const sourcePile = tabletop.pileHolding(cardId);
  const targetRules = tabletop.zoneFor(targetPileId);

  if (
    !card ||
    !targetPile ||
    !sourcePile ||
    !targetRules?.accept ||
    sourcePile.id === targetPileId
  ) {
    return null;
  }

  // Checked apart from the grab rule, which lets the face-down top of the
  // Klondike stock be clicked to draw.
  if (!card.faceUp) {
    return null;
  }

  const sourceRules = tabletop.zoneFor(sourcePile.id);
  const movingStack = sourceRules
    ? grabbedStack(sourceRules.grab, card, sourcePile, tabletop)
    : null;
  if (
    !movingStack ||
    !hasRoomFor(targetRules, targetPile, movingStack.length)
  ) {
    return null;
  }

  const accepted = targetRules.accept({
    card,
    movingStack,
    sourcePile,
    targetPile,
    board: tabletop,
  });
  return accepted ? { movingStack, sourcePile, targetPile } : null;
}
