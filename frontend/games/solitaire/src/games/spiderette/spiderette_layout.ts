import { boardLayout } from "../common/board_layout";
import { TABLEAU_COUNT, spideretteZoneSpecs } from "./spiderette_zones";

/**
 * The Spiderette board: seven columns, with the stock alone at the left of the
 * top row and the four foundations at the right of it.
 *
 * Scorpion's grid, which is Klondike's minus the waste — what a seven-column
 * game with no draw comes to. Both variants share it, since they differ only in
 * how the cards are dealt onto it.
 *
 * At seven columns height binds the scale rather than width, unlike the ten- and
 * thirteen-column boards: every design unit reserved below costs card size
 * directly, so the figure below is a judgement about how deep columns really get
 * rather than a free allowance.
 */
export const SPIDERETTE_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: spideretteZoneSpecs(),
  // Scorpion's reservation, for the same reason: every card that leaves a column
  // joins another, so a board collects into two or three deep stacks before the
  // first run completes. Six buried cards at 18 and eight showing at 45 reaches
  // about 1100 from the top of the board.
  designHeightPx: 1150,
});
