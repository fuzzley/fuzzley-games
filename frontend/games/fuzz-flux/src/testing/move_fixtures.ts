// Moves played by hand: a record of each kind of event a move plays, each
// with the board it is played on, so the view, the scene and the shell can
// play a move before the rules can. Each record is what the design's
// sketch makes of its board and swap, written in the record's words, and
// its game is `gameFrom()`'s of its picture and options.

import type { Goal } from "../rules/catalog/goals";
import type { EncoreRecord, Hit, MoveRecord } from "../rules/move/record";
import type { BoardPicture, GameOptions } from "./board_picture";

/** Describes a move played by hand, on the game `gameFrom()` makes of its picture and options. */
export interface MoveFixture {
  readonly picture: BoardPicture;
  readonly options: GameOptions;
  readonly record: MoveRecord;
}

/** Describes the encore played by hand, on a game whose goals are met. */
export interface EncoreFixture {
  readonly picture: BoardPicture;
  readonly options: GameOptions;
  readonly record: EncoreRecord;
}

/** Describes where a hit came from, as a record says of every hit a bunch or a blast makes. */
type Struck = Pick<
  Extract<Hit, { what: "gathered" }>,
  "square" | "step" | "blast"
>;

/** A goal no fixture's move meets, so that its game plays on. */
const PLAYING: Goal = { what: "gather", kind: "pink", count: 30 };

/** Returns where a hit on a square in a bunch came from. */
function inBunch(square: number): Struck {
  return { square, step: 0, blast: null };
}

/** Returns where a hit on a square beside a bunch came from. */
function besideBunch(square: number): Struck {
  return { square, step: 1, blast: null };
}

/** Returns where a hit on a square a blast struck came from: the blast, by its place in the wave's, and the step it struck at. */
function byBlast(square: number, step: number, blast: number): Struck {
  return { square, step, blast };
}

