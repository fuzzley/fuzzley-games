import { Point } from "@/game/common/point";
import {
  CardPile,
  PileType,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { DrawCount } from "@/game/model/game/game_settings";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
  DESIGN_WIDTH_PX,
  DESIGN_HEIGHT_PX,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
  HEADER_HEIGHT_PX,
} from "../layout/board_layout_constants";
import { PileGeometry, Viewport } from "./board_view_state";

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;
/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;
/**
 * Extra downward gap opened below the hovered tableau card so the cards fanned
 * on top slide down and reveal more of it.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;
/**
 * Horizontal gap between fanned waste cards.
 *
 * Wide enough to clear a card's index corner, so each fanned card shows its own
 * rank and suit rather than a bare sliver of paper. The waste sits in column 1
 * and the foundations start at column 3, so the fan has the whole of column 2
 * to grow into: a three card fan stays clear of the first foundation up to an
 * offset of about 125.
 */
export const WASTE_FAN_OFFSET_X = 55;
/** Maximum number of waste cards to fan (show the edges of) in multi-draw mode. */
export const WASTE_MAX_FAN_CARDS = 3;
/** Base render depth applied to a dragged card stack, lifting it above all resting cards. */
export const DRAG_BASE_DEPTH = 1000;

/**
 * Computes the uniform scale factor that fits the reference design onto the
 * viewport, accounting for the header overlay.
 *
 * The result maps design units to device pixels, so it is capped at the
 * viewport's pixel ratio rather than at 1.0: on a 2x display a design unit is
 * worth two device pixels, and rendering it as one would waste half the
 * display's resolution.
 *
 * @param viewport The available drawable area.
 * @returns The scale factor in the range (0, viewport.pixelRatio].
 */
export function computeScale(viewport: Viewport): number {
  const pixelRatio = viewport.pixelRatio;
  const screenWidth = viewport.width || DESIGN_WIDTH_PX * pixelRatio;
  const screenHeight =
    (viewport.height || DESIGN_HEIGHT_PX * pixelRatio) -
    HEADER_HEIGHT_PX * pixelRatio;

  const scaleX = screenWidth / DESIGN_WIDTH_PX;
  const scaleY = screenHeight / (DESIGN_HEIGHT_PX - HEADER_HEIGHT_PX);
  let scale = Math.min(scaleX, scaleY);
  if (scale > pixelRatio) scale = pixelRatio;
  if (scale <= 0) scale = pixelRatio;
  return scale;
}

/**
 * Computes the absolute screen origin of every pile for the given viewport,
 * using the standard Klondike 7-column, 2-row layout centered horizontally.
 *
 * @param viewport The available drawable area.
 * @param scale The scale factor from {@link computeScale}.
 * @returns A map from pile id to its top-left origin.
 */
export function computePileOrigins(
  viewport: Viewport,
  scale: number,
): Map<string, Point> {
  const cardWidth = CARD_WIDTH_PX * scale;
  const cardHeight = CARD_HEIGHT_PX * scale;
  const gapX = LAYOUT_GAP_X * scale;
  const gapY = LAYOUT_GAP_Y * scale;

  const totalLayoutWidth =
    TABLEAU_COUNT * cardWidth + (TABLEAU_COUNT - 1) * gapX;
  const screenWidth = viewport.width || DESIGN_WIDTH_PX;
  const paddingX = Math.max(
    LAYOUT_PADDING_X * scale,
    (screenWidth - totalLayoutWidth) / 2,
  );
  const paddingY = LAYOUT_PADDING_Y * scale;

  const columnX = (columnIndex: number): number =>
    paddingX + columnIndex * (cardWidth + gapX);

  // The header is a DOM overlay measured in CSS pixels, so it converts to
  // device pixels by the pixel ratio rather than by the layout scale.
  const headerHeight = HEADER_HEIGHT_PX * viewport.pixelRatio;
  const topRowY = headerHeight + paddingY;
  const bottomRowY = headerHeight + paddingY + cardHeight + gapY;

  const origins = new Map<string, Point>();
  origins.set(STOCK_PILE_ID, { x: columnX(0), y: topRowY });
  origins.set(WASTE_PILE_ID, { x: columnX(1), y: topRowY });
  for (
    let foundationIndex = 0;
    foundationIndex < FOUNDATION_COUNT;
    foundationIndex++
  ) {
    origins.set(foundationPileId(foundationIndex), {
      x: columnX(3 + foundationIndex),
      y: topRowY,
    });
  }
  for (let tableauIndex = 0; tableauIndex < TABLEAU_COUNT; tableauIndex++) {
    origins.set(tableauPileId(tableauIndex), {
      x: columnX(tableauIndex),
      y: bottomRowY,
    });
  }
  return origins;
}

