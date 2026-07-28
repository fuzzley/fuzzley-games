import { Point } from "@/engine/core/common/point";
import { Card } from "@/engine/core/card/card";

/**
 * How a pile arranges the cards stacked in it, relative to the pile's origin.
 *
 * Data rather than a function per pile role, because the arrangements
 * themselves are few and shared while the roles that use them are not: a
 * Klondike foundation, a FreeCell free cell and a face-down stock all stack
 * squarely, and a Klondike tableau and a Spider column both fan downwards with
 * different gaps. A game says which arrangement each of its zones uses and
 * supplies the distances.
 */
export type PileLayout =
  /** Every card squarely on top of the last, so only the top one shows. */
  | { readonly kind: "stacked" }
  /**
   * Cards fanned downwards, revealing the top edge of each. Face-down cards get
   * a tighter gap than face-up ones, since there is nothing on them to read.
   */
  | {
      readonly kind: "fan-down";
      /** Gap below a face-up card before the next one. */
      readonly faceUpGap: number;
      /** Gap below a face-down card before the next one. */
      readonly faceDownGap: number;
      /**
       * Extra gap opened below the hovered card, so the cards on top of it
       * slide down and reveal more of it. Zero disables the effect.
       */
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
      /** How many cards to fan. The rest sit squarely at the origin. */
      readonly maxVisible: number;
    };

/** Relative offsets for cards stacked directly on top of each other. */
export function stackedCardOffsets(count: number): Point[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
}

/**
 * Relative offsets for a downward fan, opening an extra gap below the hovered
 * card so the cards on top reveal more of it.
 *
 * @param cards The pile's cards, bottom-first.
 * @param layout The gaps to fan by.
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
 * Relative offsets for a rightward fan of the topmost cards. Anything below the
 * fan sits squarely at the origin, hidden behind it.
 *
 * @param count The number of cards in the pile.
 * @param layout The gap to fan by and how many cards to fan.
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
 * Relative offsets for a pile's cards under the given arrangement.
 *
 * @param layout How the pile arranges its cards.
 * @param cards The pile's cards, bottom-first.
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
 * The downward extent of a pile's cards, in design units, measured from the
 * pile's origin to the bottom edge of its lowest card.
 *
 * A fanned column reaches further down the board than the slot it starts in, so
 * a drop target has to grow with it or a card released low in the column would
 * miss.
 *
 * @param layout How the pile arranges its cards.
 * @param cards The pile's cards, bottom-first.
 * @param cardHeight The height of a single card, in design units.
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
