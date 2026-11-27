// The rules' numbers, the design's and its sketch's, in one file. The deals
// proven for every level were found on them, so a change to one asks for
// the levels to be certified again.

import type { ElementId } from "./catalog/elements";
import type { GoalId } from "./catalog/goals";
import type { MadeId } from "./catalog/specials";

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

/**
 * The order a wisp weighs what lies on a square in, each element's rank
 * in it from 0, as the sketch weighs them: a cage, a brick, whatever holds
 * a sleepyhead up, a burr, then dust.
 */
export const WISP_RANKS = {
  cage: 0,
  brick: 1,
  sleepyhead: 2,
  burr: 3,
  dust: 4,
} as const satisfies Readonly<Record<ElementId, number>>;

/** What a burred fuzzball is worth to a wisp, whatever the goals, as none counts burrs. */
export const WISP_BURR_WORTH = 60;

/** What a dusty square is worth to a wisp while the dust's goal is open, and a layer more for each layer on it. */
export const WISP_DUST_WORTH = 50;

/** What a brick is worth to a wisp while the bricks' goal is open, a layer less for each layer it has, so a thinner brick comes first. */
export const WISP_BRICK_WORTH = 80;

/** What a brick is worth to a wisp where no goal still asks for bricks. */
export const WISP_BRICK_WORTH_MET = 24;

/** What a square that holds a sleepyhead up is worth to a wisp while the sleepyheads' goal is open. */
export const WISP_SLEEPYHEAD_WORTH = 70;

/**
 * What the careful player weighs a game by, in the sketch's own decimals:
 * a cleared game by its moves left, and any other by the goals' work left,
 * what stands ready to go off and what is in the way.
 */
export const CAREFUL_WEIGHTS = {
  /** What a cleared game is worth, before its moves left. */
  cleared: 10000,
  /** What each move a cleared game has left adds. */
  moveLeft: 50,
  /** What each thing a goal still needs takes off, by the goal: a fuzzball to gather, a layer of dust, a brick, a cage or a sleepyhead. */
  goals: {
    gather: 1,
    dust: 2.5,
    brick: 3,
    cage: 5,
    sleepyhead: 14,
  } satisfies Readonly<Record<GoalId, number>>,
  /** What each piece ready to go off adds: the frizzball, or a special. */
  ready: {
    frizzball: 4,
    puffer: 2.5,
    wisp: 1.4,
    "dasher-across": 1.8,
    "dasher-down": 1.8,
  } satisfies Readonly<Record<MadeId, number>>,
  /** What each burr takes off. */
  burr: 1.6,
  /** What each of a brick's layers takes off, while a goal still needs bricks. */
  brickLayer: 1.2,
  /** What each row a sleepyhead has yet to sink takes off, while a goal still needs sleepyheads. */
  sleepyheadRow: 1.1,
} as const;
