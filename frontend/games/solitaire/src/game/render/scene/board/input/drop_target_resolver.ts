import { PileGeometry, Rect } from "../view/board_view_state";

/**
 * Calculates the overlap area between two rectangles.
 */
function getOverlapArea(rect1: Rect, rect2: Rect): number {
  const xOverlap = Math.max(
    0,
    Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y),
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
