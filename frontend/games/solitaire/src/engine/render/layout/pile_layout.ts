import { Point } from "@/engine/core/common/point";
import { Card } from "@/engine/core/card/card";

/** Describes how a pile arranges its cards relative to the pile's origin. */
export type PileLayout =
  /** Every card squarely on top of the last, so only the top one shows. */
  | { readonly kind: "stacked" }
  /** Cards fanned downwards, revealing the top edge of each. */
  | {
      readonly kind: "fan-down";
      /** Gap below a face-up card before the next one. */
      readonly faceUpGap: number;
      /** Gap below a face-down card before the next one. */
      readonly faceDownGap: number;
      /** Extra gap opened below the hovered card to reveal more of it. */
      readonly hoverExpansion: number;
    }
  /**
   * The last few cards fanned rightwards, revealing the leading edge of each,
   * with everything below them stacked squarely out of sight.
   */
  | {
      readonly kind: "fan-right";
      /** Gap to the right of a card before the next one. */
      readonly gap: number;
      /** How many top cards to fan; the rest sit squarely at the origin. */
      readonly maxVisible: number;
    };

/** Returns the offsets of cards stacked directly on top of each other. */
export function stackedCardOffsets(count: number): Point[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
}

/**
 * Returns the offsets of a downward fan, opening an extra gap below the hovered
 * card.
 *
 * @param cards The pile's cards, bottom first.
 * @param expansionCardId The hovered card to reveal, or null for none.
 */
export function fanDownOffsets(
  cards: ReadonlyArray<Card>,
  layout: Extract<PileLayout, { kind: "fan-down" }>,
  expansionCardId: string | null,
): Point[] {
  const offsets: Point[] = [];
  let currentY = 0;
  for (const card of cards) {
    offsets.push({ x: 0, y: currentY });
    currentY += card.faceUp ? layout.faceUpGap : layout.faceDownGap;
    if (card.id === expansionCardId) {
      currentY += layout.hoverExpansion;
    }
  }
  return offsets;
}

/**
 * Returns the offsets of a rightward fan of a pile's topmost cards.
 *
 * @param count The number of cards in the whole pile.
 */
export function fanRightOffsets(
  count: number,
  layout: Extract<PileLayout, { kind: "fan-right" }>,
): Point[] {
  const fanCount = Math.min(count, layout.maxVisible);
  const fanStartIndex = count - fanCount;

  const offsets: Point[] = [];
  for (let cardIndex = 0; cardIndex < count; cardIndex++) {
    offsets.push(
      cardIndex < fanStartIndex
        ? { x: 0, y: 0 }
        : { x: (cardIndex - fanStartIndex) * layout.gap, y: 0 },
    );
  }
  return offsets;
}

/**
 * Returns each card's offset from its pile's origin under an arrangement.
 *
 * @param cards The pile's cards, bottom first.
 * @param expansionCardId The hovered card to reveal, or null. Only a downward
 *   fan does anything with it.
 */
export function pileCardOffsets(
  layout: PileLayout,
  cards: ReadonlyArray<Card>,
  expansionCardId: string | null = null,
): Point[] {
  switch (layout.kind) {
    case "fan-down":
      return fanDownOffsets(cards, layout, expansionCardId);
    case "fan-right":
      return fanRightOffsets(cards.length, layout);
    default:
      return stackedCardOffsets(cards.length);
  }
}

/**
 * Returns how far a pile's cards reach below its origin, in design units.
 *
 * @param cards The pile's cards, bottom first.
 */
export function pileHeight(
  layout: PileLayout,
  cards: ReadonlyArray<Card>,
  cardHeight: number,
): number {
  if (cards.length === 0) {
    return cardHeight;
  }
  const offsets = pileCardOffsets(layout, cards);
  return offsets[offsets.length - 1].y + cardHeight;
}
