import { Point } from "@/engine/core/common/point";
import { Card } from "@/engine/core/card/card";
import { Rect } from "../view/table_view_state";
import type { Size } from "./table_layout";

/** Says which way a spread runs from its pile's origin. */
export type SpreadDirection =
  /** Each card right of the one under it, from the origin. */
  | "right"
  /**
   * Each card right of the one under it, as in a rightward spread, but ending
   * at the origin, so the spread reaches left of it. Every covered card keeps
   * its left edge, where its index is, in view.
   */
  | "left"
  /** Each card below the one under it, from the origin. */
  | "down";

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

/**
 * Works out how a pile arranges its cards on a particular grid from how it
 * would arrange them otherwise.
 */
export type PileLayoutOverride = (own: PileLayout) => PileLayout;

/** A pile's cards fanned downwards. */
export type FanDownLayout = Extract<PileLayout, { kind: "fan-down" }>;

/** A pile's top cards spread out one way. */
export type SpreadLayout = Extract<PileLayout, { kind: "spread" }>;

/**
 * Says how far a downward fan may open or close to fit the room below its
 * pile, in design units.
 */
export interface FanFit {
  /** The gap below a face-up card that a fan never closes past. */
  readonly minFaceUpGap: number;
  /** The gap below a face-up card that a fan never opens past. */
  readonly maxFaceUpGap: number;
  /** The gap below a face-down card that a fan never closes past. */
  readonly minFaceDownGap: number;
}

/**
 * Returns a downward fan with its gaps fitted to the room below its pile:
 * opened towards the cap when there is room to spare, and closed when there is
 * not, hidden cards first.
 *
 * Room is kept for the hovered card's expansion, so touching a card never
 * pushes the column further than it already reaches. A column that does not
 * fit even at the floors keeps them and runs past the room.
 *
 * @param cards The pile's cards, bottom first.
 * @param room How far the cards may reach below the origin, in design units.
 * @param cardHeight How tall one card is, in design units.
 */
export function fitFanDown(
  layout: FanDownLayout,
  cards: ReadonlyArray<Card>,
  room: number,
  cardHeight: number,
  fit: FanFit,
): FanDownLayout {
  // The last card leaves no gap below it.
  const above = cards.slice(0, -1);
  const upGaps = above.filter((card) => card.faceUp).length;
  const downGaps = above.length - upGaps;
  const spare = room - cardHeight - layout.hoverExpansion;
  const clamp = (value: number, low: number, high: number) =>
    Math.min(high, Math.max(low, value));

  // Hidden cards give up their gap before face-up ones go below their own.
  const faceDownGap =
    downGaps === 0
      ? layout.faceDownGap
      : clamp(
          (spare - upGaps * layout.faceUpGap) / downGaps,
          fit.minFaceDownGap,
          layout.faceDownGap,
        );
  const faceUpGap =
    upGaps === 0
      ? layout.faceUpGap
      : clamp(
          (spare - downGaps * faceDownGap) / upGaps,
          fit.minFaceUpGap,
          fit.maxFaceUpGap,
        );
  return { ...layout, faceUpGap, faceDownGap };
}

/**
 * Returns an arrangement as it looks in a mirror: a sideways spread runs the
 * other way, and anything else is unchanged.
 */
export function mirrorPileLayout(layout: PileLayout): PileLayout {
  if (layout.kind !== "spread" || layout.direction === "down") return layout;
  return {
    ...layout,
    direction: layout.direction === "right" ? "left" : "right",
  };
}

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
  layout: FanDownLayout,
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
 * Returns the offsets of a spread of a pile's topmost cards, or of its topmost
 * groups of cards.
 *
 * @param count The number of cards in the whole pile.
 */
export function spreadOffsets(count: number, layout: SpreadLayout): Point[] {
  const groupSize = layout.groupSize ?? 1;
  const groups = Math.ceil(count / groupSize);
  const shown = Math.min(groups, layout.maxVisible);
  const firstSpread = groups - shown;

  const offsets: Point[] = [];
  for (let cardIndex = 0; cardIndex < count; cardIndex++) {
    // Cards under the spread share the first place in it.
    const place = Math.max(0, Math.floor(cardIndex / groupSize) - firstSpread);
    switch (layout.direction) {
      case "right":
        offsets.push({ x: place * layout.gap, y: 0 });
        break;
      case "left":
        // Subtracted from zero so the top card's offset stays positive zero.
        offsets.push({ x: 0 - (shown - 1 - place) * layout.gap, y: 0 });
        break;
      case "down":
        offsets.push({ x: 0, y: place * layout.gap });
        break;
    }
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
