import { tableLayout } from "@/engine/render/layout/table_layout";
import {
  TABLEAU_COUNT,
  fortyThievesZoneSpecs,
} from "./forty_thieves_zones";
import { DEFAULT_FORTY_THIEVES_VARIANT } from "./forty_thieves_rules";

/**
 * The Forty Thieves board: ten columns wide, with the stock and waste at the
 * left of the top row and the eight foundations filling the rest of it.
 *
 * Exactly ten slots across the top for a ten-column board, which no other game
 * here manages — Klondike has to leave a column clear for its waste fan, and
 * Eight Off has to grow to twelve to seat its cells. Drawing one card at a time
 * is what buys it.
 *
 * The slots are read from the zones rather than restated, so a pile cannot be
 * declared in one place and positioned in another. Which variant they come from
 * does not matter: the grab rule and the face-up rule vary with it, the grid
 * does not.
 */
export const FORTY_THIEVES_LAYOUT = tableLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: fortyThievesZoneSpecs(DEFAULT_FORTY_THIEVES_VARIANT).map(
    (zone) => zone.slot,
  ),
  // Columns run deep: a hundred and four cards against ten columns, with a
  // strict same-suit build in two of the three variants, means a lot of cards
  // land back on the tableau before they leave it. Fourteen deep at a 45-unit
  // gap reaches about 1364 from the top of the board, and at ten columns width
  // binds the scale up to about 1415 — so this is free.
  designHeightPx: 1400,
});
