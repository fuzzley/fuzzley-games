import { Card } from "@/engine/core/card/card";
import { CardPile } from "@/engine/core/card/card_pile";
import { Point } from "@/engine/core/common/point";
import { PileGeometry, Rect } from "../view/table_view_state";
import { PileLayout, pileHeight } from "./pile_layout";
import { Size } from "./table_layout";

/** Render depth of a pile's background placeholder, below every card. */
export const PILE_BACKGROUND_DEPTH = 0;

/**
 * Base render depth applied to a stack flying to the pile it was just moved to,
 * lifting it above every resting card.
 *
 * A card's resting depth only orders it within its own pile, so a card
 * auto-moved to a foundation takes its new pile's low depth the instant the
 * model moves it and would spend the whole flight drawn underneath the deeper
 * columns it crosses. Below {@link DRAG_BASE_DEPTH}, so a stack in hand still
 * covers a card flying past it.
 */
export const FLIGHT_BASE_DEPTH = 500;

/** Base render depth applied to a dragged card stack, lifting it above all resting cards. */
export const DRAG_BASE_DEPTH = 1000;

/** Render depth of the hover highlight border, above every card on the board. */
export const HOVER_HIGHLIGHT_DEPTH = 2000;

/**
 * Render depth of the drop-target border: above every resting card, but below
 * the dragged stack, so the card in hand stays on top of the place it is going
 * rather than being drawn over by it.
 */
export const DROP_TARGET_HIGHLIGHT_DEPTH = DRAG_BASE_DEPTH - 1;

/** A pile a dragged stack may be dropped onto. */
export interface DropCandidate {
  /** The pile itself, whose cards set how far its target area reaches. */
  readonly pile: CardPile<Card>;
  /** How that pile arranges its cards. */
  readonly layout: PileLayout;
}

/**
 * Computes the screen rectangle each candidate pile accepts a drop within.
 *
 * A fanned pile's rectangle grows with its cards, so a stack released low in a
 * long column still overlaps it. Pure, so the hit test is testable without a
 * renderer.
 *
 * @param candidates The piles that accept drops, with their arrangements.
 * @param origins Pile origins from the table layout, in screen pixels.
 * @param cardSize The size of one card, in design units.
 * @param scale The layout scale, from design units to screen pixels.
 * @returns The candidate rectangles, in screen coordinates.
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
      width: cardSize.width * scale,
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
 * Resolves which candidate a dragged stack is over, by finding the rectangle it
 * overlaps most.
 *
 * @param dragRect The absolute screen bounds of the primary dragged card.
 * @param geometries The candidate pile rectangles.
 * @returns The target pile's geometry, or null when the drag overlaps none.
 */
export function resolveDropTarget(
  dragRect: Rect,
  geometries: readonly PileGeometry[],
): PileGeometry | null {
  let target: PileGeometry | null = null;
  let maxOverlapArea = 0;

  for (const geometry of geometries) {
    const area = overlapArea(dragRect, geometry);
    if (area > maxOverlapArea) {
      maxOverlapArea = area;
      target = geometry;
    }
  }

  return target;
}
