import { tableLayout } from "@/engine/render/layout/table_layout";
import { TABLEAU_COUNT, easthavenZoneSpecs } from "./easthaven_zones";

/**
 * The Easthaven board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * Scorpion's and Spiderette's grid — Klondike's minus the waste, which is what a
 * seven-column game with no draw comes to.
 *
 * At seven columns height binds the scale rather than width, so every design
 * unit reserved below costs card size directly. The figure is a judgement about
 * how deep columns really get rather than a free allowance.
 */
export const EASTHAVEN_LAYOUT = tableLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: easthavenZoneSpecs().map((zone) => zone.slot),
  // Shallower than Spiderette's, because cards leave for the foundations
  // throughout rather than only as finished thirteen-card runs. Two buried cards
  // at 18 under nine showing at 45 reaches about 1000 from the top of the board;
  // this leaves room beyond that without giving up card size.
  designHeightPx: 1100,
});
