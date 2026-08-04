import { boardLayout } from "../common/board_layout";
import { DEFAULT_YUKON_VARIANT } from "./yukon_rules";
import { TABLEAU_COUNT, yukonZoneSpecs } from "./yukon_zones";

/**
 * The Yukon board: four foundations at the right of the top row, seven columns
 * filling the bottom, and nothing at all at the top left.
 *
 * The foundations sit where Klondike puts them rather than being slid across to
 * close the gap. The empty corner is the point: a player reading the board sees
 * where the stock and the waste would be and finds them absent, which is the
 * first thing to know about this game.
 *
 * The slots come from the zone specs so a pile cannot be declared in one place
 * and positioned in another. Which variant they are read from does not matter —
 * the three differ only in what a column accepts — but the default is passed
 * explicitly rather than left to a fallback, so the choice is visible.
 */
export const YUKON_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: yukonZoneSpecs(DEFAULT_YUKON_VARIANT),
  // Taller than any other board here, because the last column is eleven cards
  // deep from the first deal: six packed face-down plus five fanned face-up,
  // and it only grows as cards are moved onto it.
  designHeightPx: 1150,
});
