import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { zoneAt } from "@/engine/tableau/zones/zone_builder";
import { DISCARD_PILE_ID, STOCK_PILE_ID } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  CLOSED_STOCK_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  columnRow,
  stockZone,
} from "../common/zone_presets";
import {
  ACES_UP_DISCARD_RULE,
  AcesUpRole,
  AcesUpSpaces,
  acesUpTableauRule,
} from "./aces_up_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 4;

/** How many grid columns the board is wide: stock, columns, then discard. */
export const BOARD_COLUMN_COUNT = TABLEAU_COUNT + 2;

export { DISCARD_PILE_ID, STOCK_PILE_ID };

/** Returns the zones of an Aces Up board, all in one row. */
export function acesUpZoneSpecs(spaces: AcesUpSpaces): readonly ZoneSpec[] {
  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: AcesUpRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // No `emptyIsActionable`: the stock is dealt once.
      backgroundKey: CLOSED_STOCK_PLACEHOLDER,
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 1,
      row: 0,
      role: AcesUpRole.TABLEAU,
      accept: acesUpTableauRule(spaces),
      grab: { kind: "top-only" },
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
    zoneAt({
      id: DISCARD_PILE_ID,
      role: AcesUpRole.DISCARD,
      column: TABLEAU_COUNT + 1,
      row: 0,
      accept: ACES_UP_DISCARD_RULE,
      layout: STACKED_PILE_LAYOUT,
      // A beaten card is out of the game.
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      // Circled, as a foundation is: emptying the columns into it wins.
      backgroundKey: FOUNDATION_PLACEHOLDER,
    }),
  ];
}

/** Re-exported: the roles live with the rules that use them. */
export { AcesUpRole };
