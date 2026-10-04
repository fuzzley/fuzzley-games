import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt, zoneRow } from "@/engine/tableau/zone_builder";
import { DISCARD_PILE_ID } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import {
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  columnRow,
} from "../common/zone_presets";
import { NESTOR_PAIR_RULE, NestorRole } from "./nestor_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 8;

/** The number of reserve cards. */
export const RESERVE_COUNT = 4;

/** Returns the stable id of the reserve at the given index. */
export function reservePileId(index: number): string {
  return `reserve-${index}`;
}

export { DISCARD_PILE_ID };

/**
 * Returns the zones of a Nestor board: the reserve and the discard along the
 * top, and the columns beneath.
 *
 * The columns and the reserve have no `capacity`: a pair is made by dropping a
 * card on its partner, which the pile has to take before the move discards
 * both.
 */
export function nestorZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...zoneRow({
    count: RESERVE_COUNT,
    id: reservePileId,
    column: 0,
    row: 0,
    role: NestorRole.RESERVE,
    accept: NESTOR_PAIR_RULE,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    backgroundKey: PLAIN_PLACEHOLDER,
  }),
  zoneAt({
    id: DISCARD_PILE_ID,
    role: NestorRole.DISCARD,
    column: TABLEAU_COUNT - 1,
    row: 0,
    // Pairs reach it only as the consequence of a move.
    accept: null,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "none" },
    draggable: false,
    face: "always-up",
    // Circled, as a foundation is: emptying the board into it wins.
    backgroundKey: FOUNDATION_PLACEHOLDER,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: NestorRole.TABLEAU,
    accept: NESTOR_PAIR_RULE,
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { NestorRole };
