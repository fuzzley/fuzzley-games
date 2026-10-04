import { Card } from "@/engine/core/card/card";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { Point } from "@/engine/core/common/point";
import { PileGeometry, Rect } from "../view/table_view_state";
import { PileLayout, pileHeight, pileWidth } from "./pile_layout";
import { Size } from "./table_layout";

/** Describes a pile a dragged stack may be dropped onto. */
export interface DropCandidate {
  /** The pile itself, whose cards set how far its target area reaches. */
  readonly pile: ReadonlyCardPile<Card>;
  /** How that pile arranges its cards. */
  readonly layout: PileLayout;
}

/**
 * Computes the screen rectangle each candidate pile accepts a drop within,
 * which for a fanned pile grows with its cards, down or across.
 *
 * @param origins Pile origins from the table layout, in screen pixels.
 * @param cardSize The size of one card, in design units.
 * @param scale The layout scale, from design units to screen pixels.
 */
export function computeDropGeometries(
  candidates: readonly DropCandidate[],
  origins: ReadonlyMap<string, Point>,
  cardSize: Size,
  scale: number,
): PileGeometry[] {
  const geometries: PileGeometry[] = [];
  for (const { pile, layout } of candidates) {
    const origin = origins.get(pile.id);
    if (!origin) continue;

    geometries.push({
      pileId: pile.id,
      x: origin.x,
      y: origin.y,
      width: pileWidth(layout, pile.getCards(), cardSize.width) * scale,
      height: pileHeight(layout, pile.getCards(), cardSize.height) * scale,
    });
  }
  return geometries;
}

/** Calculates the overlap area between two rectangles. */
function overlapArea(first: Rect, second: Rect): number {
  const xOverlap = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) -
      Math.max(first.x, second.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) -
      Math.max(first.y, second.y),
  );
  return xOverlap * yOverlap;
}

/**
 * Returns the candidate the dragged card overlaps most, or null if it overlaps
 * none by more than `minOverlapArea`.
 *
 * @param dragRect The screen bounds of the card the player grabbed.
 * @param minOverlapArea The overlap, in square screen pixels, a candidate must
 *   exceed; by default any overlap at all will do.
 */
export function resolveDropTarget(
  dragRect: Rect,
  geometries: readonly PileGeometry[],
  minOverlapArea = 0,
): PileGeometry | null {
  let target: PileGeometry | null = null;
  let maxOverlapArea = minOverlapArea;

  for (const geometry of geometries) {
    const area = overlapArea(dragRect, geometry);
    if (area > maxOverlapArea) {
      maxOverlapArea = area;
      target = geometry;
    }
  }

  return target;
}
