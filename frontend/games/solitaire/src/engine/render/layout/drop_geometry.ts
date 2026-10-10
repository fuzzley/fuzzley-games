import { Card } from "@/engine/core/card/card";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { Point, Rect, Size } from "../geometry";
import { PileLayout, pileBounds } from "./pile_layout";

/** Describes the screen rectangle a pile occupies. */
export interface PileGeometry extends Rect {
  /** The unique id of the pile this geometry belongs to. */
  pileId: string;
}

/** Describes a pile a dragged stack may be dropped onto. */
export interface DropCandidate {
  /** The pile itself, whose cards set how far its target area reaches. */
  readonly pile: ReadonlyCardPile<Card>;
  /** How that pile arranges its cards. */
  readonly layout: PileLayout;
}

/**
 * Computes the screen rectangle each candidate pile accepts a drop within,
 * which for a fanned or spread pile grows with its cards, whichever way they
 * run.
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

    const bounds = pileBounds(layout, pile.getCards(), cardSize);
    geometries.push({
      pileId: pile.id,
      x: origin.x + bounds.x * scale,
      y: origin.y + bounds.y * scale,
      width: bounds.width * scale,
      height: bounds.height * scale,
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
