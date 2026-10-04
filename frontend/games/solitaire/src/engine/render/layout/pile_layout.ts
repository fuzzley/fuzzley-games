import { Point } from "@/engine/core/common/point";
import { Card } from "@/engine/core/card/card";
import { Rect } from "../view/table_view_state";
import { Size } from "./table_layout";

/** Says which way a spread runs from its pile's origin. */
export type SpreadDirection = "right" | "left" | "down";

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
   * The last few cards spread out from the origin, revealing the leading edge
   * of each, with everything below them stacked squarely out of sight.
   */
  | {
      readonly kind: "spread";
      /** Which way the cards spread from the origin. */
      readonly direction: SpreadDirection;
      /** Gap between one card, or group, and the next. */
      readonly gap: number;
      /**
       * How many top cards, or groups, to spread; the rest sit squarely at the
       * origin.
       */
      readonly maxVisible: number;
      /**
       * How many cards spread as one, so a stock dealt ten at a time shows one
       * sliver for each deal; one when omitted.
       */
      readonly groupSize?: number;
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

/** The unit step each way a spread can run. */
const SPREAD_STEPS: { readonly [Direction in SpreadDirection]: Point } = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
};

/**
 * Returns the offsets of a spread of a pile's topmost cards, or of its topmost
 * groups of cards.
 *
 * @param count The number of cards in the whole pile.
 */
export function spreadOffsets(
  count: number,
  layout: Extract<PileLayout, { kind: "spread" }>,
): Point[] {
  const groupSize = layout.groupSize ?? 1;
  const groups = Math.ceil(count / groupSize);
  const firstSpread = groups - Math.min(groups, layout.maxVisible);
  const step = SPREAD_STEPS[layout.direction];

  const offsets: Point[] = [];
  for (let cardIndex = 0; cardIndex < count; cardIndex++) {
    const group = Math.floor(cardIndex / groupSize);
    const distance = Math.max(0, group - firstSpread) * layout.gap;
    // Adding zero keeps a zero offset positive, so offsets compare equal.
    offsets.push({ x: step.x * distance + 0, y: step.y * distance + 0 });
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
    case "spread":
      return spreadOffsets(cards.length, layout);
    default:
      return stackedCardOffsets(cards.length);
  }
}

/**
 * Returns the rectangle a pile's cards cover, relative to its origin, in design
 * units, which a fanned or spread pile grows as it gains cards.
 *
 * @param cards The pile's cards, bottom first.
 */
export function pileBounds(
  layout: PileLayout,
  cards: ReadonlyArray<Card>,
  cardSize: Size,
): Rect {
  const offsets = pileCardOffsets(layout, cards);
  const xs = [0, ...offsets.map((offset) => offset.x)];
  const ys = [0, ...offsets.map((offset) => offset.y)];
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(...xs) - left + cardSize.width,
    height: Math.max(...ys) - top + cardSize.height,
  };
}
