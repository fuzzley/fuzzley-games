import { tableLayout } from "@/engine/render/layout/table_layout";
import { TABLEAU_COUNT, scorpionZoneSpecs } from "./scorpion_zones";

/**
 * The Scorpion board: seven columns, with the stock alone at the left of the top
 * row and the four foundations at the right of it.
 *
 * Klondike's grid exactly, minus the waste — which is what a seven-column game
 * with no draw comes to.
 */
export const SCORPION_LAYOUT = tableLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: scorpionZoneSpecs().map((zone) => zone.slot),
  // Columns run deeper than Klondike's: every card that leaves a column joins
  // another, so a well-played board collects most of the deck into two or three
  // stacks before the first run completes. Reserving more than the grid needs
  // keeps the longest of them on screen.
  designHeightPx: 1150,
});
