import type { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import type { PlayingCard } from "@/engine/core/card/playing_card";
import {
  type PileLayout,
  fitFanDown,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import type { TableMetrics } from "@/engine/render/layout/table_metrics";
import type { TableView } from "./table_view";

/** How a pile with no zone arranges its cards. */
const STACKED: PileLayout = { kind: "stacked" };

/**
 * Returns how a pile arranges its cards this frame, on the grid the board is
 * measured on.
 *
 * Starts from the pile's zone, takes the grid's override for the pile if it
 * has one, turns it around on a mirrored grid, and fits a downward fan to the
 * room below the pile. The drawn cards, the drop target and the stack in hand
 * all read this, so they agree on where every card is.
 */
export function pileArrangement(
  view: TableView,
  pile: ReadonlyCardPile<PlayingCard>,
  metrics: TableMetrics,
): PileLayout {
  const grid = metrics.layout;
  const own = view.zoneFor(pile.id)?.layout ?? STACKED;
  const chosen = grid.pileLayouts?.[pile.id]?.(own) ?? own;
  const facing = grid.mirrored ? mirrorPileLayout(chosen) : chosen;

  const room = metrics.rooms.get(pile.id);
  if (!grid.fanFit || facing.kind !== "fan-down" || room === undefined) {
    return facing;
  }
  return fitFanDown(
    facing,
    pile.getCards(),
    room,
    grid.cardSize.height,
    grid.fanFit,
  );
}
