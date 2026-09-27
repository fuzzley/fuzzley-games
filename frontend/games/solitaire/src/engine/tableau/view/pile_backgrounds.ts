import { PileBackgroundSpec } from "@/engine/render/view/table_view_state";
import { TableView } from "./table_view";

/** Returns the placeholder of every pile whose zone declares one, in pile order. */
export function pileBackgrounds(view: TableView): PileBackgroundSpec[] {
  return view.piles.flatMap((pile) => {
    const zone = view.zoneFor(pile.id);
    return zone?.backgroundKey
      ? [
          {
            pileId: pile.id,
            frame: zone.backgroundKey,
            actionable: zone.emptyIsActionable ?? false,
          },
        ]
      : [];
  });
}
