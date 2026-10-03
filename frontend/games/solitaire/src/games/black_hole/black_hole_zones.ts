import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { foundationPileId, tableauPileId } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
} from "../common/zone_presets";
import {
  BLACK_HOLE_FOUNDATION_RULE,
  BlackHoleRole,
  BlackHoleVariant,
} from "./black_hole_rules";

/** The stable id of the single foundation. */
export const FOUNDATION_PILE_ID = foundationPileId(0);

/**
 * How far apart Black Hole's two rows are, in grid rows: enough for a fan of
 * three, which never grows, to end above the row beneath it.
 */
export const FAN_ROW_PITCH = 1.3;

/** Describes where a variant's piles sit. */
interface BlackHoleBoard {
  /** How many fans or columns there are. */
  readonly tableauCount: number;
  /** How many grid columns the board is wide. */
  readonly columns: number;
  /** How many grid rows the board is tall. */
  readonly rows: number;
  /** Where the foundation sits. */
  readonly foundation: { readonly column: number; readonly row: number };
  /** Returns where the fan or column at an index sits. */
  readonly tableauSlot: (index: number) => { column: number; row: number };
}

/** Black Hole's slots: nine to a row, the hole taking the top row's middle. */
const HOLE_SLOT = 4;

const BOARDS: Readonly<Record<BlackHoleVariant, BlackHoleBoard>> = {
  [BlackHoleVariant.BLACK_HOLE]: {
    tableauCount: 17,
    columns: 9,
    rows: 1 + FAN_ROW_PITCH,
    foundation: { column: HOLE_SLOT, row: 0 },
    tableauSlot: (index) => {
      const slot = index < HOLE_SLOT ? index : index + 1;
      return { column: slot % 9, row: Math.floor(slot / 9) * FAN_ROW_PITCH };
    },
  },
  [BlackHoleVariant.ALL_IN_A_ROW]: {
    tableauCount: 13,
    columns: 13,
    rows: 2,
    foundation: { column: 6, row: 0 },
    tableauSlot: (index) => ({ column: index, row: 1 }),
  },
};

/** Returns where a variant's piles sit. */
export function blackHoleBoard(variant: BlackHoleVariant): BlackHoleBoard {
  return BOARDS[variant];
}

/** Returns the zones of a board under a variant: the foundation, then the fans. */
export function blackHoleZoneSpecs(
  variant: BlackHoleVariant,
): readonly ZoneSpec[] {
  const board = BOARDS[variant];
  return [
    zoneAt({
      id: FOUNDATION_PILE_ID,
      role: BlackHoleRole.FOUNDATION,
      ...board.foundation,
      accept: BLACK_HOLE_FOUNDATION_RULE,
      layout: STACKED_PILE_LAYOUT,
      // A card played is played for good.
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: FOUNDATION_PLACEHOLDER,
    }),
    ...Array.from({ length: board.tableauCount }, (_, index) =>
      zoneAt({
        id: tableauPileId(index),
        role: BlackHoleRole.TABLEAU,
        ...board.tableauSlot(index),
        // Nothing builds on a fan: cards only leave it.
        accept: null,
        layout: OPEN_COLUMN_LAYOUT,
        grab: { kind: "top-only" },
        draggable: true,
        face: "always-up",
        backgroundKey: PLAIN_PLACEHOLDER,
      }),
    ),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { BlackHoleRole, BlackHoleVariant };