/** Relative offsets for cards stacked directly on top of each other. */
export function stackedCardOffsets(count: number): Point[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
}

/**
 * Relative offsets for a tableau column, fanning cards downwards and opening an
 * extra gap below the hovered card so the cards on top reveal more of it.
 *
 * @param cards The tableau's cards, bottom-first.
 * @param expansionCardId The hovered card to reveal, or null for none.
 */
export function tableauCardOffsets(
  cards: ReadonlyArray<PlayingCard>,
  expansionCardId: string | null,
): Point[] {
  const offsets: Point[] = [];
  let currentY = 0;
  for (const card of cards) {
    offsets.push({ x: 0, y: currentY });
    currentY += card.faceUp ? TABLEAU_FACE_UP_OFFSET : TABLEAU_FACE_DOWN_OFFSET;
    if (card.id === expansionCardId) {
      currentY += TABLEAU_HOVER_EXPANSION_OFFSET;
    }
  }
  return offsets;
}

/**
 * Relative offsets for the waste pile. Fans the top cards horizontally so a few
 * edges are visible; in Draw 1 mode only the top card is shown.
 *
 * @param count The number of cards in the waste.
 * @param drawCount The active draw-count mode.
 */
export function wasteCardOffsets(count: number, drawCount: DrawCount): Point[] {
  const maxFanCards = drawCount === 1 ? 1 : WASTE_MAX_FAN_CARDS;
  const fanCount = Math.min(count, maxFanCards);
  const fanStartIndex = count - fanCount;

  const offsets: Point[] = [];
  for (let cardIndex = 0; cardIndex < count; cardIndex++) {
    if (cardIndex < fanStartIndex) {
      offsets.push({ x: 0, y: 0 });
    } else {
      offsets.push({
        x: (cardIndex - fanStartIndex) * WASTE_FAN_OFFSET_X,
        y: 0,
      });
    }
  }
  return offsets;
}

/**
 * Relative offsets for a pile's cards, dispatching on the pile's role.
 *
 * @param pile The pile whose cards are being laid out.
 * @param cards The pile's cards, bottom-first.
 * @param drawCount The active draw-count mode (used by the waste pile).
 * @param expansionCardId The hovered tableau card to reveal, or null.
 */
export function offsetsForPile(
  pile: CardPile<PlayingCard>,
  cards: ReadonlyArray<PlayingCard>,
  drawCount: DrawCount,
  expansionCardId: string | null,
): Point[] {
  switch (pile.type) {
    case PileType.WASTE:
      return wasteCardOffsets(cards.length, drawCount);
    case PileType.TABLEAU:
      return tableauCardOffsets(cards, expansionCardId);
    default:
      return stackedCardOffsets(cards.length);
  }
}

/**
 * Computes the drop-target rectangles for the foundation and tableau piles. A
 * tableau's height grows with its fanned cards so a card dropped low in the
 * column still overlaps it. Pure, so the drop hit-test is testable without
 * Phaser.
 *
 * @param game The game model.
 * @param viewport The available drawable area.
 * @returns The candidate pile rectangles, in screen coordinates.
 */
export function computeDropGeometries(
  game: SolitaireGame,
  viewport: Viewport,
): PileGeometry[] {
  const scale = computeScale(viewport);
  const origins = computePileOrigins(viewport, scale);
  const width = CARD_WIDTH_PX * scale;

  const geometries: PileGeometry[] = [];
  for (const pile of [...game.foundations, ...game.tableaus]) {
    const origin = origins.get(pile.id);
    if (!origin) continue;

    let height = CARD_HEIGHT_PX * scale;
    const cards = pile.getCards();
    if (pile.type === PileType.TABLEAU && cards.length > 0) {
      const offsets = tableauCardOffsets(cards, null);
      const lastOffsetY = offsets[offsets.length - 1].y;
      height = lastOffsetY * scale + CARD_HEIGHT_PX * scale;
    }

    geometries.push({
      pileId: pile.id,
      x: origin.x,
      y: origin.y,
      width,
      height,
    });
  }
  return geometries;
}
