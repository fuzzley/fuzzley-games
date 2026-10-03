import { PileBackgroundSpec } from "@/engine/render/view/table_view_state";
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
