import { PileGeometry, Rect } from "../view/board_view_state";

/**
 * Calculates the overlap area between two rectangles.
 */
function getOverlapArea(r1: Rect, r2: Rect): number {
  const xOverlap = Math.max(
    0,
    Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y),
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

  for (const geom of geometries) {
    const area = getOverlapArea(dragRect, geom);
    if (area > maxOverlapArea) {
      maxOverlapArea = area;
      targetPileId = geom.pileId;
    }
  }

  return targetPileId;
}
