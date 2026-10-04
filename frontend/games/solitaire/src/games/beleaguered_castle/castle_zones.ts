import { PileLayout } from "@/engine/render/layout/pile_layout";
import { suitFoundation } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { foundationPileId, tableauPileId } from "../common/pile_ids";
import {
  STACKED_PILE_LAYOUT,
  WASTE_FAN_OFFSET_X,
} from "../common/pile_layouts";
import {
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
} from "../common/zone_presets";
import {
  CastleRole,
  CastleVariant,
  castleRowRule,
  castleRules,
} from "./castle_rules";

/**
 * How a row arranges its cards: fanned rightwards, every card's index in view,
 * however long it grows.
 *
 * Both wings fan to the right, so a left-wing row's free card faces the
 * foundations rather than the edge of the table, as a real castle's would.
 */
export const ROW_LAYOUT: PileLayout = {
  kind: "spread",
  direction: "right",
  gap: WASTE_FAN_OFFSET_X,
  maxVisible: Number.POSITIVE_INFINITY,
};

/** The grid column the foundations stand in, between the two wings. */
export const FOUNDATION_COLUMN = 4;

/** The grid column the right wing's rows start in. */
export const RIGHT_WING_COLUMN = FOUNDATION_COLUMN + 1;

/**
 * How many grid columns the board is wide: a wing has room for a fifteen-card
 * row before it reaches the foundations.
 */
export const BOARD_COLUMN_COUNT = RIGHT_WING_COLUMN + FOUNDATION_COLUMN;

/**
 * Returns the zones of a board under a variant: the foundations in a column
 * down the middle, then the rows, the left wing's from the top and then the
 * right wing's.
 *
 * With five rows a wing, as in Fortress, the four foundations are centred
 * beside them.
 */
export function castleZoneSpecs(variant: CastleVariant): readonly ZoneSpec[] {
  const { rowsPerWing } = castleRules(variant);
  const foundationRowOffset = (rowsPerWing - 4) / 2;

  return [
    ...Array.from({ length: 4 }, (_, index) =>
      zoneAt({
        id: foundationPileId(index),
        role: CastleRole.FOUNDATION,
        column: FOUNDATION_COLUMN,
        row: foundationRowOffset + index,
        accept: suitFoundation,
        layout: STACKED_PILE_LAYOUT,
        grab: { kind: "top-only" },
        draggable: true,
        face: "always-up",
        backgroundKey: FOUNDATION_PLACEHOLDER,
      }),
    ),
    ...Array.from({ length: rowsPerWing * 2 }, (_, index) =>
      zoneAt({
        id: tableauPileId(index),
        role: CastleRole.TABLEAU,
        column: index < rowsPerWing ? 0 : RIGHT_WING_COLUMN,
        row: index % rowsPerWing,
        accept: castleRowRule(variant),
        layout: ROW_LAYOUT,
        grab: { kind: "top-only" },
        draggable: true,
        face: "always-up",
        backgroundKey: PLAIN_PLACEHOLDER,
      }),
    ),
  ];
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { CastleRole, CastleVariant };
