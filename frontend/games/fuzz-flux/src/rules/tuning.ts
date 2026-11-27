// The rules' numbers, the design's and its sketch's, in one file. The deals
// proven for every level were found on them, so a change to one asks for
// the levels to be certified again.

/** How many tries a deal makes at a board with no bunch standing and moves to make, a try a salt, before it gives up. */
export const DEAL_TRIES = 500;

/** How many moves a deal's opening board has at the least. */
export const OPENING_MOVES = 2;

/** How many orders a shuffle tries for a board with a move and no bunch, before it keeps the last. */
export const SHUFFLE_TRIES = 200;

/** The most waves a move plays before the board is let rest. */
export const MOST_WAVES = 60;

/** The most spare moves the encore sets off. */
export const MOST_ENCORE_MOVES = 12;

/** How many steps out a puffer strikes. */
export const PUFFER_REACH = 2;

/** How many steps out two puffers swapped together strike. */
export const TWO_PUFFERS_REACH = 4;

/** How many lines either side of its own a dasher and a puffer swapped together strike, across and down. */
export const DASHER_AND_PUFFER_SPREAD = 1;

/** How many wisps two wisps swapped together send flying, each to a square of its own. */
export const TWO_WISPS_FLIGHTS = 3;

/** What a fuzzball of a kind a goal still gathers is worth to a wisp choosing where to fly, where no element weighs its square. */
export const WISP_WANTED_WORTH = 40;

/** What any other fuzzball is worth to a wisp. */
export const WISP_FUZZBALL_WORTH = 10;

/** How many values the draw takes that puts one of a wisp's equally good squares first. */
export const WISP_TIE_DRAWS = 10;