/** Each move played by hand, by the event it shows. */
export const MOVE_FIXTURES = {
  /** A swap that makes no bunch, refused. */
  refused: {
    picture: { pieces: ["bgb", "rbr", "avp"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 6, to: 7, refused: true },
      waves: [],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch of 3 across, and the board falling in after it. */
  bunch: {
    picture: { pieces: ["bgb", "rbr", "avp"] },
    options: { goals: [PLAYING], seed: 3 },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** 4 down, made by a swap across, which leaves a dasher across. */
  dasherAcrossMade: {
    picture: { pieces: ["brg", "bav", "gbp", "brv"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 6, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [
            {
              squares: [0, 3, 6, 9],
              kind: "blue",
              makes: { what: "dasher-across", square: 6, piece: 8 },
            },
          ],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            {
              what: "born",
              square: 6,
              piece: 8,
              made: "dasher-across",
              kind: "blue",
            },
            { ...inBunch(9), what: "gathered", piece: 10, kind: "blue" },
          ],
          falls: [
            { piece: 8, kind: "blue", from: 6, path: [9], lane: 0 },
            { piece: 13, kind: "pink", from: null, path: [6], lane: 0 },
            { piece: 14, kind: "amber", from: null, path: [3], lane: 0 },
            { piece: 15, kind: "pink", from: null, path: [0], lane: 0 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** 4 across, made by a swap down, which leaves a dasher down. */
  dasherDownMade: {
    picture: { pieces: ["bbgb", "rpba", "avgp"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 2, to: 6, refused: false },
      waves: [
        {
          number: 1,
          bunches: [
            {
              squares: [0, 1, 2, 3],
              kind: "blue",
              makes: { what: "dasher-down", square: 2, piece: 7 },
            },
          ],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 2, kind: "blue" },
            {
              what: "born",
              square: 2,
              piece: 7,
              made: "dasher-down",
              kind: "blue",
            },
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
          ],
          falls: [
            { piece: 13, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 14, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 15, kind: "violet", from: null, path: [3], lane: 3 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** 5 in an L, which leaves a puffer. */
  pufferMade: {
    picture: { pieces: ["bgr", "bav", "gbb", "bpa"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 6, to: 9, refused: false },
      waves: [
        {
          number: 1,
          bunches: [
            {
              squares: [0, 3, 6, 7, 8],
              kind: "blue",
              makes: { what: "puffer", square: 6, piece: 10 },
            },
          ],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            {
              what: "born",
              square: 6,
              piece: 10,
              made: "puffer",
              kind: "blue",
            },
            { ...inBunch(7), what: "gathered", piece: 8, kind: "blue" },
            { ...inBunch(8), what: "gathered", piece: 9, kind: "blue" },
          ],
          falls: [
            { piece: 13, kind: "pink", from: null, path: [3], lane: 0 },
            { piece: 14, kind: "amber", from: null, path: [0], lane: 0 },
            { piece: 5, kind: "amber", from: 4, path: [7], lane: 1 },
            { piece: 2, kind: "green", from: 1, path: [4], lane: 1 },
            { piece: 15, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 6, kind: "violet", from: 5, path: [8], lane: 2 },
            { piece: 3, kind: "red", from: 2, path: [5], lane: 2 },
            { piece: 16, kind: "violet", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A square of 4, which leaves a wisp. */
  wispMade: {
    picture: { pieces: ["bbr", "bga", "gbp"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 4, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [
            {
              squares: [0, 1, 3, 4],
              kind: "blue",
              makes: { what: "wisp", square: 4, piece: 8 },
            },
          ],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 2, kind: "blue" },
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            { what: "born", square: 4, piece: 8, made: "wisp", kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [3], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [0], lane: 0 },
            { piece: 12, kind: "amber", from: null, path: [1], lane: 1 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** 5 in a line, which leaves the frizzball. */
  frizzballMade: {
    picture: { pieces: ["bbgbb", "rpbav", "avrpg"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 2, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [
            {
              squares: [0, 1, 2, 3, 4],
              kind: "blue",
              makes: { what: "frizzball", square: 2, piece: 8 },
            },
          ],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 2, kind: "blue" },
            {
              what: "born",
              square: 2,
              piece: 8,
              made: "frizzball",
              kind: "blue",
            },
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            { ...inBunch(4), what: "gathered", piece: 5, kind: "blue" },
          ],
          falls: [
            { piece: 16, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 17, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 18, kind: "violet", from: null, path: [3], lane: 3 },
            { piece: 19, kind: "green", from: null, path: [4], lane: 4 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A dasher across swapped, going off where it lands. */
  dasherGoesOff: {
    picture: { pieces: ["bra", "gvp", "rab"], marks: ["...", ".-.", "..."] },
    options: { goals: [PLAYING], seed: 3 },
    record: {
      swap: { from: 4, to: 1, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "dasher-across",
              square: 1,
              piece: 5,
              kind: "violet",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 1, step: 0 },
                { square: 0, step: 1 },
                { square: 2, step: 1 },
              ],
            },
          ],
          hits: [
            { ...byBlast(0, 1, 0), what: "gathered", piece: 1, kind: "blue" },
            { ...byBlast(2, 1, 0), what: "gathered", piece: 3, kind: "amber" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A puffer swapped, going off where it lands. */
  pufferGoesOff: {
    picture: {
      pieces: ["brag", "gvpb", "rabv", "pgra"],
      marks: ["....", ".o..", "....", "...."],
    },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 5, to: 1, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "puffer",
              square: 1,
              piece: 6,
              kind: "violet",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 1, step: 0 },
                { square: 0, step: 1 },
                { square: 2, step: 1 },
                { square: 5, step: 1 },
                { square: 3, step: 2 },
                { square: 4, step: 2 },
                { square: 6, step: 2 },
                { square: 9, step: 2 },
              ],
            },
          ],
          hits: [
            { ...byBlast(0, 1, 0), what: "gathered", piece: 1, kind: "blue" },
            { ...byBlast(2, 1, 0), what: "gathered", piece: 3, kind: "amber" },
            { ...byBlast(5, 1, 0), what: "gathered", piece: 2, kind: "red" },
            { ...byBlast(3, 2, 0), what: "gathered", piece: 4, kind: "green" },
            { ...byBlast(4, 2, 0), what: "gathered", piece: 5, kind: "green" },
            { ...byBlast(6, 2, 0), what: "gathered", piece: 7, kind: "pink" },
            { ...byBlast(9, 2, 0), what: "gathered", piece: 10, kind: "amber" },
          ],
          falls: [
            { piece: 17, kind: "pink", from: null, path: [4], lane: 0 },
            { piece: 18, kind: "amber", from: null, path: [0], lane: 0 },
            { piece: 19, kind: "amber", from: null, path: [9], lane: 1 },
            { piece: 20, kind: "pink", from: null, path: [5], lane: 1 },
            { piece: 21, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 22, kind: "violet", from: null, path: [6], lane: 2 },
            { piece: 23, kind: "amber", from: null, path: [2], lane: 2 },
            { piece: 24, kind: "violet", from: null, path: [3], lane: 3 },
          ],
          goalsLeft: [29],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A wisp swapped, flying to a fuzzball its goal wants. */
  wispGoesOff: {
    picture: { pieces: ["bra", "gvp", "rab"], marks: ["...", ".w.", "..."] },
    options: { goals: [{ what: "gather", kind: "amber", count: 5 }], seed: 26 },
    record: {
      swap: { from: 4, to: 1, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "wisp",
              square: 1,
              piece: 5,
              kind: "violet",
              setOffBy: null,
              wait: 0,
              strikes: [{ square: 7, step: 1 }],
            },
          ],
          hits: [
            { ...byBlast(7, 1, 0), what: "gathered", piece: 8, kind: "amber" },
          ],
          falls: [
            { piece: 2, kind: "red", from: 4, path: [7], lane: 1 },
            { piece: 10, kind: "blue", from: null, path: [4], lane: 1 },
            { piece: 11, kind: "blue", from: null, path: [1], lane: 1 },
          ],
          goalsLeft: [4],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** The frizzball swapped with a fuzzball, gathering every one of its kind. */
  frizzballGoesOff: {
    picture: { pieces: ["bra", "gfp", "rab"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 4, to: 1, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "frizzball",
              square: 1,
              piece: 5,
              kind: "red",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 4, step: 1 },
                { square: 6, step: 2 },
              ],
            },
          ],
          hits: [
            { ...byBlast(4, 1, 0), what: "gathered", piece: 2, kind: "red" },
            { ...byBlast(6, 2, 0), what: "gathered", piece: 7, kind: "red" },
          ],
          falls: [
            { piece: 4, kind: "green", from: 3, path: [6], lane: 0 },
            { piece: 1, kind: "blue", from: 0, path: [3], lane: 0 },
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [4], lane: 1 },
            { piece: 12, kind: "pink", from: null, path: [1], lane: 1 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** Two dashers swapped together, going off as one. */
  twoDashers: {
    picture: { pieces: ["bra", "gvp", "rab"], marks: ["...", "-|.", "..."] },
    options: { goals: [PLAYING], seed: 3 },
    record: {
      swap: { from: 3, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "two-dashers",
              square: 4,
              piece: 4,
              kind: "green",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 4, step: 0 },
                { square: 1, step: 1 },
                { square: 3, step: 1 },
                { square: 5, step: 1 },
                { square: 7, step: 1 },
              ],
            },
          ],
          hits: [
            { ...byBlast(1, 1, 0), what: "gathered", piece: 2, kind: "red" },
            { ...byBlast(5, 1, 0), what: "gathered", piece: 6, kind: "pink" },
            { ...byBlast(7, 1, 0), what: "gathered", piece: 8, kind: "amber" },
          ],
          falls: [
            { piece: 1, kind: "blue", from: 0, path: [3], lane: 0 },
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [7], lane: 1 },
            { piece: 12, kind: "blue", from: null, path: [4], lane: 1 },
            { piece: 13, kind: "violet", from: null, path: [1], lane: 1 },
            { piece: 3, kind: "amber", from: 2, path: [5], lane: 2 },
            { piece: 14, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [29],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A dasher going off along a row with a puffer in it, which it sets off. */
  dasherSetsOffPuffer: {
    picture: {
      pieces: ["brag", "gvpb", "rabv"],
      marks: ["...o", ".-..", "...."],
    },
    options: { goals: [PLAYING], seed: 2 },
    record: {
      swap: { from: 5, to: 1, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "dasher-across",
              square: 1,
              piece: 6,
              kind: "violet",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 1, step: 0 },
                { square: 0, step: 1 },
                { square: 2, step: 1 },
                { square: 3, step: 2 },
              ],
            },
            {
              what: "puffer",
              square: 3,
              piece: 4,
              kind: "green",
              setOffBy: 0,
              wait: 2,
              strikes: [
                { square: 3, step: 0 },
                { square: 2, step: 1 },
                { square: 7, step: 1 },
                { square: 1, step: 2 },
                { square: 6, step: 2 },
                { square: 11, step: 2 },
              ],
            },
          ],
          hits: [
            { ...byBlast(0, 1, 0), what: "gathered", piece: 1, kind: "blue" },
            { ...byBlast(2, 1, 0), what: "gathered", piece: 3, kind: "amber" },
            { ...byBlast(3, 2, 0), what: "gathered", piece: 4, kind: "green" },
            { ...byBlast(7, 1, 1), what: "gathered", piece: 8, kind: "blue" },
            { ...byBlast(6, 2, 1), what: "gathered", piece: 7, kind: "pink" },
            {
              ...byBlast(11, 2, 1),
              what: "gathered",
              piece: 12,
              kind: "violet",
            },
          ],
          falls: [
            { piece: 13, kind: "amber", from: null, path: [0], lane: 0 },
            { piece: 14, kind: "pink", from: null, path: [1], lane: 1 },
            { piece: 15, kind: "amber", from: null, path: [6], lane: 2 },
            { piece: 16, kind: "amber", from: null, path: [2], lane: 2 },
            { piece: 17, kind: "blue", from: null, path: [11], lane: 3 },
            { piece: 18, kind: "green", from: null, path: [7], lane: 3 },
            { piece: 19, kind: "pink", from: null, path: [3], lane: 3 },
          ],
          goalsLeft: [29],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A wisp and a dasher swapped together, the wisp carrying the dasher to a square, where it goes off. */
  wispCarriesDasher: {
    picture: {
      pieces: ["brag", "gvpb", "rabv"],
      marks: ["....", "w-..", "...."],
    },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 4, to: 5, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "wisp-and-dasher-across",
              square: 5,
              piece: 5,
              kind: "green",
              setOffBy: null,
              wait: 0,
              strikes: [{ square: 6, step: 1 }],
            },
            {
              what: "dasher-across",
              square: 6,
              piece: null,
              kind: "green",
              setOffBy: 0,
              wait: 1,
              strikes: [
                { square: 6, step: 0 },
                { square: 5, step: 1 },
                { square: 7, step: 1 },
                { square: 4, step: 2 },
              ],
            },
          ],
          hits: [
            { ...byBlast(6, 0, 1), what: "gathered", piece: 7, kind: "pink" },
            { ...byBlast(7, 1, 1), what: "gathered", piece: 8, kind: "blue" },
          ],
          falls: [
            { piece: 1, kind: "blue", from: 0, path: [4], lane: 0 },
            { piece: 13, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 2, kind: "red", from: 1, path: [5], lane: 1 },
            { piece: 14, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 3, kind: "amber", from: 2, path: [6], lane: 2 },
            { piece: 15, kind: "violet", from: null, path: [2], lane: 2 },
            { piece: 4, kind: "green", from: 3, path: [7], lane: 3 },
            { piece: 16, kind: "violet", from: null, path: [3], lane: 3 },
          ],
          goalsLeft: [29],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch whose fall lines up the next, a second wave. */
  twoWaves: {
    picture: { pieces: ["rag", "bvp", "bpv", "rbr"] },
    options: { goals: [PLAYING] },
    record: {
      swap: { from: 9, to: 10, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [3, 6, 9], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            { ...inBunch(6), what: "gathered", piece: 7, kind: "blue" },
            { ...inBunch(9), what: "gathered", piece: 11, kind: "blue" },
          ],
          falls: [
            { piece: 1, kind: "red", from: 0, path: [9], lane: 0 },
            { piece: 13, kind: "pink", from: null, path: [6], lane: 0 },
            { piece: 14, kind: "amber", from: null, path: [3], lane: 0 },
            { piece: 15, kind: "pink", from: null, path: [0], lane: 0 },
          ],
          goalsLeft: [30],
        },
        {
          number: 2,
          bunches: [{ squares: [9, 10, 11], kind: "red", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(9), what: "gathered", piece: 1, kind: "red" },
            { ...inBunch(10), what: "gathered", piece: 10, kind: "red" },
            { ...inBunch(11), what: "gathered", piece: 12, kind: "red" },
          ],
          falls: [
            { piece: 13, kind: "pink", from: 6, path: [9], lane: 0 },
            { piece: 14, kind: "amber", from: 3, path: [6], lane: 0 },
            { piece: 15, kind: "pink", from: 0, path: [3], lane: 0 },
            { piece: 16, kind: "green", from: null, path: [0], lane: 0 },
            { piece: 8, kind: "pink", from: 7, path: [10], lane: 1 },
            { piece: 5, kind: "violet", from: 4, path: [7], lane: 1 },
            { piece: 2, kind: "amber", from: 1, path: [4], lane: 1 },
            { piece: 17, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 9, kind: "violet", from: 8, path: [11], lane: 2 },
            { piece: 6, kind: "pink", from: 5, path: [8], lane: 2 },
            { piece: 3, kind: "green", from: 2, path: [5], lane: 2 },
            { piece: 18, kind: "violet", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch beside a brick, which it knocks, and a fuzzball let in that rolls in under it. */
  rollAndRefill: {
    picture: { pieces: ["a2g", "bvb", "rbp"] },
    options: { goals: [PLAYING], seed: 2 },
    record: {
      swap: { from: 4, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [3, 4, 5], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            { ...inBunch(4), what: "gathered", piece: 8, kind: "blue" },
            { ...inBunch(5), what: "gathered", piece: 6, kind: "blue" },
            { ...besideBunch(1), what: "knocked", piece: 2, layersLeft: 1 },
          ],
          falls: [
            { piece: 1, kind: "amber", from: 0, path: [3], lane: 0 },
            { piece: 10, kind: "amber", from: null, path: [0, 4], lane: 0 },
            { piece: 3, kind: "green", from: 2, path: [5], lane: 2 },
            { piece: 11, kind: "amber", from: null, path: [2], lane: 2 },
            { piece: 12, kind: "pink", from: null, path: [0], lane: 0 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch on dust, sweeping a layer off each square. */
  dustSwept: {
    picture: { pieces: ["bgb", "rbr", "avp"], dust: ["212", "000", "000"] },
    options: { goals: [PLAYING, { what: "dust" }], seed: 3 },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(0), what: "dusted", layersLeft: 1 },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(1), what: "dusted", layersLeft: 0 },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
            { ...inBunch(2), what: "dusted", layersLeft: 1 },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30, 2],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch beside a brick of one layer, breaking it. */
  brickBroken: {
    picture: { pieces: ["a1g", "bvb", "rbp"] },
    options: { goals: [PLAYING, { what: "brick" }], seed: 13 },
    record: {
      swap: { from: 4, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [3, 4, 5], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(3), what: "gathered", piece: 4, kind: "blue" },
            { ...inBunch(4), what: "gathered", piece: 8, kind: "blue" },
            { ...inBunch(5), what: "gathered", piece: 6, kind: "blue" },
            { ...besideBunch(1), what: "broken", piece: 2 },
          ],
          falls: [
            { piece: 1, kind: "amber", from: 0, path: [3], lane: 0 },
            { piece: 10, kind: "violet", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "violet", from: null, path: [4], lane: 1 },
            { piece: 12, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 3, kind: "green", from: 2, path: [5], lane: 2 },
            { piece: 13, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30, 0],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A dasher going off down a caged fuzzball's column, opening its cage. */
  cageOpened: {
    picture: { pieces: ["bRa", "gvp", "rab"], marks: ["...", "|..", "..."] },
    options: { goals: [PLAYING, { what: "cage" }], seed: 26 },
    record: {
      swap: { from: 3, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "dasher-down",
              square: 4,
              piece: 4,
              kind: "green",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 4, step: 0 },
                { square: 1, step: 1 },
                { square: 7, step: 1 },
              ],
            },
          ],
          hits: [
            { ...byBlast(1, 1, 0), what: "uncaged", piece: 2 },
            { ...byBlast(7, 1, 0), what: "gathered", piece: 8, kind: "amber" },
          ],
          falls: [
            { piece: 2, kind: "red", from: 1, path: [7], lane: 1 },
            { piece: 10, kind: "blue", from: null, path: [4], lane: 1 },
            { piece: 11, kind: "blue", from: null, path: [1], lane: 1 },
          ],
          goalsLeft: [30, 0],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch that takes in a caged fuzzball, gathering it. */
  cageBunched: {
    picture: { pieces: ["bBr", "rvb", "avp"] },
    options: { goals: [PLAYING, { what: "cage" }] },
    record: {
      swap: { from: 2, to: 5, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 2, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 6, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "violet", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30, 0],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch beside a burred fuzzball, brushing its burr off. */
  burrBrushedOff: {
    picture: { pieces: ["bgb", "rbr", "avp"], marks: ["...", "*..", "..."] },
    options: { goals: [PLAYING], seed: 3 },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
            { ...besideBunch(3), what: "unburred", piece: 4 },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A bunch under a sleepyhead, which falls to its bed and leaves. */
  sleepyheadBedded: {
    picture: { pieces: ["gzp", "abv", "vbg", "brb"] },
    options: { goals: [PLAYING, { what: "sleepyhead" }], seed: 3 },
    record: {
      swap: { from: 10, to: 9, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [4, 7, 10], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(4), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(7), what: "gathered", piece: 8, kind: "blue" },
            { ...inBunch(10), what: "gathered", piece: 10, kind: "blue" },
            { what: "bedded", square: 10, piece: 2 },
          ],
          falls: [
            { piece: 2, kind: null, from: 1, path: [10], lane: 1 },
            { piece: 13, kind: "red", from: null, path: [7, 10], lane: 1 },
            { piece: 14, kind: "blue", from: null, path: [4, 7], lane: 1 },
            { piece: 15, kind: "violet", from: null, path: [1, 4], lane: 1 },
            { piece: 16, kind: "blue", from: null, path: [1], lane: 1 },
          ],
          goalsLeft: [30, 0],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A dasher going off along a sleepyhead's row, which ruffles it. */
  sleepyheadRuffled: {
    picture: {
      pieces: ["brag", "gzpb", "rvbg", "agrb"],
      marks: ["....", "....", "-...", "...."],
    },
    options: { goals: [PLAYING], seed: 24 },
    record: {
      swap: { from: 8, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [],
          blasts: [
            {
              what: "dasher-across",
              square: 4,
              piece: 9,
              kind: "red",
              setOffBy: null,
              wait: 0,
              strikes: [
                { square: 4, step: 0 },
                { square: 5, step: 1 },
                { square: 6, step: 2 },
                { square: 7, step: 3 },
              ],
            },
          ],
          hits: [
            { ...byBlast(5, 1, 0), what: "ruffled", piece: 6 },
            { ...byBlast(6, 2, 0), what: "gathered", piece: 7, kind: "pink" },
            { ...byBlast(7, 3, 0), what: "gathered", piece: 8, kind: "blue" },
          ],
          falls: [
            { piece: 1, kind: "blue", from: 0, path: [4], lane: 0 },
            { piece: 17, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 3, kind: "amber", from: 2, path: [6], lane: 2 },
            { piece: 18, kind: "green", from: null, path: [2], lane: 2 },
            { piece: 4, kind: "green", from: 3, path: [7], lane: 3 },
            { piece: 19, kind: "red", from: null, path: [3], lane: 3 },
          ],
          goalsLeft: [29],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A move that brushes no burr off, after which a burr spreads. */
  burrSpreads: {
    picture: { pieces: ["bgb", "rbr", "avp"], marks: ["...", "...", "*.."] },
    options: { goals: [PLAYING], seed: 3 },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "red", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "amber", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: { from: 6, to: 3, piece: 4 },
      gust: null,
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A move after which the wind turns, and a fuzzball falls the new way into the square a brick holds open. */
  windTurns: {
    picture: { pieces: ["_2_", "brb", "abg"] },
    options: {
      wind: { every: 1, quarters: 1, wait: 1 },
      goals: [PLAYING],
      seed: 2,
    },
    record: {
      swap: { from: 4, to: 7, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [3, 4, 5], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(3), what: "gathered", piece: 2, kind: "blue" },
            { ...inBunch(4), what: "gathered", piece: 6, kind: "blue" },
            { ...inBunch(5), what: "gathered", piece: 4, kind: "blue" },
            { ...besideBunch(1), what: "knocked", piece: 1, layersLeft: 1 },
          ],
          falls: [
            { piece: 8, kind: "amber", from: null, path: [3], lane: 0 },
            { piece: 9, kind: "amber", from: null, path: [5], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: {
        turns: 1,
        waves: [
          {
            number: 0,
            bunches: [],
            blasts: [],
            hits: [],
            falls: [
              { piece: 8, kind: "amber", from: 3, path: [4], lane: 1 },
              { piece: 10, kind: "green", from: null, path: [3], lane: 1 },
            ],
            goalsLeft: [30],
          },
        ],
      },
      shuffle: null,
      outcome: "playing",
    },
  },
  /** A move that leaves no move, after which the board is shuffled into one with a move. */
  shuffle: {
    picture: { pieces: ["bgb", "rbr", "aga"] },
    options: {
      kinds: ["blue", "red", "amber", "green"],
      goals: [{ what: "gather", kind: "green", count: 30 }],
      seed: 15,
    },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "amber", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "red", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [30],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: {
        moves: [
          { piece: 10, from: 0, to: 1 },
          { piece: 11, from: 1, to: 0 },
          { piece: 12, from: 2, to: 8 },
          { piece: 4, from: 3, to: 5 },
          { piece: 2, from: 4, to: 2 },
          { piece: 6, from: 5, to: 6 },
          { piece: 7, from: 6, to: 3 },
          { piece: 8, from: 7, to: 4 },
          { piece: 9, from: 8, to: 7 },
        ],
      },
      outcome: "playing",
    },
  },
  /** A move that meets the level's last goal. */
  cleared: {
    picture: { pieces: ["bgb", "rbr", "avp"] },
    options: { goals: [{ what: "gather", kind: "blue", count: 3 }] },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "violet", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [0],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "cleared",
    },
  },
  /** A level's last move, which meets no goal. */
  outOfMoves: {
    picture: { pieces: ["bgb", "rbr", "avp"] },
    options: {
      goals: [{ what: "gather", kind: "blue", count: 9 }],
      movesLeft: 1,
    },
    record: {
      swap: { from: 1, to: 4, refused: false },
      waves: [
        {
          number: 1,
          bunches: [{ squares: [0, 1, 2], kind: "blue", makes: null }],
          blasts: [],
          hits: [
            { ...inBunch(0), what: "gathered", piece: 1, kind: "blue" },
            { ...inBunch(1), what: "gathered", piece: 5, kind: "blue" },
            { ...inBunch(2), what: "gathered", piece: 3, kind: "blue" },
          ],
          falls: [
            { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
            { piece: 11, kind: "amber", from: null, path: [1], lane: 1 },
            { piece: 12, kind: "violet", from: null, path: [2], lane: 2 },
          ],
          goalsLeft: [6],
        },
      ],
      burrSpread: null,
      gust: null,
      shuffle: null,
      outcome: "over",
    },
  },
} as const satisfies Readonly<Record<string, MoveFixture>>;

/** The encore of two spare moves, each a fuzzball made special and set off. */
export const ENCORE_FIXTURE: EncoreFixture = {
  picture: { pieces: ["bgb", "rbr", "avp"] },
  options: {
    goals: [{ what: "gather", kind: "blue", count: 3 }],
    goalsLeft: [0],
    movesLeft: 2,
  },
  record: {
    spares: [
      {
        waves: [
          {
            number: 1,
            bunches: [],
            blasts: [
              {
                what: "dasher-across",
                square: 4,
                piece: 5,
                kind: "blue",
                setOffBy: null,
                wait: 0,
                strikes: [
                  { square: 4, step: 0 },
                  { square: 3, step: 1 },
                  { square: 5, step: 1 },
                ],
              },
            ],
            hits: [
              { ...byBlast(3, 1, 0), what: "gathered", piece: 4, kind: "red" },
              { ...byBlast(5, 1, 0), what: "gathered", piece: 6, kind: "red" },
            ],
            falls: [
              { piece: 1, kind: "blue", from: 0, path: [3], lane: 0 },
              { piece: 10, kind: "pink", from: null, path: [0], lane: 0 },
              { piece: 2, kind: "green", from: 1, path: [4], lane: 1 },
              { piece: 11, kind: "amber", from: null, path: [1], lane: 1 },
              { piece: 3, kind: "blue", from: 2, path: [5], lane: 2 },
              { piece: 12, kind: "violet", from: null, path: [2], lane: 2 },
            ],
            goalsLeft: [0],
          },
        ],
      },
      {
        waves: [
          {
            number: 1,
            bunches: [],
            blasts: [
              {
                what: "dasher-down",
                square: 1,
                piece: 11,
                kind: "amber",
                setOffBy: null,
                wait: 0,
                strikes: [
                  { square: 1, step: 0 },
                  { square: 4, step: 1 },
                  { square: 7, step: 2 },
                ],
              },
            ],
            hits: [
              {
                ...byBlast(4, 1, 0),
                what: "gathered",
                piece: 2,
                kind: "green",
              },
              {
                ...byBlast(7, 2, 0),
                what: "gathered",
                piece: 8,
                kind: "violet",
              },
            ],
            falls: [
              { piece: 13, kind: "pink", from: null, path: [7], lane: 1 },
              { piece: 14, kind: "red", from: null, path: [4], lane: 1 },
              { piece: 15, kind: "green", from: null, path: [1], lane: 1 },
            ],
            goalsLeft: [0],
          },
        ],
      },
    ],
  },
};
