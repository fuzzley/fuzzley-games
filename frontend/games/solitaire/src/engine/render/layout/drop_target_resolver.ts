import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { CARD_WIDTH_PX, CARD_HEIGHT_PX } from "./board_layout_constants";
import { computeDropGeometries, computeScale } from "./board_geometry";
import {
  DragInteraction,
  PileGeometry,
  Rect,
  Viewport,
} from "../view/table_view_state";

/**
 * Calculates the overlap area between two rectangles.
 */
function getOverlapArea(rect1: Rect, rect2: Rect): number {
  const xOverlap = Math.max(
    0,
    Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
      Math.max(rect1.x, rect2.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
      Math.max(rect1.y, rect2.y),
  );
  return xOverlap * yOverlap;
}

/**
 * Resolves which pile a dragged card stack is dropped onto, by finding the candidate
 * pile geometry that has the greatest overlap area with the dragged card's bounds.
 *
 * @param dragRect The absolute screen bounds of the primary dragged card.
 * @param geometries The candidate pile drop geometries (tableaus and foundations).
 * @returns The pile id of the drop target, or null if no overlap is found.
 */
export function resolveDropTarget(
  dragRect: Rect,
  geometries: PileGeometry[],
): string | null {
  let targetPileId: string | null = null;
  let maxOverlapArea = 0;

  for (const geometry of geometries) {
    const area = getOverlapArea(dragRect, geometry);
    if (area > maxOverlapArea) {
      maxOverlapArea = area;
      targetPileId = geometry.pileId;
    }
  }

  return targetPileId;
}

/**
 * Resolves the pile an in-flight drag would land on, as the pile's full drop
 * rectangle.
 *
 * Pure, and the single answer to "where does this drag go": the view builder
 * calls it every frame to preview the target and the input manager calls it on
 * release to commit the move, so the border can never promise a pile the drop
 * then disagrees with.
 *
 * @param game The game model.
 * @param drag The active drag.
 * @param viewport The available drawable area.
 * @returns The target pile's geometry, or null when the drag overlaps no pile.
 */
export function resolveDragTarget(
  game: SolitaireGame,
  drag: DragInteraction,
  viewport: Viewport,
): PileGeometry | null {
  const scale = computeScale(viewport);
  const dragRect: Rect = {
    x: drag.primary.x,
    y: drag.primary.y,
    width: CARD_WIDTH_PX * scale,
    height: CARD_HEIGHT_PX * scale,
  };

  const geometries = computeDropGeometries(game, viewport);
  const targetPileId = resolveDropTarget(dragRect, geometries);

  return (
    geometries.find((geometry) => geometry.pileId === targetPileId) ?? null
  );
}
