import { Point } from "@/game/common/point";
import { CardPile, PileType } from "@/game/model/card/card_pile";
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
/** Horizontal gap between fanned waste cards. */
export const WASTE_FAN_OFFSET_X = 25;
/** Maximum number of waste cards to fan (show the edges of) in multi-draw mode. */
export const WASTE_MAX_FAN_CARDS = 3;

/**
 * Computes the uniform scale factor that fits the reference design onto the
 * viewport, accounting for the header overlay and never enlarging past 1.0.
 *
 * @param viewport The available drawable area.
 * @returns The scale factor in the range (0, 1].
 */
export function computeScale(viewport: Viewport): number {
  const screenWidth = viewport.width || DESIGN_WIDTH_PX;
  const screenHeight = (viewport.height || DESIGN_HEIGHT_PX) - HEADER_HEIGHT_PX;

  const scaleX = screenWidth / DESIGN_WIDTH_PX;
  const scaleY = screenHeight / (DESIGN_HEIGHT_PX - HEADER_HEIGHT_PX);
  let scale = Math.min(scaleX, scaleY);
  if (scale > 1.0) scale = 1.0;
  if (scale <= 0) scale = 1.0;
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

  const totalLayoutWidth = 7 * cardWidth + 6 * gapX;
  const screenWidth = viewport.width || DESIGN_WIDTH_PX;
  const paddingX = Math.max(
    LAYOUT_PADDING_X * scale,
    (screenWidth - totalLayoutWidth) / 2,
  );
  const paddingY = LAYOUT_PADDING_Y * scale;

  const columnX = (columnIndex: number): number =>
    paddingX + columnIndex * (cardWidth + gapX);

  const topRowY = HEADER_HEIGHT_PX + paddingY;
  const bottomRowY = HEADER_HEIGHT_PX + paddingY + cardHeight + gapY;

  const origins = new Map<string, Point>();
  origins.set("stock", { x: columnX(0), y: topRowY });
  origins.set("waste", { x: columnX(1), y: topRowY });
  for (let foundationIndex = 0; foundationIndex < 4; foundationIndex++) {
    origins.set(`foundation-${foundationIndex}`, { x: columnX(3 + foundationIndex), y: topRowY });
  }
  for (let tableauIndex = 0; tableauIndex < 7; tableauIndex++) {
    origins.set(`tableau-${tableauIndex}`, { x: columnX(tableauIndex), y: bottomRowY });
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
    currentY += card.faceUp
      ? TABLEAU_FACE_UP_OFFSET
      : TABLEAU_FACE_DOWN_OFFSET;
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
      offsets.push({ x: (cardIndex - fanStartIndex) * WASTE_FAN_OFFSET_X, y: 0 });
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

    geometries.push({ pileId: pile.id, x: origin.x, y: origin.y, width, height });
  }
  return geometries;
}
