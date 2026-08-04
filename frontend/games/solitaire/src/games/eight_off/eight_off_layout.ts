import { boardLayout } from "../common/board_layout";
import { BOARD_COLUMN_COUNT, eightOffZoneSpecs } from "./eight_off_zones";

/**
 * The Eight Off board: twelve columns wide, with the eight cells and the four
 * foundations filling the top row and the eight tableau columns centred in the
 * bottom one.
 *
 * The board is wider than its own tableau, which looks like waste and is not.
 * Twelve slots have to fit across the top row whatever happens below it, so the
 * only real choice is whether the cells and foundations share one row or split
 * across two — and that choice decides which dimension binds the scale.
 *
 * At twelve wide, width binds: on any ordinary viewport the board runs out of
 * horizontal room long before vertical, so the height below the grid is slack.
 * The design height can grow from FreeCell's 1120 to around 1500 without moving
 * the scale at all, which is what makes deep columns free — however far a column
 * runs, the cards stay the same size.
 *
 * The alternative, eight columns over three rows, is the other way round:
 * narrower, so height binds, and every extra card of depth then shrinks the
 * cards directly. It wins on a fresh board of six-card columns and loses from
 * about a thirteen-card column onward — and columns in this game get deep,
 * because eight cells and a one-suit build mean a lot of cards land back on the
 * tableau before they leave it. Paying a little on the opening deal to stop
 * paying on every card after it is the better trade.
 */
export const EIGHT_OFF_LAYOUT = boardLayout({
  columns: BOARD_COLUMN_COUNT,
  rows: 2,
  zones: eightOffZoneSpecs(),
  // Room below the grid for a column rather deeper than the six it is dealt.
  // Free, per the note above: width is what binds the scale here.
  designHeightPx: 1200,
});
