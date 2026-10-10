import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import {
  TableLayoutSpec,
  TableMetrics,
} from "@/engine/render/layout/table_layout";
import {
  PileBackgroundSpec,
  PileBackgroundView,
} from "@/engine/render/view/table_view_state";
import { TableView } from "./table_view";

/** Returns the placeholder of every pile that has one, in pile order. */
export function pileBackgrounds(view: TableView): PileBackgroundSpec[] {
  return view.piles.flatMap((pile) => {
    const frame = view.pileBackgroundKey(pile);
    return frame
      ? [
          {
            pileId: pile.id,
            frame,
            actionable: view.zoneFor(pile.id)?.emptyIsActionable ?? false,
          },
        ]
      : [];
  });
}

/**
 * Returns the artwork a pile's placeholder shows this frame: what its game
 * asks for, swapped for the grid's own if the grid has one for the pile.
 */
export function pileBackgroundFrame(
  view: TableView,
  pile: ReadonlyCardPile<PlayingCard>,
  grid: TableLayoutSpec,
): string | undefined {
  const artwork = view.pileBackgroundKey(pile);
  if (artwork === undefined) return undefined;
  return grid.pileBackgrounds?.[pile.id]?.(artwork) ?? artwork;
}

/**
 * Returns where every placed pile's placeholder is drawn this frame, with the
 * artwork and cursor it shows.
 */
export function pileBackgroundViews(
  view: TableView,
  metrics: TableMetrics,
): PileBackgroundView[] {
  const backgrounds: PileBackgroundView[] = [];

  for (const pile of view.piles) {
    const frame = pileBackgroundFrame(view, pile, metrics.layout);
    const origin = metrics.origins.get(pile.id);
    if (!frame || !origin) continue;

    backgrounds.push({
      pileId: pile.id,
      x: origin.x,
      y: origin.y,
      scale: metrics.scale,
      depth: depthFor(RenderLayer.PILE_BACKGROUND),
      frame,
      cursor: view.isEmptySlotActionable(pile) ? "pointer" : "default",
    });
  }

  return backgrounds;
}
