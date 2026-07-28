import { Point } from "@/engine/core/common/point";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardPile } from "@/engine/core/card/card_pile";
import {
  DropCandidate,
  computeDropGeometries,
  resolveDropTarget,
} from "@/engine/render/layout/drop_geometry";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import {
  computePileOrigins,
  computeScale,
} from "@/engine/render/layout/table_layout";
import {
  DragInteraction,
  PileGeometry,
  Viewport,
} from "@/engine/render/view/table_view_state";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
} from "@/engine/render/layout/card_metrics";
import { KLONDIKE_LAYOUT, klondikePileLayout } from "./klondike_layout";
import { SolitaireGame } from "./solitaire_game";

/** The size of a Klondike card in design units. */
const CARD_SIZE = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };

/**
 * Everything the render layer needs to place a Klondike board for one frame:
 * the scale, where each pile sits, and how each arranges its cards.
 *
 * Computed once per frame and handed to whoever needs it, so the scale and the
 * origins are derived in one place rather than recomputed by the view builder,
 * the drop resolver and the hit test independently — three answers that have to
 * agree and previously only agreed by construction.
 */
export interface KlondikeBoardMetrics {
  /** Design units to screen pixels. */
  readonly scale: number;
  /** Where each pile's top-left corner sits, in screen pixels. */
  readonly origins: ReadonlyMap<string, Point>;
  /** How a pile of the given role arranges its cards. */
  layoutFor(pile: CardPile<PlayingCard>): PileLayout;
}

/**
 * Measures the board for the given viewport.
 *
 * @param game The game, read for the draw mode that sets the waste fan.
 * @param viewport The available drawable area.
 */
export function measureKlondikeBoard(
  game: SolitaireGame,
  viewport: Viewport,
): KlondikeBoardMetrics {
  const scale = computeScale(KLONDIKE_LAYOUT, viewport);
  const origins = computePileOrigins(KLONDIKE_LAYOUT, viewport, scale);
  const drawCount = game.settings.drawCount;
  return {
    scale,
    origins,
    layoutFor: (pile) => klondikePileLayout(pile.role, drawCount),
  };
}

/**
 * The piles a dragged stack may be dropped onto: the foundations and the
 * tableaus. The stock and the waste are never destinations.
 */
export function klondikeDropCandidates(
  game: SolitaireGame,
  metrics: KlondikeBoardMetrics,
): DropCandidate[] {
  return [...game.foundations, ...game.tableaus].map((pile) => ({
    pile,
    layout: metrics.layoutFor(pile),
  }));
}

/**
 * Resolves the pile an in-flight drag would land on, as the pile's full drop
 * rectangle.
 *
 * The single answer to "where does this drag go": the view builder calls it
 * every frame to preview the target and the input manager calls it on release
 * to commit the move, so the border can never promise a pile the drop then
 * disagrees with.
 *
 * @param game The game model.
 * @param drag The active drag.
 * @param metrics The board measured for this frame.
 * @returns The target pile's geometry, or null when the drag overlaps no pile.
 */
export function resolveDragTarget(
  game: SolitaireGame,
  drag: DragInteraction,
  metrics: KlondikeBoardMetrics,
): PileGeometry | null {
  const geometries = computeDropGeometries(
    klondikeDropCandidates(game, metrics),
    metrics.origins,
    CARD_SIZE,
    metrics.scale,
  );
  return resolveDropTarget(
    {
      x: drag.primary.x,
      y: drag.primary.y,
      width: CARD_SIZE.width * metrics.scale,
      height: CARD_SIZE.height * metrics.scale,
    },
    geometries,
  );
}
